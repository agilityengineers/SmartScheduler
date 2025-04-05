/**
 * This script checks if users "cwilliams" and "cwilliams25" exist in the database
 * and debugs the Admin Dashboard issue where they aren't showing up
 */

import { db, checkDatabaseConnection } from './server/db.js';
import { users } from './shared/schema.js';
import { eq, or } from 'drizzle-orm';

async function adminDashboardFix() {
  try {
    console.log('Checking database connection...');
    const isConnected = await checkDatabaseConnection();
    
    if (!isConnected) {
      console.error('❌ Database connection failed');
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // 1. Check if the users exist
    console.log('\nChecking for specific users...');
    const specificUsers = await db.select()
      .from(users)
      .where(or(
        eq(users.username, 'cwilliams'),
        eq(users.username, 'cwilliams25')
      ));
    
    console.log(`Found ${specificUsers.length} specific users:`);
    specificUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Email: ${user.email}`);
    });
    
    // 2. Get all users to check total count
    console.log('\nFetching all users...');
    const allUsers = await db.select().from(users);
    
    console.log(`Total users in database: ${allUsers.length}`);
    console.log('First 5 users:');
    allUsers.slice(0, 5).forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    // 3. Check admin users specifically
    console.log('\nChecking for admin users...');
    const adminUsers = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'));
    
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}`);
    });
    
  } catch (error) {
    console.error('Error running admin dashboard fix:', error);
  }
}

adminDashboardFix().then(() => {
  console.log('\nScript completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});