import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateSoilReportPDF } from '@/lib/pdf-report';

// PUBLIC route — no auth needed.
// The analysis UUID acts as the access token (hard to guess).
export async function GET(
  req: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  const { analysisId } = params;

  try {
    // Fetch analysis + farm + user in one join
    const result = await query(
      `SELECT
        sa.*,
        f.name        AS farm_name,
        f.location_name,
        f.area_hectares,
        f.crop_type,
        u.name        AS user_name,
        u.phone       AS user_phone,
        u.email       AS user_email
       FROM soil_analyses sa
       JOIN farms f ON f.id = sa.farm_id
       JOIN users u ON u.id = f.user_id
       WHERE sa.id = $1`,
      [analysisId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const raw = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : (row.raw_data || {});

    // Fetch latest recommendations for this analysis
    const recResult = await query(
      `SELECT title, description, priority, category
       FROM recommendations
       WHERE analysis_id = $1
       ORDER BY
         CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
       LIMIT 4`,
      [analysisId]
    );

    const pdfBytes = await generateSoilReportPDF({
      userName:        row.user_name    || 'Farmer',
      userPhone:       row.user_phone   || '',
      userEmail:       row.user_email   || '',
      farmName:        row.farm_name    || 'My Farm',
      farmLocation:    row.location_name,
      farmArea:        parseFloat(row.area_hectares) || undefined,
      cropType:        row.crop_type,
      analysisId,
      analysisDate:    new Date(row.analysis_date || row.created_at),
      soilHealthScore: row.soil_health_score  ?? 0,
      moistureLevel:   row.moisture_level     ?? 0,
      fertilityScore:  row.fertility_score    ?? 0,
      erosionRisk:     row.erosion_risk       ?? 0,
      waterStress:     row.water_stress       ?? 0,
      ndvi:            parseFloat(row.ndvi)   || 0,
      evi:             parseFloat(row.evi)    || 0,
      savi:            parseFloat(row.savi)   || 0,
      ndwi:            parseFloat(row.moisture_index) || 0,
      lst:             parseFloat(row.land_surface_temp) || 0,
      ph:              parseFloat(row.ph_value) || undefined,
      organicCarbon:   parseFloat(row.organic_carbon) || undefined,
      nitrogen:        parseFloat(row.nitrogen) || undefined,
      trend:           raw?.trend || 'Stable',
      weather: {
        temperature:  raw?.weather?.temperature  ?? 30,
        humidity:     raw?.weather?.humidity     ?? 65,
        description:  raw?.weather?.description  ?? 'Partly Cloudy',
        windSpeed:    raw?.weather?.windSpeed     ?? 0,
        rainfall:     raw?.weather?.rainfall      ?? 0,
      },
      recommendations: recResult.rows,
    });

    const filename = `Cognentrz-Report-${row.farm_name?.replace(/\s+/g, '-')}-${analysisId.slice(0, 6)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control':       'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF: ' + err.message }, { status: 500 });
  }
}
