import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [farmsResult, analysisResult, alertsResult, recommendationsResult] = await Promise.all([
      query('SELECT COUNT(*) as count, SUM(area_hectares) as total_area FROM farms WHERE user_id = $1', [user.userId]),
      query(`
        SELECT AVG(sa.soil_health_score) as avg_health, MAX(sa.analysis_date) as last_analysis
        FROM soil_analyses sa
        JOIN farms f ON f.id = sa.farm_id
        WHERE f.user_id = $1
      `, [user.userId]),
      query(`
        SELECT COUNT(*) as count FROM alerts a
        JOIN farms f ON f.id = a.farm_id
        WHERE f.user_id = $1 AND a.is_read = false
      `, [user.userId]),
      query(`
        SELECT COUNT(*) as count FROM recommendations r
        JOIN farms f ON f.id = r.farm_id
        WHERE f.user_id = $1 AND r.is_read = false
      `, [user.userId]),
    ]);

    // Get recent analyses per farm
    const recentAnalyses = await query(`
      SELECT DISTINCT ON (sa.farm_id) 
        sa.farm_id, f.name as farm_name,
        sa.soil_health_score, sa.moisture_level, sa.ndvi,
        sa.analysis_date, sa.water_stress, sa.nutrient_risk
      FROM soil_analyses sa
      JOIN farms f ON f.id = sa.farm_id
      WHERE f.user_id = $1
      ORDER BY sa.farm_id, sa.analysis_date DESC
    `, [user.userId]);

    return NextResponse.json({
      stats: {
        totalFarms: parseInt(farmsResult.rows[0].count),
        totalArea: parseFloat(farmsResult.rows[0].total_area || '0').toFixed(1),
        avgHealthScore: Math.round(parseFloat(analysisResult.rows[0].avg_health || '0')),
        lastAnalysis: analysisResult.rows[0].last_analysis,
        unreadAlerts: parseInt(alertsResult.rows[0].count),
        unreadRecommendations: parseInt(recommendationsResult.rows[0].count),
      },
      recentAnalyses: recentAnalyses.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
