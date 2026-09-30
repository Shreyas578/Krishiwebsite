import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'kisanaico',
});

console.log('Connected. Clearing all user data...\n');

await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

const tables = ['refresh_tokens', 'farmer_profiles', 'buyer_profiles', 'supplier_profiles', 'users', 'news_cache', 'price_cache'];
for (const table of tables) {
  try {
    await connection.execute(`DELETE FROM ${table}`);
    console.log(`✅ Cleared: ${table}`);
  } catch (e) {
    console.log(`⚠️  Skipped ${table}: ${e.message}`);
  }
}

await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
await connection.end();
console.log('\n🎉 Done! DB is clean. Fresh registrations will now work properly.');
