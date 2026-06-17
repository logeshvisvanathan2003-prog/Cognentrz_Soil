export interface SoilInputData {
  ndvi: number;
  evi: number;
  savi: number;
  ndwi: number;
  lst: number;
  soilMoisture: number;
  ph?: number;
  organicCarbon?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  clay?: number;
  sand?: number;
  silt?: number;
  rainfall?: number;
  temperature?: number;
}

export interface SoilHealthScores {
  soilHealthScore: number;
  moistureLevel: number;
  nutrientRisk: number;
  erosionRisk: number;
  waterStress: number;
  fertilityScore: number;
  overallStatus: 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Critical';
  trend: 'Improving' | 'Stable' | 'Declining';
  breakdown: {
    vegetationHealth: number;
    soilMoisture: number;
    thermalStress: number;
    nutrientAvailability: number;
    erosionSusceptibility: number;
  };
}

export function calculateSoilHealthScores(data: SoilInputData, previousScore?: number | null): SoilHealthScores {
  // Vegetation Health Score (0-100) based on NDVI
  const vegetationHealth = Math.round(
    Math.min(100, Math.max(0,
      (data.ndvi > 0.8 ? 100 :
       data.ndvi > 0.6 ? 80 + (data.ndvi - 0.6) * 100 :
       data.ndvi > 0.4 ? 60 + (data.ndvi - 0.4) * 100 :
       data.ndvi > 0.2 ? 40 + (data.ndvi - 0.2) * 100 :
       data.ndvi * 200)
    ))
  );

  // Soil Moisture Score (0-100) based on NDWI and soilMoisture
  const ndwiNorm = Math.min(100, Math.max(0, (data.ndwi + 1) * 50));
  const moistureNorm = Math.min(100, Math.max(0, data.soilMoisture));
  const soilMoistureScore = Math.round((ndwiNorm * 0.4 + moistureNorm * 0.6));

  // Thermal Stress Score (100 = no stress, 0 = critical heat)
  const thermalStress = Math.round(
    data.lst > 40 ? 20 :
    data.lst > 35 ? 40 + (40 - data.lst) * 4 :
    data.lst > 30 ? 60 + (35 - data.lst) * 4 :
    data.lst > 25 ? 80 + (30 - data.lst) * 4 :
    100
  );

  // Nutrient Availability Score
  const ph = data.ph ?? 6.5;
  const oc = data.organicCarbon ?? 1.5;
  const N = data.nitrogen ?? 0.15;
  const P = data.phosphorus ?? 15;
  const K = data.potassium ?? 150;
  
  const phScore = ph >= 6.0 && ph <= 7.5 ? 100 :
                  ph >= 5.5 && ph <= 8.0 ? 70 : 40;
  const ocScore = oc > 2.5 ? 100 : oc > 1.5 ? 75 : oc > 0.75 ? 50 : 25;
  const nScore = N > 0.2 ? 100 : N > 0.1 ? 70 : 40;
  const pScore = P > 25 ? 100 : P > 15 ? 75 : P > 5 ? 50 : 25;
  const kScore = K > 200 ? 100 : K > 100 ? 75 : K > 50 ? 50 : 25;
  
  const nutrientAvailability = Math.round((phScore + ocScore + nScore + pScore + kScore) / 5);

  // Erosion Susceptibility (0 = high erosion risk, 100 = no erosion)
  const clay = data.clay ?? 25;
  const sand = data.sand ?? 45;
  const silt = data.silt ?? 30;
  
  const textureScore = clay > 20 && clay < 50 ? 80 : clay <= 10 ? 40 : 60;
  const coverScore = vegetationHealth;
  const erosionSusceptibility = Math.round((textureScore * 0.4 + coverScore * 0.6));

  // Composite Soil Health Score
  const soilHealthScore = Math.round(
    vegetationHealth * 0.25 +
    soilMoistureScore * 0.20 +
    thermalStress * 0.15 +
    nutrientAvailability * 0.25 +
    erosionSusceptibility * 0.15
  );

  // Derived Scores
  const moistureLevel = soilMoistureScore;
  const nutrientRisk = Math.round(100 - nutrientAvailability);
  const erosionRisk = Math.round(100 - erosionSusceptibility);
  const waterStress = Math.round(100 - soilMoistureScore);
  const fertilityScore = Math.round((nutrientAvailability * 0.7 + vegetationHealth * 0.3));

  // Overall Status
  const overallStatus: SoilHealthScores['overallStatus'] =
    soilHealthScore >= 80 ? 'Excellent' :
    soilHealthScore >= 65 ? 'Good' :
    soilHealthScore >= 50 ? 'Moderate' :
    soilHealthScore >= 35 ? 'Poor' : 'Critical';

  // Trend calculation — prefer real historical comparison when available
  let trend: SoilHealthScores['trend'];
  if (previousScore != null && !isNaN(previousScore)) {
    const delta = soilHealthScore - previousScore;
    trend = delta > 2 ? 'Improving' : delta < -2 ? 'Declining' : 'Stable';
  } else {
    trend =
      vegetationHealth > 60 && soilMoistureScore > 50 ? 'Improving' :
      vegetationHealth < 40 || soilMoistureScore < 30 ? 'Declining' : 'Stable';
  }

  return {
    soilHealthScore,
    moistureLevel,
    nutrientRisk,
    erosionRisk,
    waterStress,
    fertilityScore,
    overallStatus,
    trend,
    breakdown: {
      vegetationHealth,
      soilMoisture: soilMoistureScore,
      thermalStress,
      nutrientAvailability,
      erosionSusceptibility,
    }
  };
}

export function generatePredictions(currentScores: SoilHealthScores, weatherData: any) {
  const months = 12;
  const predictions = [];
  
  let currentHealth = currentScores.soilHealthScore;
  const rainfall = weatherData?.rainfall ?? 80;
  const temp = weatherData?.temperature ?? 30;
  
  for (let i = 1; i <= months; i++) {
    const month = new Date();
    month.setMonth(month.getMonth() + i);
    
    // Seasonal factors
    const monthNum = month.getMonth();
    const isRainySeason = monthNum >= 5 && monthNum <= 10;
    const rainFactor = isRainySeason ? 1.05 : 0.97;
    const tempFactor = temp > 35 ? 0.98 : 1.0;
    
    currentHealth = Math.min(100, Math.max(0, currentHealth * rainFactor * tempFactor));
    
    predictions.push({
      month: month.toLocaleString('default', { month: 'short', year: '2-digit' }),
      soilHealth: Math.round(currentHealth),
      moisture: Math.round(currentScores.moistureLevel * (isRainySeason ? 1.1 : 0.9)),
      fertility: Math.round(currentScores.fertilityScore * rainFactor),
      risk: currentHealth < 40 ? 'High' : currentHealth < 60 ? 'Medium' : 'Low',
    });
  }
  
  return predictions;
}
