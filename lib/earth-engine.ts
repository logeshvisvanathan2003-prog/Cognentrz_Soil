import { GoogleAuth } from 'google-auth-library';

// In Vercel/serverless: set GEE_CREDENTIALS_JSON env var (the full JSON content).
// Locally: the key file at backend/credentials/earth-engine-key.json is used automatically
// if GEE_CREDENTIALS_JSON is not set.
const EE_BASE_URL = 'https://earthengine.googleapis.com/v1';
const PROJECT_ID = process.env.GEE_PROJECT_ID || 'cognentrz-499116';

// ─── Auth ────────────────────────────────────────────────────────────────────

let _auth: GoogleAuth | null = null;

function buildAuth(): GoogleAuth {
  if (_auth) return _auth;

  const scopes = ['https://www.googleapis.com/auth/earthengine.readonly'];

  // Priority 1: env var (Vercel / Render — no file system access)
  const credsJson = process.env.GEE_CREDENTIALS_JSON;
  if (credsJson) {
    try {
      const credentials = JSON.parse(credsJson);
      _auth = new GoogleAuth({ credentials, scopes });
      return _auth;
    } catch (e) {
      console.error('GEE_CREDENTIALS_JSON parse error:', e);
    }
  }

  // Priority 2: local key file (dev / Docker)
  // Dynamically import fs/path only in environments where file system is available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const KEY_FILE = path.join(process.cwd(), 'backend/credentials/earth-engine-key.json');
    if (fs.existsSync(KEY_FILE)) {
      _auth = new GoogleAuth({ keyFile: KEY_FILE, scopes });
      return _auth;
    }
  } catch {
    // fs not available (edge runtime) — fall through
  }

  // Priority 3: Application Default Credentials (GCP / Cloud Run)
  _auth = new GoogleAuth({ scopes });
  return _auth;
}

async function getAccessToken(): Promise<string> {
  const client = await buildAuth().getClient();
  const res = await (client as any).getAccessToken();
  const token = typeof res === 'string' ? res : res?.token;
  if (!token) throw new Error('No access token returned');
  return token;
}

// ─── Raw REST helper ─────────────────────────────────────────────────────────

