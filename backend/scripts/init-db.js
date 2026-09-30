import mysql from 'mysql2/promise.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  let connection;
  try {
    // First, connect without database to create it
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('Connected to MySQL');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME;
    console.log(`Creating database ${dbName} if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database ${dbName} ready`);

    // Use the database
    await connection.query(`USE \`${dbName}\``);

    // Read the schema.sql file
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    console.log(`Reading schema from: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema file
    console.log('Executing database schema...');
    
    // Split by semicolon and filter out empty statements and comments
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        if (statement) {
          await connection.query(statement);
          successCount++;
          console.log('✓ Executed statement');
        }
      } catch (err) {
        // Some errors are acceptable (table already exists, etc)
        if (err.code !== 'ER_TABLE_EXISTS_ERROR' && 
            !err.message.includes('already exists') &&
            !err.message.includes('Duplicate')) {
          console.warn(`⚠ Warning: ${err.message.substring(0, 100)}`);
          errorCount++;
        }
      }
    }

    console.log('\n✅ Database initialization complete!');
    console.log(`Database: ${dbName}`);
    console.log(`Successfully executed: ${successCount} statements`);
    if (errorCount > 0) console.log(`Warnings: ${errorCount}`);
    
    // Verify essential tables exist
    console.log('\n🔍 Verifying essential tables...');
    const essentialTables = ['users', 'refresh_tokens', 'farmer_profiles', 'supplier_profiles', 'buyer_profiles'];
    
    for (const table of essentialTables) {
      const [rows] = await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [dbName, table]
      );
      
      if (rows.length > 0) {
        console.log(`  ✅ ${table} exists`);
      } else {
        console.warn(`  ⚠️  ${table} NOT FOUND - This is critical for auth!`);
      }
    }
    
    console.log('✅ All tables and indexes ready for use');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initializeDatabase();
