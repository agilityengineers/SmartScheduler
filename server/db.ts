import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Initialize PostgreSQL connection pool using environment variables.
// Bound the pool per instance so autoscale (N instances) does not exhaust the
// database's connection limit, and set timeouts so a stuck/slow database surfaces
// as an error instead of hanging requests.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
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