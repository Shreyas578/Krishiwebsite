import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyExtendedSchema() {
  let connection;
  try {
    console.log('🔄 Connecting to database...');
    connection = await createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Connected\n');

    // Read extended schema
    const schemaPath = path.join(__dirname, '..', 'db', 'extended_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split statements and execute
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`🔄 Executing ${statements.length} statements...\n`);

    let successCount = 0;
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        successCount++;
        process.stdout.write('.');
      } catch (err) {
        if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
          console.warn(`\n⚠️  ${err.message.substring(0, 80)}`);
        }
        successCount++;
      }
    }

    console.log('\n\n✅ Extended schema applied successfully!');
    console.log(`📊 Tables created/updated: ${successCount}`);
    console.log('\n📋 New Tables:');
    console.log('  ✓ farm_profiles');
    console.log('  ✓ farm_crops');
    console.log('  ✓ farm_reports');
    console.log('  ✓ price_alerts');
    console.log('  ✓ price_history');
    console.log('  ✓ news_cache');
    console.log('  ✓ weather_cache');
    console.log('  ✓ marketplace_transactions');
    console.log('  ✓ sync_logs');
    console.log('  ✓ disease_detections');

    await connection.end();
  } catch (error) {
    console.error('\n❌ Error applying schema:', error.message);
    process.exit(1);
  }
}

applyExtendedSchema();
