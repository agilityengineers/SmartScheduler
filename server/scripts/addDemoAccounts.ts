import { pool, db } from '../db';
import { 
  users, 
  organizations, 
  teams, 
  UserRole, 
  settings 
} from '@shared/schema';
import * as crypto from 'crypto';
import { sql } from 'drizzle-orm';

// Password hashing function (same as in initDB.ts)
async function hash(password: string): Promise<string> {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function addDemoAccounts() {
  try {
    console.log('🔧 Adding demo accounts...');
    
    // Get the Default Organization and Team
    const org = await db.select().from(organizations).where(sql`name = 'Default Organization'`).limit(1);
    if (org.length === 0) {
      console.log('❌ Default Organization not found');
      return;
    }
    const organizationId = org[0].id;
    
    const team = await db.select().from(teams).where(sql`name = 'Default Team'`).limit(1);
    if (team.length === 0) {
      console.log('❌ Default Team not found');
      return;
    }
    const teamId = team[0].id;

    // Check for existing admin and update if necessary
    const adminUser = await db.select().from(users).where(sql`username = 'admin'`).limit(1);
    if (adminUser.length > 0) {
      // Update admin password to match expected
      const adminPasswordHash = await hash('adminpass');
      await db.update(users)
        .set({ password: adminPasswordHash })
        .where(sql`id = ${adminUser[0].id}`);
      console.log('✅ Updated admin password');
    }
    
    // Demo accounts to add
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
    
    for (const account of demoAccounts) {
      // Check if user already exists
      const existingUser = await db.select().from(users).where(sql`username = ${account.username}`).limit(1);
      
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
        
        // Create default settings for user
        await db.insert(settings)
          .values({
            userId: userId,
            defaultReminders: [15],
            emailNotifications: true,
            pushNotifications: true,
            defaultCalendar: 'google',
            defaultMeetingDuration: 30,
            showDeclinedEvents: false,
            combinedView: true,
            workingHours: {
              0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
              1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
              2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
              3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
              4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
              5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
              6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
            },
            timeFormat: '12h'
          });
        
        console.log(`✅ Created ${account.role} user: ${account.username}`);
      } else {
        // Update existing user
        const passwordHash = await hash(account.password);
        await db.update(users)
          .set({ 
            password: passwordHash,
            role: account.role,
            emailVerified: true
          })
          .where(sql`id = ${existingUser[0].id}`);
        
        console.log(`✅ Updated ${account.role} user: ${account.username}`);
      }
    }
    
    console.log('✅ Demo accounts setup complete');
  } catch (error) {
    console.error('❌ Error adding demo accounts:', error);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the function
addDemoAccounts();