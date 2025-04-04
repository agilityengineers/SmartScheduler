// check-db-connection.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkDbConnection() {
  console.log('Checking database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Defined (value hidden)' : 'Undefined');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Attempt to connect to the database
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Run a simple query to verify connectivity
    console.log('Running test query...');
    const result = await client.query('SELECT NOW() as now');
    
    console.log('✅ Database connection successful!');
    console.log('Timestamp from database:', result.rows[0].now);
    
    // Check admin user in the database
    console.log('\nChecking admin user...');
    const userResult = await client.query('SELECT id, username, role FROM users WHERE username = $1', ['admin']);
    
    if (userResult.rows.length > 0) {
      const adminUser = userResult.rows[0];
      console.log('✅ Found admin user:');
      console.log('  ID:', adminUser.id);
      console.log('  Username:', adminUser.username);
      console.log('  Role:', adminUser.role);
      console.log('  Role type:', typeof adminUser.role);
      console.log('  Role === "admin":', adminUser.role === 'admin');
      console.log('  Role.toLowerCase() === "admin":', adminUser.role.toLowerCase() === 'admin');
    } else {
      console.log('❌ Admin user not found!');
    }
    
    // Release the client back to the pool
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

checkDbConnection();