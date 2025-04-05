import pkg from 'pg';
const { Pool } = pkg;

async function debugAdminRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Check the admin role middleware behavior
    console.log('\n--- Testing Admin Role ---');
    
    // 1. Check how many admin users we have
    console.log('\nChecking admin users:');
    const { rows: adminUsers } = await client.query("SELECT * FROM users WHERE role = 'admin'");
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    // 2. Check if there's any issue with the role format or case sensitivity
    console.log('\nChecking all distinct roles in the database:');
    const { rows: distinctRoles } = await client.query("SELECT DISTINCT role FROM users");
    console.log('Roles found:');
    distinctRoles.forEach(row => {
      console.log(`- "${row.role}" (${typeof row.role})`);
    });

    // 3. Simulate the API call for getting all users
    console.log('\nSimulating the API call for getting all users...');
    const { rows: allUsers } = await client.query('SELECT * FROM users');
    
    // Check if there are any null or malformed role values
    console.log('\nChecking for any null or malformed role values:');
    const problematicUsers = allUsers.filter(user => !user.role || typeof user.role !== 'string');
    if (problematicUsers.length > 0) {
      console.log(`Found ${problematicUsers.length} users with problematic role values:`);
      problematicUsers.forEach(user => {
        console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role} (${typeof user.role})`);
      });
    } else {
      console.log('No users with problematic role values found.');
    }
    
    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await pool.end();
  }
}

debugAdminRole().then(() => {
  console.log('\nScript completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});