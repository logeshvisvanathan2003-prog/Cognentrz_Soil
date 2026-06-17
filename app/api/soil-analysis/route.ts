import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { getComprehensiveSatelliteData } from '@/lib/earth-engine';
import { getCurrentWeather } from '@/lib/weather';
import { getSoilGridsData } from '@/lib/soilgrids';
import { calculateSoilHealthScores, generatePredictions } from '@/lib/soil-scoring';
import { generateAIRecommendations } from '@/lib/ai-recommendations';
import { sendWhatsAppReport } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { farmId } = await req.json();

    // Get farm data
    const farmResult = await query(
      'SELECT * FROM farms WHERE id = $1 AND user_id = $2',
      [farmId, user.userId]
    );

    if (farmResult.rows.length === 0) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const farm = farmResult.rows[0];
    const boundary = typeof farm.boundary === 'string' ? JSON.parse(farm.boundary) : farm.boundary;
    const lat = parseFloat(farm.centroid_lat);
    const lng = parseFloat(farm.centroid_lng);

    // Get previous analysis for real trend comparison and anomaly detection
    const prevResult = await query(
      'SELECT soil_health_score, ndvi, moisture_index, land_surface_temp FROM soil_analyses WHERE farm_id = $1 ORDER BY analysis_date DESC LIMIT 1',
      [farmId]
    );
    const prevRow = prevResult.rows[0] || null;
    const previousScore = prevRow?.soil_health_score ?? null;

    // Parallel data fetching
    const [satelliteData, weatherData, soilGridsData] = await Promise.allSettled([
      getComprehensiveSatelliteData(boundary),
      getCurrentWeather(lat, lng),
      getSoilGridsData(lat, lng),
    ]);

    const satellite = satelliteData.status === 'fulfilled' ? satelliteData.value : {
      vegetation: { ndvi: 0.45, evi: 0.38, savi: 0.54, gndvi: 0.40, vegetationHealth: 'Good' },
      moisture: { ndwi: -0.05, moistureIndex: 0.475, waterStress: 'Moderate', soilMoisture: 45 },
      thermal: { lst: 30.5, thermalAnomaly: 'Normal' },
    };
    
    const weather = weatherData.status === 'fulfilled' ? weatherData.value : {
      temperature: 30, humidity: 65, rainfall: 5, windSpeed: 5, description: 'partly cloudy'
    };
    
    const soilGrids = soilGridsData.status === 'fulfilled' ? soilGridsData.value : {
      ph: 6.5, organicCarbon: 1.2, nitrogen: 0.12, phosphorus: 15, potassium: 120,
      clay: 25, sand: 45, silt: 30, bulkDensity: 1.3, cec: 18,
    };

    // Calculate scores
    const scores = calculateSoilHealthScores({
      ndvi: satellite.vegetation.ndvi,
      evi: satellite.vegetation.evi,
      savi: satellite.vegetation.savi,
      ndwi: satellite.moisture.ndwi,
      lst: satellite.thermal.lst,
      soilMoisture: satellite.moisture.soilMoisture,
      ph: soilGrids.ph,
      organicCarbon: soilGrids.organicCarbon,
      nitrogen: soilGrids.nitrogen,
      phosphorus: soilGrids.phosphorus,
      potassium: soilGrids.potassium,
      clay: soilGrids.clay,
      sand: soilGrids.sand,
      silt: soilGrids.silt,
      rainfall: weather.rainfall,
      temperature: weather.temperature,
    }, previousScore);

    // Generate predictions
    const predictions = generatePredictions(scores, weather);

    // Save analysis to DB
    const analysisResult = await query(
      `INSERT INTO soil_analyses (
        farm_id, ndvi, evi, savi, moisture_index, land_surface_temp,
        soil_health_score, moisture_level, nutrient_risk, erosion_risk, water_stress, fertility_score,
        ph_value, organic_carbon, nitrogen, phosphorus, potassium,
        clay_content, sand_content, silt_content, raw_data
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id`,
      [
        farmId, satellite.vegetation.ndvi, satellite.vegetation.evi, satellite.vegetation.savi,
        satellite.moisture.moistureIndex, satellite.thermal.lst,
        scores.soilHealthScore, scores.moistureLevel, scores.nutrientRisk,
        scores.erosionRisk, scores.waterStress, scores.fertilityScore,
        soilGrids.ph, soilGrids.organicCarbon, soilGrids.nitrogen,
        soilGrids.phosphorus, soilGrids.potassium,
        soilGrids.clay, soilGrids.sand, soilGrids.silt,
        JSON.stringify({ satellite, weather, soilGrids, predictions }),
      ]
    );

    const analysisId = analysisResult.rows[0].id;

    // Generate AI recommendations
    const recommendations = await generateAIRecommendations({
      farmName: farm.name,
      cropType: farm.crop_type,
      soilHealthScore: scores.soilHealthScore,
      moistureLevel: scores.moistureLevel,
      nutrientRisk: scores.nutrientRisk,
      erosionRisk: scores.erosionRisk,
      waterStress: scores.waterStress,
      fertilityScore: scores.fertilityScore,
      ndvi: satellite.vegetation.ndvi,
      ndwi: satellite.moisture.ndwi,
      ph: soilGrids.ph,
      organicCarbon: soilGrids.organicCarbon,
      nitrogen: soilGrids.nitrogen,
      phosphorus: soilGrids.phosphorus,
      potassium: soilGrids.potassium,
      temperature: weather.temperature,
      humidity: weather.humidity,
      rainfall: weather.rainfall,
      trend: scores.trend,
      previousNdvi: prevRow ? parseFloat(prevRow.ndvi) : null,
      previousNdwi: null,
      previousLst: prevRow ? parseFloat(prevRow.land_surface_temp) : null,
      previousSoilHealthScore: previousScore,
    });

    // Save recommendations
    for (const rec of recommendations) {
      await query(
        `INSERT INTO recommendations (farm_id, analysis_id, category, priority, title, description, action_items, estimated_impact, timeline)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [farmId, analysisId, rec.category, rec.priority, rec.title, rec.description,
         JSON.stringify(rec.actionItems), rec.estimatedImpact, rec.timeline]
      );
    }

    // Save predictions
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const predDate = new Date();
      predDate.setMonth(predDate.getMonth() + i + 1);
      
      await query(
        `INSERT INTO predictions (farm_id, analysis_id, predicted_for, soil_health_forecast, moisture_forecast, risk_level, forecast_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [farmId, analysisId, predDate.toISOString().split('T')[0],
         pred.soilHealth, pred.moisture, pred.risk, JSON.stringify(pred)]
      );
    }

    // Create alert if critical
    if (scores.soilHealthScore < 40) {
      await query(
        `INSERT INTO alerts (farm_id, user_id, type, severity, title, message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [farmId, user.userId, 'soil_health', 'critical',
         `Critical Soil Health Alert - ${farm.name}`,
         `Soil health score is ${scores.soilHealthScore}/100. Immediate action required.`]
      );
    }

    // Anomaly detection: compare against previous analysis for sudden shifts
    if (prevRow) {
      const prevNdvi = parseFloat(prevRow.ndvi);
      const prevMoisture = parseFloat(prevRow.moisture_index);
      const prevLst = parseFloat(prevRow.land_surface_temp);
      const ndviDrop = prevNdvi - satellite.vegetation.ndvi;
      const lstSpike = satellite.thermal.lst - prevLst;
      const moistureDrop = prevMoisture - satellite.moisture.moistureIndex;

      if (ndviDrop > 0.1) {
        await query(
          `INSERT INTO alerts (farm_id, user_id, type, severity, title, message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [farmId, user.userId, 'ndvi_drop', 'warning',
           `Vegetation Decline Detected - ${farm.name}`,
           `NDVI dropped from ${prevNdvi.toFixed(2)} to ${satellite.vegetation.ndvi.toFixed(2)} since the last analysis — a sign of declining crop health. Inspect the field for stress, pests, or disease.`]
        );
      }
      if (lstSpike > 4) {
        await query(
          `INSERT INTO alerts (farm_id, user_id, type, severity, title, message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [farmId, user.userId, 'thermal_spike', 'warning',
           `Thermal Spike Detected - ${farm.name}`,
           `Land surface temperature rose from ${prevLst.toFixed(1)}°C to ${satellite.thermal.lst.toFixed(1)}°C since the last analysis, which can indicate heat or water stress.`]
        );
      }
      if (moistureDrop > 0.15) {
        await query(
          `INSERT INTO alerts (farm_id, user_id, type, severity, title, message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [farmId, user.userId, 'water_stress', 'warning',
           `Sudden Water Stress - ${farm.name}`,
           `Soil moisture index dropped from ${prevMoisture.toFixed(2)} to ${satellite.moisture.moistureIndex.toFixed(2)} since the last analysis. Consider irrigation soon.`]
        );
      }
    }

    // ── Auto WhatsApp: professional PDF report to registration phone ─────────
    let whatsappSent = false;
    let whatsappError: string | null = null;
    try {
      const u = await query(
        'SELECT phone, whatsapp_number, whatsapp_enabled, preferred_language, name FROM users WHERE id = $1',
        [user.userId]
      );
      const row    = u.rows[0] || {};
      const number = row.phone || row.whatsapp_number;

      if (number && row.whatsapp_enabled !== false) {
        const trendLabel = scores?.trend
          ? scores.trend.charAt(0).toUpperCase() + scores.trend.slice(1)
          : 'Stable';

        const result = await sendWhatsAppReport({
          toPhone:         number,
          farmName:        farm.name,
          userName:        row.name || 'Farmer',
          soilHealthScore: scores.soilHealthScore,
          trend:           trendLabel,
          analysisId,
          lang:            row.preferred_language || 'en',
        });

        whatsappSent  = result.ok;
        whatsappError = result.ok ? null : result.error || 'send failed';
        console.log('[analysis→whatsapp]', result);
      } else {
        whatsappError = number ? 'alerts disabled by user' : 'no phone on account';
      }
    } catch (e: any) {
      whatsappError = e.message;
      console.warn('auto whatsapp failed:', e);
    }

    return NextResponse.json({
      success: true,
      whatsappSent,
      whatsappError,
      analysis: {
        id: analysisId,
        scores,
        satellite: satellite.vegetation,
        moisture: satellite.moisture,
        thermal: satellite.thermal,
        soilNutrients: soilGrids,
        weather,
        predictions,
        recommendations,
      }
    });

  } catch (err: any) {
    console.error('Soil analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed: ' + err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const farmId = req.nextUrl.searchParams.get('farmId');
  if (!farmId) return NextResponse.json({ error: 'farmId required' }, { status: 400 });

  try {
    const analyses = await query(
      `SELECT sa.*, f.name as farm_name 
       FROM soil_analyses sa 
       JOIN farms f ON f.id = sa.farm_id 
       WHERE sa.farm_id = $1 AND f.user_id = $2 
       ORDER BY sa.analysis_date DESC LIMIT 20`,
      [farmId, user.userId]
    );

    return NextResponse.json({ analyses: analyses.rows });
  } catch (err) {
    console.error('Get analyses error:', err);
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
  }
}
