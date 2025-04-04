import { pool, checkDatabaseConnection } from '../db';
import '../loadEnv'; // Load environment variables first

async function runCheck() {
  try {
    console.log('Checking database connection...');
    console.log('Database URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@') : 'Not set');
    
    // Check connection
    const result = await checkDatabaseConnection();
    
    if (result) {
      console.log('✅ Successfully connected to database');
    } else {
      console.error('❌ Failed to connect to database');
    }
  } catch (error) {
    console.error('❌ Error checking database connection:', error);
  } finally {
    // Close the pool to end the process
    await pool.end();
  }
}

runCheck();