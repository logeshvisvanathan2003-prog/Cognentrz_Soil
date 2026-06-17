// Adds WhatsApp alert preferences to users. Run: node scripts/migrate-whatsapp.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://cognentrz_user:cognentrz_pass@localhost:5433/cognentrz_db' });
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(8) DEFAULT 'en'`);
    console.log('✅ WhatsApp columns added to users');
  } catch (e) { console.error(e.message); } finally { process.exit(0); }
})();
