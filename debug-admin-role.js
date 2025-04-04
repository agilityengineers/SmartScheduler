// debug-admin-role.js - Script to help debug admin role issues in production
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function debugAdminRole() {
  console.log('-----------------------------------------------');
  console.log('PRODUCTION ADMIN ROLE DEBUGGING SCRIPT');
  console.log('-----------------------------------------------');
  console.log('This script will help diagnose admin dashboard issues');
  console.log('');

  // Environment check
  console.log('Environment Variables:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'defined (hidden)' : 'undefined');
  console.log('');

  try {
    // Database connection
    console.log('Establishing database connection...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Connect to database
    const client = await pool.connect();
    console.log('Database connection established successfully!');
    
    // 1. Check database tables
    console.log('\n1. Checking database tables...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables found:', tableCheck.rows.map(row => row.table_name).join(', '));
    
    // 2. Check all users and their roles
    console.log('\n2. Checking all users and their roles:');
    const usersResult = await client.query(
      'SELECT id, username, email, role, organization_id, team_id FROM users'
    );
    
    if (usersResult.rows.length > 0) {
      console.log('Users found:');
      usersResult.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: '${user.role}', Org: ${user.organization_id}, Team: ${user.team_id}`);
      });
    } else {
      console.log('No users found in the database!');
    }
    
    // 3. Check for admin user specifically
    console.log('\n3. Looking for admin user specifically:');
    const adminResult = await client.query(
      "SELECT id, username, role FROM users WHERE username = 'admin'"
    );
    
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log('Admin user found:');
      console.log(`  - ID: ${admin.id}`);
      console.log(`  - Username: ${admin.username}`);
      console.log(`  - Role: '${admin.role}'`);
      console.log(`  - Role type: ${typeof admin.role}`);
      console.log(`  - Role === 'admin': ${admin.role === 'admin'}`);
      console.log(`  - Role.toLowerCase() === 'admin': ${admin.role.toLowerCase() === 'admin'}`);
    } else {
      console.log('No admin user found!');
    }
    
    // 4. Check the enum values in code vs database
    console.log('\n4. Common role values:');
    console.log(`  - 'admin' (lowercase)`);
    console.log(`  - 'ADMIN' (uppercase)`);
    console.log(`  - 'Admin' (title case)`);
    
    // 5. Check session table (if exists)
    console.log('\n5. Checking session storage:');
    try {
      const sessionResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'session'
        );
      `);
      
      if (sessionResult.rows[0].exists) {
        console.log('Session table found! Checking sessions...');
        
        try {
          const sessions = await client.query('SELECT * FROM session LIMIT 5');
          console.log(`Found ${sessions.rowCount} session records`);
          
          if (sessions.rowCount > 0) {
            // Sessions often store JSON data as text, try to parse it
            sessions.rows.forEach((session, index) => {
              console.log(`Session ${index + 1}:`);
              console.log('  - ID:', session.sid || '(no ID)');
              
              try {
                // Try to extract session data if it's stored as JSON
                if (session.sess && typeof session.sess === 'object') {
                  console.log('  - Data:', JSON.stringify(session.sess).substring(0, 100) + '...');
                  console.log('  - UserId:', session.sess.userId);
                } else if (session.sess && typeof session.sess === 'string') {
                  const sessData = JSON.parse(session.sess);
                  console.log('  - Data:', JSON.stringify(sessData).substring(0, 100) + '...');
                  console.log('  - UserId:', sessData.userId);
                }
              } catch (e) {
                console.log('  - Could not parse session data');
              }
            });
          }
        } catch (e) {
          console.log('Error reading session data:', e.message);
        }
      } else {
        console.log('No session table found - sessions might be stored elsewhere');
      }
    } catch (e) {
      console.log('Error checking for session table:', e.message);
    }
    
    // Release client
    client.release();
    
    console.log('\n-----------------------------------------------');
    console.log('DEBUGGING RECOMMENDATIONS:');
    console.log('-----------------------------------------------');
    console.log('1. Make sure the user role is "admin" (lowercase) in the database');
    console.log('2. Add case-insensitive role comparison in UserContext.tsx:');
    console.log('   const isAdmin = user?.role?.toLowerCase() === UserRole.ADMIN.toLowerCase();');
    console.log('3. Check localStorage in the browser for the user object');
    console.log('4. Ensure auth middleware is properly setting userRole in requests');
    console.log('5. Add debug logs in the API routes for /api/users endpoint');
    console.log('');
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

// Run the debug function
debugAdminRole();