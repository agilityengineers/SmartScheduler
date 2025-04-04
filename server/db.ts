import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Initialize PostgreSQL connection pool using environment variables
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create Drizzle ORM instance with the connection pool and schema
export const db = drizzle(pool, { schema });

// Function to check if the database connection is working
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Attempt to connect to the database
    const client = await pool.connect();
    
    // Run a simple query to verify connectivity
    const result = await client.query('SELECT NOW()');
    
    // Release the client back to the pool
    client.release();
    
    // Log success and return true
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    // Log the error and return false
    console.error('❌ Database connection failed:', error);
    return false;
  }
}