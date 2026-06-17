import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const farms = await query(
      `SELECT f.*, 
        (SELECT sa.soil_health_score FROM soil_analyses sa WHERE sa.farm_id = f.id ORDER BY sa.analysis_date DESC LIMIT 1) as latest_health_score,
        (SELECT sa.analysis_date FROM soil_analyses sa WHERE sa.farm_id = f.id ORDER BY sa.analysis_date DESC LIMIT 1) as last_analyzed
       FROM farms f WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
      [user.userId]
    );

    return NextResponse.json({ farms: farms.rows });
  } catch (err) {
    console.error('Get farms error:', err);
    return NextResponse.json({ error: 'Failed to fetch farms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, description, boundary, locationName, cropType, soilType, irrigationType } = await req.json();

    if (!name || !boundary || boundary.length < 3) {
      return NextResponse.json({ error: 'Farm name and boundary (min 3 points) are required' }, { status: 400 });
    }

    // Calculate centroid
    const centroidLat = boundary.reduce((s: number, p: any) => s + p.lat, 0) / boundary.length;
    const centroidLng = boundary.reduce((s: number, p: any) => s + p.lng, 0) / boundary.length;

    // Approximate area using shoelace formula
    let area = 0;
    for (let i = 0; i < boundary.length; i++) {
      const j = (i + 1) % boundary.length;
      area += boundary[i].lat * boundary[j].lng;
      area -= boundary[j].lat * boundary[i].lng;
    }
    const areaHectares = Math.abs(area) * 0.5 * 111320 * 111320 / 10000;

    const result = await query(
      `INSERT INTO farms (user_id, name, description, boundary, location_name, centroid_lat, centroid_lng, area_hectares, crop_type, soil_type, irrigation_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [user.userId, name, description || null, JSON.stringify(boundary), locationName || null,
       centroidLat, centroidLng, areaHectares.toFixed(2), cropType || null, soilType || null, irrigationType || null]
    );

    return NextResponse.json({ farm: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Create farm error:', err);
    return NextResponse.json({ error: 'Failed to create farm' }, { status: 500 });
  }
}
