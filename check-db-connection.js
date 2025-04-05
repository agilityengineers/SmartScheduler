import pkg from 'pg';
const { Pool } = pkg;

async function checkDbConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Connection successful, checking users table...');
    
    // Get all users
    const { rows: allUsers } = await client.query('SELECT * FROM users');
    console.log(`\nTotal users: ${allUsers.length}`);
    
    if (allUsers.length > 0) {
      console.log('First 5 users:');
      allUsers.slice(0, 5).forEach(user => {
        console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
      });
    } else {
      console.log('No users found in the database');
    }
    
    // Check for specific users
    const { rows: specificUsers } = await client.query(
      "SELECT * FROM users WHERE username = 'cwilliams' OR username = 'cwilliams25'"
    );
    
    console.log(`\nFound ${specificUsers.length} specific users:`);
    specificUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Email: ${user.email}`);
    });
    
    // Check for admin users
    const { rows: adminUsers } = await client.query("SELECT * FROM users WHERE role = 'admin'");
    console.log(`\nFound ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}`);
    });
    
    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await pool.end();
  }
}

checkDbConnection().then(() => {
  console.log('\nScript completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});