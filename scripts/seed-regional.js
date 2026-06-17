// Seeds demo "neighbour" farms near Salem/Kangeyam with synchronized NDVI
// decline so the Regional Intelligence page shows a real outbreak alert.
// Run: node scripts/seed-regional.js
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cognentrz_user:cognentrz_pass@localhost:5433/cognentrz_db',
});

// A demo "neighbour" user (so it shows as anonymized nearby farms, not yours)
async function run() {
  console.log('Seeding regional demo data…');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    // demo neighbour user
    const u = await c.query(
      `INSERT INTO users (name, email, password_hash, subscription_tier)
       VALUES ('Demo Neighbour', 'neighbour.demo@cognentrz.local', 'x', 'free')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`);
    const userId = u.rows[0].id;

    // Center near Kangeyam/Salem TN
    const baseLat = 11.0056, baseLng = 77.5614;
    const crop = 'Cotton';            // outbreak crop
    const farms = [];
    for (let i = 0; i < 5; i++) {
      const lat = baseLat + (Math.random() - 0.5) * 0.08;
      const lng = baseLng + (Math.random() - 0.5) * 0.08;
      const boundary = JSON.stringify([
        { lat, lng }, { lat: lat + 0.002, lng }, { lat: lat + 0.002, lng: lng + 0.002 }, { lat, lng: lng + 0.002 },
      ]);
      const f = await c.query(
        `INSERT INTO farms (user_id, name, boundary, location_name, centroid_lat, centroid_lng, area_hectares, crop_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [userId, `Demo Cotton Field ${i + 1}`, boundary, 'Kangeyam', lat, lng, 0.4, crop]);
      farms.push(f.rows[0].id);
    }

    // For each: an older HEALTHY reading, then a recent DECLINED reading (synchronized drop)
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5);
    for (const fid of farms) {
      // older healthy NDVI ~0.55
      await c.query(
        `INSERT INTO soil_analyses (farm_id, ndvi, moisture_index, land_surface_temp, soil_health_score, analysis_date)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [fid, 0.55 + Math.random() * 0.05, 0.5, 30, 70, twoWeeksAgo]);
      // recent declined NDVI ~0.30 (a >0.08 drop → triggers outbreak across many farms)
      await c.query(
        `INSERT INTO soil_analyses (farm_id, ndvi, moisture_index, land_surface_temp, soil_health_score, analysis_date)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [fid, 0.28 + Math.random() * 0.04, 0.35, 34, 45, now]);
    }

    await c.query('COMMIT');
    console.log(`✅ Seeded ${farms.length} declining ${crop} fields near Kangeyam. Open Regional Intelligence to see the outbreak alert.`);
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('Seed failed:', e.message);
  } finally {
    c.release();
    process.exit(0);
  }
}
run();
