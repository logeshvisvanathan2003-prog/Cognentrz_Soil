import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

// Haversine distance in km
function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Radius (km) defining a "region" around the user's farms
  const radiusKm = parseFloat(req.nextUrl.searchParams.get('radius') || '25');

  try {
    // The user's own farms (anchor points for "my region")
    const myFarms = await query(
      'SELECT id, name, crop_type, centroid_lat, centroid_lng FROM farms WHERE user_id = $1',
      [user.userId]
    );
    if (myFarms.rows.length === 0) {
      return NextResponse.json({ regions: [], outbreaks: [], summary: null });
    }

    // ALL farms in the system with their two most recent NDVI readings.
    // (Anonymous aggregate — we never expose other users' identities.)
    const all = await query(`
      WITH ranked AS (
        SELECT sa.farm_id, sa.ndvi, sa.analysis_date,
               ROW_NUMBER() OVER (PARTITION BY sa.farm_id ORDER BY sa.analysis_date DESC) AS rn
        FROM soil_analyses sa
      )
      SELECT f.id, f.crop_type, f.centroid_lat, f.centroid_lng,
             MAX(CASE WHEN r.rn = 1 THEN r.ndvi END) AS latest_ndvi,
             MAX(CASE WHEN r.rn = 1 THEN r.analysis_date END) AS latest_date,
             MAX(CASE WHEN r.rn = 2 THEN r.ndvi END) AS prev_ndvi
      FROM farms f
      JOIN ranked r ON r.farm_id = f.id AND r.rn <= 2
      GROUP BY f.id, f.crop_type, f.centroid_lat, f.centroid_lng
    `);

    const farms = all.rows.map((r: any) => ({
      id: r.id,
      crop: (r.crop_type || 'Unknown').trim(),
      lat: parseFloat(r.centroid_lat),
      lng: parseFloat(r.centroid_lng),
      latestNdvi: r.latest_ndvi != null ? parseFloat(r.latest_ndvi) : null,
      prevNdvi: r.prev_ndvi != null ? parseFloat(r.prev_ndvi) : null,
      latestDate: r.latest_date,
    }));

    // Build a region per unique crop the user grows, scoped to nearby farms
    const myCrops = Array.from(new Set(myFarms.rows.map((f: any) => (f.crop_type || 'Unknown').trim())));
    const anchors = myFarms.rows.map((f: any) => ({ lat: parseFloat(f.centroid_lat), lng: parseFloat(f.centroid_lng) }));

    const regions: any[] = [];
    const outbreaks: any[] = [];

    for (const crop of myCrops) {
      // farms of this crop within radius of ANY of the user's farms
      const inRegion = farms.filter((f) =>
        f.crop === crop &&
        anchors.some((a) => distKm(a.lat, a.lng, f.lat, f.lng) <= radiusKm)
      );
      if (inRegion.length === 0) continue;

      const withBoth = inRegion.filter((f) => f.latestNdvi != null && f.prevNdvi != null);
      const declining = withBoth.filter((f) => (f.prevNdvi! - f.latestNdvi!) > 0.08);
      const avgNdvi = inRegion.filter(f => f.latestNdvi != null)
        .reduce((s, f) => s + (f.latestNdvi || 0), 0) / Math.max(1, inRegion.filter(f => f.latestNdvi != null).length);

      const declineRatio = withBoth.length ? declining.length / withBoth.length : 0;

      // Outbreak signal: 3+ nearby same-crop farms declining together, or >=50% of them
      const isOutbreak = (declining.length >= 3) || (withBoth.length >= 2 && declineRatio >= 0.5);

      const region = {
        crop,
        farmCount: inRegion.length,
        avgNdvi: parseFloat(avgNdvi.toFixed(3)),
        decliningCount: declining.length,
        declineRatio: parseFloat((declineRatio * 100).toFixed(0)),
        centroid: {
          lat: inRegion.reduce((s, f) => s + f.lat, 0) / inRegion.length,
          lng: inRegion.reduce((s, f) => s + f.lng, 0) / inRegion.length,
        },
        status: isOutbreak ? 'outbreak' : declineRatio > 0.25 ? 'watch' : 'healthy',
      };
      regions.push(region);

      if (isOutbreak) {
        outbreaks.push({
          crop,
          decliningCount: declining.length,
          totalNearby: withBoth.length,
          centroid: region.centroid,
          message: `${declining.length} of ${withBoth.length} nearby ${crop} fields show synchronized NDVI decline — a strong early signal of a regional pest or disease outbreak. Inspect crops and consider preventive action.`,
        });
      }
    }

    const summary = {
      regionsTracked: regions.length,
      outbreakAlerts: outbreaks.length,
      radiusKm,
    };

    return NextResponse.json({ regions, outbreaks, summary });
  } catch (err: any) {
    console.error('Regional intelligence error:', err);
    return NextResponse.json({ error: err.message, regions: [], outbreaks: [] }, { status: 500 });
  }
}
