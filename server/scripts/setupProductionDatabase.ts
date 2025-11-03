import '../loadEnv'; // Load environment variables
import { db, pool, checkDatabaseConnection } from '../db';
import { sql } from 'drizzle-orm';
import {
  users,
  organizations,
  teams,
  UserRole,
  settings
} from '@shared/schema';
import bcrypt from 'bcrypt';

// Password hashing function using bcrypt
async function hash(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function setupProductionDatabase() {
  try {
    console.log('🔄 Setting up production database...');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection
    console.log('🔄 Testing database connection...');
    const connectionSuccess = await checkDatabaseConnection();
    
    if (!connectionSuccess) {
      console.error('❌ Database connection failed!');
      console.error('Please check your DATABASE_URL or PG* environment variables');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    console.log('🔄 Checking if tables exist...');
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        );
      `);
      
      const tablesExist = result.rows[0]?.exists === true;
      
      if (!tablesExist) {
        console.error('❌ Database tables do not exist!');
        console.error('Run the application first to create tables before running this script');
        process.exit(1);
      }
      
      console.log('✅ Database tables exist');
    } finally {
      client.release();
    }
    
    // Set up organization and team
    console.log('🔄 Setting up organization and team...');
    
    // Check if organization exists
    const existingOrgs = await db.select()
      .from(organizations)
      .where(sql`name = 'Default Organization'`)
      .limit(1);
    
    let organizationId: number;
    
    if (existingOrgs.length > 0) {
      organizationId = existingOrgs[0].id;
      console.log(`✅ Default Organization exists with ID: ${organizationId}`);
    } else {
      // Create organization
      const orgResult = await db.insert(organizations)
        .values({
          name: 'Default Organization',
          description: 'Default organization created during production setup',
        })
        .returning();
      
      organizationId = orgResult[0].id;
      console.log(`✅ Created Default Organization with ID: ${organizationId}`);
    }
    
    // Check if team exists
    const existingTeams = await db.select()
      .from(teams)
      .where(sql`organization_id = ${organizationId}`)
      .limit(1);
    
    let teamId: number;
    
    if (existingTeams.length > 0) {
      teamId = existingTeams[0].id;
      console.log(`✅ Default Team exists with ID: ${teamId}`);
    } else {
      // Create team
      const teamResult = await db.insert(teams)
        .values({
          name: 'Default Team',
          organizationId,
          description: 'Default team created during production setup',
        })
        .returning();
      
      teamId = teamResult[0].id;
      console.log(`✅ Created Default Team with ID: ${teamId}`);
    }
    
    // Set up admin account
    console.log('🔄 Setting up admin account...');
    
    // Check if admin exists
    const existingAdmin = await db.select()
      .from(users)
      .where(sql`username = 'admin'`)
      .limit(1);
    
    const defaultWorkingHours = {
      0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
      1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
      2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
      3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
      4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
      5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
      6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
    };
    
    if (existingAdmin.length > 0) {
      // Update admin password
      const adminPasswordHash = await hash('adminpass');
      await db.update(users)
        .set({ 
          password: adminPasswordHash,
          emailVerified: true,
          role: UserRole.ADMIN,
          organizationId,
          teamId
        })
        .where(sql`id = ${existingAdmin[0].id}`);
      
      console.log(`✅ Updated admin account (ID: ${existingAdmin[0].id})`);
      console.log('✅ Admin password reset to: adminpass');
      
      // Check if admin has settings
      const adminSettings = await db.select()
        .from(settings)
        .where(sql`user_id = ${existingAdmin[0].id}`)
        .limit(1);
      
      if (adminSettings.length === 0) {
        // Create settings for admin
        await db.insert(settings)
          .values({
            userId: existingAdmin[0].id,
            defaultReminders: [15],
            emailNotifications: true,
            pushNotifications: true,
            defaultCalendar: 'google',
            defaultMeetingDuration: 30,
            showDeclinedEvents: false,
            combinedView: true,
            workingHours: defaultWorkingHours,
            timeFormat: '12h'
          });
        
        console.log(`✅ Created settings for admin account`);
      }
    } else {
      // Create admin account
      const adminPasswordHash = await hash('adminpass');
      const userResult = await db.insert(users)
        .values({
          username: 'admin',
          password: adminPasswordHash,
          email: 'admin@example.com',
          emailVerified: true,
          displayName: 'Administrator',
          role: UserRole.ADMIN,
          organizationId,
          teamId,
        })
        .returning();
      
      const userId = userResult[0].id;
      
      // Create settings for admin
      await db.insert(settings)
        .values({
          userId,
          defaultReminders: [15],
          emailNotifications: true,
          pushNotifications: true,
          defaultCalendar: 'google',
          defaultMeetingDuration: 30,
          showDeclinedEvents: false,
          combinedView: true,
          workingHours: defaultWorkingHours,
          timeFormat: '12h'
        });
      
      console.log(`✅ Created admin account (ID: ${userId})`);
      console.log('✅ Admin credentials:');
      console.log('   Username: admin');
      console.log('   Password: adminpass');
    }
    
    // Set up demo accounts if needed
    const demoAccounts = [
      {
        username: 'companyadmin',
        password: 'companypass',
        email: 'companyadmin@example.com',
        displayName: 'Company Admin',
        role: UserRole.COMPANY_ADMIN
      },
      {
        username: 'teammanager',
        password: 'teampass',
        email: 'teammanager@example.com',
        displayName: 'Team Manager',
        role: UserRole.TEAM_MANAGER
      },
      {
        username: 'testuser',
        password: 'password',
        email: 'testuser@example.com',
        displayName: 'Test User',
        role: UserRole.USER
      }
    ];
    
    console.log('🔄 Setting up demo accounts...');
    
    for (const account of demoAccounts) {
      // Check if user already exists
      const existingUser = await db.select()
        .from(users)
        .where(sql`username = ${account.username}`)
        .limit(1);
      
      if (existingUser.length === 0) {
        // Create new user
        const passwordHash = await hash(account.password);
        const userResult = await db.insert(users)
          .values({
            username: account.username,
            password: passwordHash,
            email: account.email,
            emailVerified: true,
            displayName: account.displayName,
            role: account.role,
            organizationId,
            teamId,
          })
          .returning();
        
        const userId = userResult[0].id;
        
        // Create settings for user
        await db.insert(settings)
          .values({
            userId,
            defaultReminders: [15],
            emailNotifications: true,
            pushNotifications: true,
            defaultCalendar: 'google',
            defaultMeetingDuration: 30,
            showDeclinedEvents: false,
            combinedView: true,
            workingHours: defaultWorkingHours,
            timeFormat: '12h'
          });
        
        console.log(`✅ Created ${account.role} user: ${account.username} (ID: ${userId})`);
      } else {
        // Update existing user
        const passwordHash = await hash(account.password);
        await db.update(users)
          .set({ 
            password: passwordHash,
            role: account.role,
            emailVerified: true,
            organizationId,
            teamId
          })
          .where(sql`id = ${existingUser[0].id}`);
        
        console.log(`✅ Updated ${account.role} user: ${account.username} (ID: ${existingUser[0].id})`);
      }
    }
    
    console.log('\n✅ Production database setup complete!');
    console.log('\nYou can now log in with the following credentials:');
    console.log('- Username: admin');
    console.log('- Password: adminpass');
    
  } catch (error) {
    console.error('❌ Error setting up production database:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupProductionDatabase();