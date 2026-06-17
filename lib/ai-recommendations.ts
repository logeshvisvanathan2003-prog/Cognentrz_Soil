const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface RecommendationInput {
  farmName: string;
  cropType?: string;
  soilHealthScore: number;
  moistureLevel: number;
  nutrientRisk: number;
  erosionRisk: number;
  waterStress: number;
  fertilityScore: number;
  ndvi: number;
  ph: number;
  organicCarbon: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  trend: string;
  previousNdvi?: number | null;
  previousNdwi?: number | null;
  previousLst?: number | null;
  previousSoilHealthScore?: number | null;
  ndwi?: number;
}

export async function generateAIRecommendations(data: RecommendationInput) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return generateRuleBasedRecommendations(data);
  }

  const prompt = `You are an expert agricultural soil scientist and agronomist. Analyze the following soil and environmental data for a farm named "${data.farmName}" and provide detailed, actionable recommendations.

SOIL DATA:
- Soil Health Score: ${data.soilHealthScore}/100 (${data.soilHealthScore >= 70 ? 'Good' : data.soilHealthScore >= 50 ? 'Moderate' : 'Poor'})
- Moisture Level: ${data.moistureLevel}%
- Nutrient Risk: ${data.nutrientRisk}% (higher = more risk)
- Erosion Risk: ${data.erosionRisk}%
- Water Stress: ${data.waterStress}%
- Fertility Score: ${data.fertilityScore}/100
- NDVI (Vegetation): ${data.ndvi} (0-1 scale)
- Soil pH: ${data.ph}
- Organic Carbon: ${data.organicCarbon}%
- Nitrogen: ${data.nitrogen}%
- Phosphorus: ${data.phosphorus} mg/kg
- Potassium: ${data.potassium} mg/kg
- Trend: ${data.trend}

WEATHER:
- Temperature: ${data.temperature}°C
- Humidity: ${data.humidity}%
- Recent Rainfall: ${data.rainfall}mm
${data.cropType ? `- Current Crop: ${data.cropType}` : ''}
${(data.previousNdvi != null || data.previousNdwi != null || data.previousLst != null || data.previousSoilHealthScore != null) ? `
HISTORICAL COMPARISON (vs. previous analysis):
${data.previousNdvi != null ? `- NDVI changed from ${data.previousNdvi} to ${data.ndvi}` : ''}
${data.previousNdwi != null && data.ndwi != null ? `- NDWI (moisture index) changed from ${data.previousNdwi} to ${data.ndwi}` : ''}
${data.previousLst != null ? `- Land Surface Temperature changed from ${data.previousLst}°C` : ''}
${data.previousSoilHealthScore != null ? `- Soil Health Score changed from ${data.previousSoilHealthScore} to ${data.soilHealthScore}` : ''}
` : ''}
GROUNDING REQUIREMENT: For each recommendation, the "description" must explicitly cite the specific data point(s) that drove it (e.g. an exact metric value, a change over time from the historical comparison above, or a soil property reading). Avoid generic advice — every recommendation must be traceable to a number above.

Provide exactly 6 recommendations in this JSON format (no markdown, pure JSON):
{
  "recommendations": [
    {
      "category": "Fertilization|Irrigation|Soil Amendment|Crop Management|Erosion Control|Pest Management",
      "priority": "high|medium|low",
      "title": "Short action title",
      "description": "2-3 sentence detailed explanation",
      "actionItems": ["specific step 1", "specific step 2", "specific step 3"],
      "estimatedImpact": "Expected improvement description",
      "timeline": "When to implement"
    }
  ]
}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    });

    if (!res.ok) throw new Error('Gemini API error');
    const result = await res.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return parsed.recommendations;
  } catch (err) {
    console.warn('Gemini failed, using rule-based recommendations:', err);
    return generateRuleBasedRecommendations(data);
  }
}

function generateRuleBasedRecommendations(data: RecommendationInput) {
  const recs = [];

  // Fertilization
  if (data.nutrientRisk > 50) {
    recs.push({
      category: 'Fertilization',
      priority: data.nutrientRisk > 70 ? 'high' : 'medium',
      title: data.nitrogen < 0.1 ? 'Apply Nitrogen-Rich Fertilizer' : 'Balanced NPK Application',
      description: `Your soil nutrient risk is ${data.nutrientRisk}%. ${data.ph < 6 ? 'Acidic soil is limiting nutrient availability.' : ''} Apply balanced fertilizers to restore soil fertility and boost crop yield.`,
      actionItems: [
        `Apply ${data.nitrogen < 0.1 ? '80-100 kg/ha Urea' : '60:40:40 kg/ha NPK'} within 2 weeks`,
        'Test soil pH before fertilizer application',
        'Use split application method for better uptake',
      ],
      estimatedImpact: 'Expected 15-25% yield increase within one growing season',
      timeline: 'Immediately / Next 7-14 days',
    });
  }

  // Irrigation
  if (data.waterStress > 40) {
    recs.push({
      category: 'Irrigation',
      priority: data.waterStress > 65 ? 'high' : 'medium',
      title: 'Optimize Irrigation Schedule',
      description: `Water stress level is ${data.waterStress}% with soil moisture at ${data.moistureLevel}%. Implementing drip irrigation or scheduling adjustments will significantly reduce water stress.`,
      actionItems: [
        'Install soil moisture sensors at 15cm and 30cm depth',
        data.moistureLevel < 30 ? 'Irrigate immediately — apply 50mm water' : 'Shift to morning irrigation (6-8 AM)',
        'Consider mulching to reduce evapotranspiration',
      ],
      estimatedImpact: '20-30% water savings while maintaining optimal crop moisture',
      timeline: data.waterStress > 65 ? 'Immediately' : 'Within 7 days',
    });
  }

  // pH Correction
  if (data.ph < 5.5 || data.ph > 7.8) {
    recs.push({
      category: 'Soil Amendment',
      priority: 'high',
      title: data.ph < 5.5 ? 'Apply Agricultural Lime to Raise pH' : 'Apply Gypsum to Correct Alkalinity',
      description: `Soil pH of ${data.ph} is ${data.ph < 5.5 ? 'too acidic' : 'too alkaline'}, reducing nutrient availability. Correcting pH to 6.0-7.0 range will unlock existing soil nutrients.`,
      actionItems: [
        data.ph < 5.5 ? `Apply 2-4 tonnes/ha agricultural lime` : `Apply 500-1000 kg/ha gypsum`,
        'Incorporate amendment thoroughly into top 15cm soil',
        'Re-test pH after 30 days to assess improvement',
      ],
      estimatedImpact: '25-40% improvement in nutrient uptake efficiency',
      timeline: 'Next 2-4 weeks',
    });
  }

  // Organic Matter
  if (data.organicCarbon < 1.0) {
    recs.push({
      category: 'Soil Amendment',
      priority: 'medium',
      title: 'Boost Organic Matter Content',
      description: `Organic carbon at ${data.organicCarbon}% is critically low. Increasing organic matter improves soil structure, water retention, and biological activity.`,
      actionItems: [
        'Apply 10-15 tonnes/ha farmyard manure before next planting',
        'Incorporate crop residues instead of burning',
        'Consider green manure crops like dhaincha or sunhemp',
      ],
      estimatedImpact: 'Improved water retention, soil structure, and long-term fertility',
      timeline: 'Pre-sowing season preparation',
    });
  }

  // Erosion
  if (data.erosionRisk > 50) {
    recs.push({
      category: 'Erosion Control',
      priority: data.erosionRisk > 70 ? 'high' : 'medium',
      title: 'Implement Erosion Prevention Measures',
      description: `Erosion risk is ${data.erosionRisk}%. With NDVI at ${data.ndvi}, ground cover is insufficient to prevent topsoil loss during rainfall events.`,
      actionItems: [
        'Plant contour strips of grasses or legumes across slope',
        'Construct bunds or terraces on slopes > 5%',
        'Apply mulch cover (4-6 cm) to all exposed soil areas',
      ],
      estimatedImpact: 'Prevent topsoil loss, preserve nutrient-rich surface layer',
      timeline: 'Before monsoon season',
    });
  }

  // Crop Suitability
  recs.push({
    category: 'Crop Management',
    priority: 'low',
    title: data.soilHealthScore > 65 ? 'Maintain Current Crop Rotation' : 'Consider Alternative Crops',
    description: `Based on your soil health score of ${data.soilHealthScore}/100 and current conditions, ${data.soilHealthScore > 65 ? 'your land is suitable for a wide range of crops' : 'switching to drought-tolerant or soil-improving crops is recommended'}.`,
    actionItems: [
      data.soilHealthScore > 65
        ? `Continue with ${data.cropType || 'current crop'} and rotate with legumes next season`
        : 'Consider sorghum, millets, or groundnut for resilience',
      'Maintain crop rotation to prevent disease buildup',
      'Record all inputs and yields for data-driven decisions',
    ],
    estimatedImpact: 'Optimized yield aligned with current soil capacity',
    timeline: 'Next planting season',
  });

  return recs.slice(0, 6);
}
