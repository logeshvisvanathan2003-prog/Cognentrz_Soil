/**
 * Database migration — runs all CREATE TABLE / ALTER TABLE statements.
 * Works with local Postgres and Neon (cloud).
 *
 * Usage:
 *   DATABASE_URL=<your_neon_url> node scripts/migrate.js
 */
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL ||
  'postgresql://cognentrz_user:cognentrz_pass@localhost:5432/cognentrz_db';

const isCloud =
  connectionString.includes('neon.tech') ||
  connectionString.includes('neon.database') ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ...(isCloud ? { ssl: { rejectUnauthorized: false } } : {}),
});

const migrations = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  location VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  -- WhatsApp alert preferences
  whatsapp_number VARCHAR(20),
  whatsapp_enabled BOOLEAN DEFAULT true,
  preferred_language VARCHAR(8) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location_name VARCHAR(255),
  area_hectares DECIMAL(10,2),
  boundary JSONB NOT NULL,
  centroid_lat DECIMAL(10,8),
  centroid_lng DECIMAL(11,8),
  crop_type VARCHAR(100),
  soil_type VARCHAR(100),
  irrigation_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Soil analyses table
CREATE TABLE IF NOT EXISTS soil_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ndvi DECIMAL(5,4),
  evi DECIMAL(5,4),
  savi DECIMAL(5,4),
  moisture_index DECIMAL(5,4),
  land_surface_temp DECIMAL(6,2),
  soil_health_score INTEGER,
  moisture_level INTEGER,
  nutrient_risk INTEGER,
  erosion_risk INTEGER,
  water_stress INTEGER,
  fertility_score INTEGER,
  ph_value DECIMAL(4,2),
  organic_carbon DECIMAL(6,3),
  nitrogen DECIMAL(6,3),
  phosphorus DECIMAL(6,3),
  potassium DECIMAL(6,3),
  clay_content DECIMAL(5,2),
  sand_content DECIMAL(5,2),
  silt_content DECIMAL(5,2),
  satellite_image_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather data table
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  temperature DECIMAL(5,2),
  humidity INTEGER,
  rainfall DECIMAL(6,2),
  wind_speed DECIMAL(5,2),
  cloud_cover INTEGER,
  uv_index DECIMAL(4,1),
  description VARCHAR(255),
  forecast_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES soil_analyses(id) ON DELETE CASCADE,
  prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  predicted_for DATE NOT NULL,
  soil_health_forecast INTEGER,
  moisture_forecast INTEGER,
  yield_estimate DECIMAL(8,2),
  risk_level VARCHAR(50),
  confidence_score DECIMAL(4,3),
  trend_direction VARCHAR(50),
  forecast_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES soil_analyses(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  action_items JSONB,
  estimated_impact VARCHAR(255),
  timeline VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_farm_id ON soil_analyses(farm_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_date ON soil_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_weather_farm_id ON weather_data(farm_id);
CREATE INDEX IF NOT EXISTS idx_predictions_farm_id ON predictions(farm_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_farm_id ON recommendations(farm_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);

-- WhatsApp columns (idempotent — safe to run multiple times)
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(8) DEFAULT 'en';
`;

async function migrate() {
  console.log('🔄 Running database migrations…');
  console.log('   Target:', connectionString.replace(/:\/\/.*@/, '://***@'));
  try {
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