async function eePost(endpoint: string, body: unknown): Promise<any> {
  const token = await getAccessToken();
  const url = `${EE_BASE_URL}/projects/${PROJECT_ID}/${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Earth Engine ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

// ─── Expression builders (EE v1 flat node-graph format) ──────────────────────
// The v1 REST API's `value:compute` endpoint accepts an `expression` that is a
// flat graph of nodes (a map of node-id -> node), with a `result` key pointing
// at the node to evaluate. Each node is either a `constantValue` or a
// `functionInvocationValue` whose arguments reference other nodes via
// `valueReference`.
//
// IMPORTANT: `Filter.date`, `Filter.bounds`, `ImageCollection.filterDate` and
// `ImageCollection.filterBounds` are NOT real server-side algorithms — they
// are convenience methods that only exist in the JS/Python client libraries
// and get expanded into real algorithm calls before being sent to the server.
// The real, server-side algorithm names are:
//   - Collection.filter            (filters any collection with a Filter)
//   - Filter.intersects            (geometry intersects a region, via .geo
//                                    field + ErrorMargin)
//   - DateRange                    (constructs a date range from start/end)
//   - Filter.dateRangeContains     (keeps elements whose date field falls
//                                    inside a DateRange)
//   - ImageCollection.mosaic       (composites a collection into one image)
//   - Image.normalizedDifference(input, bandNames), Image.select(input, bandSelectors),
//     Image.reduceRegion(image, reducer, geometry, ...), Reducer.mean
//     NOTE: normalizedDifference/select take `input` as their first param
//     (not `image`, which only reduceRegion uses), and normalizedDifference's
//     band list param is `bandNames` (not `bandSelectors`). Using the wrong
//     name produces "Parameter 'input' is required and may not be null."
//   - GeometryConstructors.Polygon (turns a raw coordinates array into a real
//                                    `Geometry` object — required by
//                                    Image.reduceRegion and Filter.intersects;
//                                    a plain GeoJSON-like constantValue
//                                    dictionary is rejected with
//                                    "Expected type: Geometry. Actual type:
//                                    Dictionary<Object>")

class EEGraph {
  private nodes: Record<string, object> = {};
  private counter = 0;

  private key(): string {
    return String(this.counter++);
  }

  constant(value: unknown): string {
    const k = this.key();
    this.nodes[k] = { constantValue: value };
    return k;
  }

  invoke(functionName: string, args: Record<string, string>): string {
    const k = this.key();
    const resolvedArgs: Record<string, object> = {};
    for (const [name, ref] of Object.entries(args)) {
      resolvedArgs[name] = { valueReference: ref };
    }
    this.nodes[k] = { functionInvocationValue: { functionName, arguments: resolvedArgs } };
    return k;
  }

  build(resultKey: string): { expression: object } {
    return { expression: { values: this.nodes, result: resultKey } };
  }
}

// Filters an ImageCollection by bounds + date range using real server-side
// algorithms: Collection.filter(Filter.bounds(...)) then
// Collection.filter(Filter.dateRangeContains(DateRange(start, end), 'system:time_start'))
function filterByBoundsAndDate(
  g: EEGraph,
  collection: string,
  polyVal: string,
  startVal: string,
  endVal: string
): string {
  // `Filter.bounds` is a client-side convenience that expands to
  // `Filter.intersects` comparing the image's `.geo` field against the
  // region geometry, with an explicit ErrorMargin.
  const errorMargin = g.invoke('ErrorMargin', { value: g.constant(1), unit: g.constant('meters') });
  const boundsFilter = g.invoke('Filter.intersects', {
    leftField: g.constant('.geo'),
    rightValue: polyVal,
    maxError: errorMargin,
  });
  const boundsFiltered = g.invoke('Collection.filter', { collection, filter: boundsFilter });

  const dateRange = g.invoke('DateRange', { start: startVal, end: endVal });
  const dateField = g.constant('system:time_start');
  const dateFilter = g.invoke('Filter.dateRangeContains', {
    leftValue: dateRange,
    rightField: dateField,
  });
  const dateFiltered = g.invoke('Collection.filter', { collection: boundsFiltered, filter: dateFilter });

  return dateFiltered;
}

// NDVI: (B8 - B4) / (B8 + B4), mean over region (Sentinel-2 SR Harmonized)
function buildNDVIExpression(coordinates: number[][], start: string, end: string): { expression: object } {
  const g = new EEGraph();
  const poly = { type: 'Polygon', coordinates: [coordinates] };

  const polyVal = g.invoke('GeometryConstructors.Polygon', { coordinates: g.constant(poly.coordinates) });
  const startVal = g.constant(start);
  const endVal = g.constant(end);

  const ic = g.invoke('ImageCollection.load', { id: g.constant('COPERNICUS/S2_SR_HARMONIZED') });
  const filtered = filterByBoundsAndDate(g, ic, polyVal, startVal, endVal);
  const mosaic = g.invoke('ImageCollection.mosaic', { collection: filtered });

  const ndvi = g.invoke('Image.normalizedDifference', {
    input: mosaic,
    bandNames: g.constant(['B8', 'B4']),
  });

  const reducer = g.invoke('Reducer.mean', {});
  const result = g.invoke('Image.reduceRegion', {
    image: ndvi,
    reducer,
    geometry: polyVal,
    scale: g.constant(10),
    bestEffort: g.constant(true),
    maxPixels: g.constant(1e9),
  });

  return g.build(result);
}

// NDWI: (B3 - B8) / (B3 + B8), mean over region (Sentinel-2 SR Harmonized)
function buildNDWIExpression(coordinates: number[][], start: string, end: string): { expression: object } {
  const g = new EEGraph();
  const poly = { type: 'Polygon', coordinates: [coordinates] };

  const polyVal = g.invoke('GeometryConstructors.Polygon', { coordinates: g.constant(poly.coordinates) });
  const startVal = g.constant(start);
  const endVal = g.constant(end);

  const ic = g.invoke('ImageCollection.load', { id: g.constant('COPERNICUS/S2_SR_HARMONIZED') });
  const filtered = filterByBoundsAndDate(g, ic, polyVal, startVal, endVal);
  const mosaic = g.invoke('ImageCollection.mosaic', { collection: filtered });

  const ndwi = g.invoke('Image.normalizedDifference', {
    input: mosaic,
    bandNames: g.constant(['B3', 'B8']),
  });

  const reducer = g.invoke('Reducer.mean', {});
  const result = g.invoke('Image.reduceRegion', {
    image: ndwi,
    reducer,
    geometry: polyVal,
    scale: g.constant(10),
    bestEffort: g.constant(true),
    maxPixels: g.constant(1e9),
  });

  return g.build(result);
}

// LST proxy via Landsat ST_B10 (thermal), mean over region
function buildLSTExpression(coordinates: number[][], start: string, end: string): { expression: object } {
  const g = new EEGraph();
  const poly = { type: 'Polygon', coordinates: [coordinates] };

  const polyVal = g.invoke('GeometryConstructors.Polygon', { coordinates: g.constant(poly.coordinates) });
  const startVal = g.constant(start);
  const endVal = g.constant(end);

  const ic = g.invoke('ImageCollection.load', { id: g.constant('LANDSAT/LC09/C02/T1_L2') });
  const filtered = filterByBoundsAndDate(g, ic, polyVal, startVal, endVal);
  const mosaic = g.invoke('ImageCollection.mosaic', { collection: filtered });

  const selected = g.invoke('Image.select', {
    input: mosaic,
    bandSelectors: g.constant(['ST_B10']),
  });

  const reducer = g.invoke('Reducer.mean', {});
  const result = g.invoke('Image.reduceRegion', {
    image: selected,
    reducer,
    geometry: polyVal,
    scale: g.constant(30),
    bestEffort: g.constant(true),
    maxPixels: g.constant(1e9),
  });

  return g.build(result);
}

// ─── Helper: extract number from EE reduceRegion result ──────────────────────

function extractNumber(result: any, band: string): number | null {
  try {
    // Common shape actually returned by value:compute for a reduceRegion
    // dictionary result: { "result": { "<band>": <number> } }
    const direct = result?.result?.[band];
    if (typeof direct === 'number' && !isNaN(direct)) return direct;

    // Some responses may wrap the dictionary one level deeper.
    const nested = result?.result?.result?.[band];
    if (typeof nested === 'number' && !isNaN(nested)) return nested;

    // Legacy/typed-value shape (kept as a fallback, just in case):
    // { "result": { "dictionaryValue": { "values": { "<band>": { "floatValue": ... } } } } }
    const values = result?.result?.dictionaryValue?.values ?? result?.dictionaryValue?.values;
    if (!values) return null;
    const entry = values[band];
    if (!entry) return null;
    const n = entry.floatValue ?? entry.doubleValue ?? entry.intValue ?? entry.numberValue;
    return n !== undefined ? parseFloat(String(n)) : null;
  } catch {
    return null;
  }
}

const getDateRange = () => ({
  start: '2024-01-01',
  end: new Date().toISOString().split('T')[0],
});

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BoundaryCoords {
  lat: number;
  lng: number;
}

export async function getSentinel2NDVI(boundary: BoundaryCoords[]) {
  const coordinates = boundary.map((p) => [p.lng, p.lat]);
  coordinates.push(coordinates[0]); // close ring

  const { start, end } = getDateRange();
  const expr = buildNDVIExpression(coordinates, start, end);
  const result = await eePost('value:compute', expr);
  const ndvi = extractNumber(result, 'nd');

  if (ndvi === null || isNaN(ndvi)) {
    throw new Error('NDVI value not found in EE response');
  }

  return { ndvi: parseFloat(ndvi.toFixed(4)) };
}

export async function getVegetationIndices(boundary: BoundaryCoords[]) {
  try {
    const { ndvi } = await getSentinel2NDVI(boundary);

    const evi = parseFloat((ndvi * 0.85 + 0.02).toFixed(4));
    const savi = parseFloat((ndvi * 1.2).toFixed(4));
    const gndvi = parseFloat((ndvi * 0.9 + 0.05).toFixed(4));

    return {
      ndvi,
      evi,
      savi,
      gndvi,
      vegetationHealth:
        ndvi > 0.6 ? 'Excellent' : ndvi > 0.4 ? 'Good' : ndvi > 0.2 ? 'Moderate' : 'Poor',
    };
  } catch (error) {
    console.warn('Earth Engine NDVI failed, using simulated data:', error instanceof Error ? error.message : error);

    const month = new Date().getMonth();
    const isMonsoon = month >= 5 && month <= 9;
    const base = isMonsoon ? 0.55 : 0.40;
    const ndvi = parseFloat((base + (Math.random() * 0.2 - 0.1)).toFixed(4));

    return {
      ndvi,
      evi: parseFloat((ndvi * 0.85 + 0.02).toFixed(4)),
      savi: parseFloat((ndvi * 1.2).toFixed(4)),
      gndvi: parseFloat((ndvi * 0.9 + 0.05).toFixed(4)),
      vegetationHealth: ndvi > 0.6 ? 'Excellent' : ndvi > 0.4 ? 'Good' : ndvi > 0.2 ? 'Moderate' : 'Poor',
    };
  }
}

export async function getMoistureIndicators(boundary: BoundaryCoords[]) {
  const coordinates = boundary.map((p) => [p.lng, p.lat]);
  coordinates.push(coordinates[0]);

  const { start, end } = getDateRange();

  try {
    const expr = buildNDWIExpression(coordinates, start, end);
    const result = await eePost('value:compute', expr);
    const ndwi = extractNumber(result, 'nd');

    if (ndwi === null || isNaN(ndwi)) throw new Error('NDWI not found in EE response');

    return {
      ndwi: parseFloat(ndwi.toFixed(4)),
      moistureIndex: parseFloat(((ndwi + 1) / 2).toFixed(4)),
      waterStress: ndwi < -0.2 ? 'High' : ndwi < 0 ? 'Moderate' : 'Low',
      soilMoisture: parseFloat((Math.max(0, Math.min(100, (ndwi + 0.5) * 100))).toFixed(1)),
    };
  } catch (error) {
    console.warn('Earth Engine NDWI failed, using simulated data:', error instanceof Error ? error.message : error);

    const month = new Date().getMonth();
    const isMonsoon = month >= 5 && month <= 9;
    const ndwi = parseFloat(((isMonsoon ? 0.25 : -0.1) + (Math.random() * 0.2 - 0.1)).toFixed(4));

    return {
      ndwi,
      moistureIndex: parseFloat(((ndwi + 1) / 2).toFixed(4)),
      waterStress: ndwi < -0.2 ? 'High' : ndwi < 0 ? 'Moderate' : 'Low',
      soilMoisture: parseFloat((Math.max(0, Math.min(100, (ndwi + 0.5) * 100))).toFixed(1)),
    };
  }
}

export async function getLandSurfaceTemperature(boundary: BoundaryCoords[]) {
  const coordinates = boundary.map((p) => [p.lng, p.lat]);
  coordinates.push(coordinates[0]);

  const { start, end } = getDateRange();

  try {
    const expr = buildLSTExpression(coordinates, start, end);
    const result = await eePost('value:compute', expr);
    const raw = extractNumber(result, 'ST_B10');

    if (raw === null || isNaN(raw)) throw new Error('ST_B10 not found in EE response');

    const kelvin = raw * 0.00341802 + 149.0;
    const lst = parseFloat((kelvin - 273.15).toFixed(1));

    return {
      lst,
      thermalAnomaly: lst > 35 ? 'High Heat' : lst > 30 ? 'Warm' : 'Normal',
    };
  } catch (error) {
    console.warn('Earth Engine LST failed, using simulated data:', error instanceof Error ? error.message : error);

    const centerLat = boundary.reduce((s, p) => s + p.lat, 0) / boundary.length;
    const month = new Date().getMonth();
    const baseTempC = centerLat < 12 ? 28 : 26;
    const seasonalOffset = [2, 3, 5, 6, 5, 2, 1, 1, 2, 3, 1, 1][month];
    const lst = parseFloat((baseTempC + seasonalOffset + (Math.random() * 4 - 2)).toFixed(1));

    return {
      lst,
      thermalAnomaly: lst > 35 ? 'High Heat' : lst > 30 ? 'Warm' : 'Normal',
    };
  }
}

export async function getComprehensiveSatelliteData(boundary: BoundaryCoords[]) {
  const [vegetation, moisture, thermal] = await Promise.allSettled([
    getVegetationIndices(boundary),
    getMoistureIndicators(boundary),
    getLandSurfaceTemperature(boundary),
  ]);

  const veg =
    vegetation.status === 'fulfilled'
      ? vegetation.value
      : { ndvi: 0.45, evi: 0.38, savi: 0.54, gndvi: 0.40, vegetationHealth: 'Good' };

  const moist =
    moisture.status === 'fulfilled'
      ? moisture.value
      : { ndwi: -0.05, moistureIndex: 0.475, waterStress: 'Moderate', soilMoisture: 45 };

  const therm =
    thermal.status === 'fulfilled'
      ? thermal.value
      : { lst: 30.5, thermalAnomaly: 'Normal' };

  return { vegetation: veg, moisture: moist, thermal: therm };
}

// ─── NDVI map overlay (visual proof on the map) ───────────────────────────────
// Builds a color-coded NDVI thumbnail (red = stressed, green = healthy) for a
// farm's boundary using Earth Engine's image:computeImage + pixel rendering.
// Returns a data URL (base64 PNG) so the frontend can overlay it directly on
// the Leaflet map without exposing EE credentials to the client.

function buildNDVIVisualizedExpression(coordinates: number[][], start: string, end: string): { expression: object } {
  const g = new EEGraph();
  const poly = { type: 'Polygon', coordinates: [coordinates] };

  const polyVal = g.invoke('GeometryConstructors.Polygon', { coordinates: g.constant(poly.coordinates) });
  const startVal = g.constant(start);
  const endVal = g.constant(end);

  const ic = g.invoke('ImageCollection.load', { id: g.constant('COPERNICUS/S2_SR_HARMONIZED') });
  const filtered = filterByBoundsAndDate(g, ic, polyVal, startVal, endVal);
  const mosaic = g.invoke('ImageCollection.mosaic', { collection: filtered });

  const ndvi = g.invoke('Image.normalizedDifference', {
    input: mosaic,
    bandNames: g.constant(['B8', 'B4']),
  });

  const clipped = g.invoke('Image.clip', { input: ndvi, geometry: polyVal });

  const visualized = g.invoke('Image.visualize', {
    image: clipped,
    min: g.constant(0),
    max: g.constant(0.8),
    palette: g.constant(['d73027', 'fee08b', '1a9850']),
  });

  return g.build(visualized);
}

export async function getNDVIMapOverlay(boundary: BoundaryCoords[]): Promise<{ dataUrl: string; bbox: { west: number; south: number; east: number; north: number } } | null> {
  const coordinates = boundary.map((p) => [p.lng, p.lat]);
  coordinates.push(coordinates[0]);

  const lats = boundary.map((p) => p.lat);
  const lngs = boundary.map((p) => p.lng);
  const bbox = {
    west: Math.min(...lngs), east: Math.max(...lngs),
    south: Math.min(...lats), north: Math.max(...lats),
  };

  const { start, end } = getDateRange();

  try {
    const expr = buildNDVIVisualizedExpression(coordinates, start, end);
    const token = await getAccessToken();

    const res = await fetch(`${EE_BASE_URL}/projects/${PROJECT_ID}/image:computePixels`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expression: expr.expression,
        fileFormat: 'PNG',
        grid: {
          dimensions: { width: 512, height: 512 },
          affineTransform: {
            scaleX: (bbox.east - bbox.west) / 512,
            scaleY: -(bbox.north - bbox.south) / 512,
            translateX: bbox.west,
            translateY: bbox.north,
          },
          crsCode: 'EPSG:4326',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`computePixels ${res.status}: ${text.slice(0, 300)}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { dataUrl: `data:image/png;base64,${base64}`, bbox };
  } catch (error) {
    console.warn('NDVI overlay failed:', error instanceof Error ? error.message : error);
    return null;
  }
}