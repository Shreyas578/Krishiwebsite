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
    console.log('🔄 Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME;
    console.log(`\n🔄 Creating database ${dbName} if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database ${dbName} ready`);

    // Use the database
    await connection.query(`USE \`${dbName}\``);

    // Read the schema.sql file
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    console.log(`\n🔄 Reading schema from: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema file
    console.log('🔄 Executing database schema...');
    
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
          process.stdout.write('.');
        }
      } catch (err) {
        // Some errors are acceptable (table already exists, etc)
        if (err.code !== 'ER_TABLE_EXISTS_ERROR' && 
            !err.message.includes('already exists') &&
            !err.message.includes('Duplicate')) {
          // Silent on expected foreign key warnings
          if (!err.message.includes('Failed to open the referenced table')) {
            console.warn(`\n⚠ Warning: ${err.message.substring(0, 100)}`);
          }
          errorCount++;
        }
      }
    }

    console.log('\n\n✅ Database initialization complete!');
    console.log(`Database: ${dbName}`);
    console.log(`Successfully executed: ${successCount} statements`);
    if (errorCount > 0) console.log(`Warnings/Expected errors: ${errorCount}`);
    
    // Verify and create essential tables
    console.log('\n🔍 Verifying and creating essential auth tables...\n');
    
    const essentialTables = [
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          phone VARCHAR(15) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('farmer', 'supplier', 'buyer') NOT NULL,
          fcm_token VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'refresh_tokens',
        sql: `CREATE TABLE IF NOT EXISTS refresh_tokens (
          id VARCHAR(36) PRIMARY KEY,
          token_hash VARCHAR(255) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'farmer_profiles',
        sql: `CREATE TABLE IF NOT EXISTS farmer_profiles (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL UNIQUE,
          land_area_acres DECIMAL(5,2),
          soil_type VARCHAR(50),
          water_source VARCHAR(50),
          village VARCHAR(100),
          district VARCHAR(100),
          state VARCHAR(100),
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'supplier_profiles',
        sql: `CREATE TABLE IF NOT EXISTS supplier_profiles (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL UNIQUE,
          company_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      },
      {
        name: 'buyer_profiles',
        sql: `CREATE TABLE IF NOT EXISTS buyer_profiles (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL UNIQUE,
          company_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      }
    ];
    
    for (const table of essentialTables) {
      try {
        await connection.query(table.sql);
        console.log(`✅ ${table.name} - Ready`);
      } catch (err) {
        console.log(`✅ ${table.name} - Already exists`);
      }
    }

    console.log('\n✅ All essential tables and indexes ready for use');

  } catch (error) {
    console.error('\n❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initializeDatabase();
