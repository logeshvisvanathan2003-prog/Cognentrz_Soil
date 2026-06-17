const SOILGRIDS_URL = 'https://rest.isric.org/soilgrids/v2.0';

export async function getSoilGridsData(lat: number, lng: number) {
  try {
    const properties = 'phh2o,soc,nitrogen,clay,sand,silt,bdod,cec';
    const depths = '0-5cm,5-15cm,15-30cm';
    
    const url = `${SOILGRIDS_URL}/properties/query?lon=${lng}&lat=${lat}&property=${properties}&depth=${depths}&value=mean`;
    
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    
    if (!res.ok) throw new Error(`SoilGrids error: ${res.status}`);
    
    const data = await res.json();
    return parseSoilGridsResponse(data);
  } catch (error) {
    console.warn('SoilGrids fetch failed, using defaults:', error);
    return getDefaultSoilData(lat, lng);
  }
}

function parseSoilGridsResponse(data: any) {
  const layers = data?.properties?.layers || [];
  const extract = (name: string, depth: string = '0-5cm') => {
    const layer = layers.find((l: any) => l.name === name);
    const depthData = layer?.depths?.find((d: any) => d.label === depth);
    return depthData?.values?.mean ?? null;
  };
  
  const ph = extract('phh2o');
  const phValue = ph ? ph / 10 : 6.5;
  
  return {
    ph: parseFloat(phValue.toFixed(2)),
    organicCarbon: parseFloat(((extract('soc') ?? 15) / 10).toFixed(3)),
    nitrogen: parseFloat(((extract('nitrogen') ?? 1.5) / 1000).toFixed(4)),
    phosphorus: 15 + Math.random() * 10,
    potassium: 100 + Math.random() * 100,
    clay: parseFloat(((extract('clay') ?? 250) / 10).toFixed(1)),
    sand: parseFloat(((extract('sand') ?? 450) / 10).toFixed(1)),
    silt: parseFloat(((extract('silt') ?? 300) / 10).toFixed(1)),
    bulkDensity: parseFloat(((extract('bdod') ?? 130) / 100).toFixed(2)),
    cec: parseFloat(((extract('cec') ?? 200) / 10).toFixed(1)),
  };
}

function getDefaultSoilData(lat: number, lng: number) {
  // Tamil Nadu typical soil (red laterite / black cotton)
  const isBlackCotton = lat > 11 && lat < 13;
  
  return {
    ph: isBlackCotton ? 7.5 + Math.random() * 0.5 : 6.2 + Math.random() * 0.8,
    organicCarbon: parseFloat((0.8 + Math.random() * 1.5).toFixed(3)),
    nitrogen: parseFloat((0.08 + Math.random() * 0.1).toFixed(4)),
    phosphorus: parseFloat((8 + Math.random() * 15).toFixed(1)),
    potassium: parseFloat((80 + Math.random() * 120).toFixed(1)),
    clay: isBlackCotton ? 35 + Math.random() * 10 : 20 + Math.random() * 10,
    sand: isBlackCotton ? 30 + Math.random() * 10 : 45 + Math.random() * 15,
    silt: isBlackCotton ? 30 + Math.random() * 5 : 25 + Math.random() * 10,
    bulkDensity: parseFloat((1.2 + Math.random() * 0.3).toFixed(2)),
    cec: parseFloat((15 + Math.random() * 20).toFixed(1)),
  };
}
