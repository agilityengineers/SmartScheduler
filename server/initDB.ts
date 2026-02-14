import { db, pool } from './db';
import { sql } from 'drizzle-orm';
import {
  users, UserRole,
  organizations,
  teams,
  settings
} from '@shared/schema';
import bcrypt from 'bcrypt';

// Password hashing function using bcrypt
async function hash(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Function to initialize the database with tables and default data
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if tables exist before attempting to create them
    const tablesExist = await checkTablesExist();
    
    if (!tablesExist) {
      console.log('👷 Creating database tables...');
      await createTables();
      console.log('✅ Database tables created successfully');
    } else {
      console.log('✅ Database tables already exist');
    }
    
    // Initialize default data if needed
    await initDefaultData();
    
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Check if the required tables exist in the database
async function checkTablesExist(): Promise<boolean> {
  try {
    // Use raw pool query instead of db.execute
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        );
      `);
      
      return result.rows[0]?.exists === true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error checking if tables exist:', error);
    return false;
  }
}

// Create tables in the database
async function createTables(): Promise<void> {
  try {
    // Execute SQL statements to create tables
    await db.execute(sql`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN DEFAULT FALSE,
        display_name TEXT,
        profile_picture TEXT,
        avatar_color TEXT,
        bio TEXT,
        timezone TEXT DEFAULT 'UTC',
        role TEXT NOT NULL DEFAULT 'user',
        organization_id INTEGER,
        team_id INTEGER
      );

      -- Organizations table
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Teams table
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        organization_id INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Calendar Integrations table
      CREATE TABLE IF NOT EXISTS calendar_integrations (
        id SERIAL PRIMARY KEY,
        name TEXT,
        type TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        calendar_id TEXT,
        last_synced TIMESTAMP,
        settings JSONB DEFAULT '{}',
        status TEXT,
        scope TEXT,
        error TEXT,
        metadata JSONB DEFAULT '{}',
        is_connected BOOLEAN DEFAULT FALSE,
        is_primary BOOLEAN DEFAULT FALSE,
        webhook_url TEXT,
        api_key TEXT
      );

      -- Events table
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        timezone TEXT,
        description TEXT,
        location TEXT,
        meeting_url TEXT,
        is_all_day BOOLEAN DEFAULT FALSE,
        status TEXT,
        external_id TEXT,
        calendar_type TEXT,
        calendar_integration_id INTEGER,
        attendees JSONB DEFAULT '[]',
        reminders JSONB DEFAULT '[]',
        visibility TEXT,
        recurrence TEXT
      );

      -- Booking Links table
      CREATE TABLE IF NOT EXISTS booking_links (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        duration INTEGER NOT NULL,
        team_id INTEGER,
        description TEXT,
        is_team_booking BOOLEAN DEFAULT FALSE,
        team_member_ids JSONB DEFAULT '[]',
        assignment_method TEXT DEFAULT 'round-robin',
        availability JSONB DEFAULT '{"window":30,"days":["1","2","3","4","5"],"hours":{"start":"09:00","end":"17:00"}}',
        buffer_before INTEGER DEFAULT 0,
        buffer_after INTEGER DEFAULT 0,
        max_bookings_per_day INTEGER DEFAULT 0,
        lead_time INTEGER DEFAULT 60,
        meeting_type TEXT DEFAULT 'in-person',
        location TEXT,
        meeting_url TEXT,
        start_time_increment INTEGER DEFAULT 30,
        is_hidden BOOLEAN DEFAULT FALSE,
        availability_schedule_id INTEGER,
        brand_logo TEXT,
        brand_color TEXT,
        remove_branding BOOLEAN DEFAULT FALSE,
        redirect_url TEXT,
        confirmation_message TEXT,
        confirmation_cta JSONB,
        is_one_off BOOLEAN DEFAULT FALSE,
        is_expired BOOLEAN DEFAULT FALSE,
        require_payment BOOLEAN DEFAULT FALSE,
        price INTEGER,
        currency TEXT DEFAULT 'usd',
        auto_create_meet_link BOOLEAN DEFAULT FALSE,
        team_member_weights JSONB DEFAULT '{}',
        max_bookings_per_week INTEGER DEFAULT 0,
        max_bookings_per_month INTEGER DEFAULT 0,
        is_collective BOOLEAN DEFAULT FALSE,
        is_managed_template BOOLEAN DEFAULT FALSE,
        managed_template_id INTEGER,
        locked_fields JSONB DEFAULT '[]'
      );

      -- Add missing columns to booking_links for existing databases
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'in-person';
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS meeting_url TEXT;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS start_time_increment INTEGER DEFAULT 30;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS availability_schedule_id INTEGER;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS brand_logo TEXT;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS brand_color TEXT;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS remove_branding BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS redirect_url TEXT;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS confirmation_message TEXT;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS confirmation_cta JSONB;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS is_one_off BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS require_payment BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS price INTEGER;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS auto_create_meet_link BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS team_member_weights JSONB DEFAULT '{}';
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS max_bookings_per_week INTEGER DEFAULT 0;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS max_bookings_per_month INTEGER DEFAULT 0;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS is_collective BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS is_managed_template BOOLEAN DEFAULT FALSE;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS managed_template_id INTEGER;
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS locked_fields JSONB DEFAULT '[]';
      ALTER TABLE booking_links ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{"window":30,"days":["1","2","3","4","5"],"hours":{"start":"09:00","end":"17:00"}}';

      -- Bookings table
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        booking_link_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        event_id INTEGER,
        assigned_user_id INTEGER
      );

      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        default_reminders JSONB DEFAULT '[15]',
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        default_calendar TEXT,
        default_calendar_integration_id INTEGER,
        default_meeting_duration INTEGER DEFAULT 30,
        show_declined_events BOOLEAN DEFAULT FALSE,
        combined_view BOOLEAN DEFAULT TRUE,
        working_hours JSONB DEFAULT '{"0":{"enabled":false,"start":"09:00","end":"17:00"},"1":{"enabled":true,"start":"09:00","end":"17:00"},"2":{"enabled":true,"start":"09:00","end":"17:00"},"3":{"enabled":true,"start":"09:00","end":"17:00"},"4":{"enabled":true,"start":"09:00","end":"17:00"},"5":{"enabled":true,"start":"09:00","end":"17:00"},"6":{"enabled":false,"start":"09:00","end":"17:00"}}',
        time_format TEXT DEFAULT '12h',
        time_blocks JSONB DEFAULT '[]'
      );
    `);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Initialize default data in the database
async function initDefaultData(): Promise<void> {
  try {
    // Check for existing organization and team first
    const existingOrgs = await db.select()
      .from(organizations)
      .where(sql`name = 'Default Organization'`)
      .limit(1);
    
    let organizationId: number;
    let teamId: number;
    
    if (existingOrgs.length > 0) {
      // Organization exists
      organizationId = existingOrgs[0].id;
      
      // Find associated team
      const existingTeams = await db.select()
        .from(teams)
        .where(sql`organization_id = ${organizationId}`)
        .limit(1);
      
      if (existingTeams.length > 0) {
        teamId = existingTeams[0].id;
      } else {
        // Create team for existing org
        const teamResult = await db.insert(teams)
          .values({
            name: 'Default Team',
            organizationId,
            description: 'Default team created during initialization',
          })
          .returning();
        
        teamId = teamResult[0].id;
      }
    } else {
      console.log('🏢 Creating default organization and team...');
      
      // Create default organization
      const orgResult = await db.insert(organizations)
        .values({
          name: 'Default Organization',
          description: 'Default organization created during initialization',
        })
        .returning();
      
      organizationId = orgResult[0].id;
      
      // Create default team
      const teamResult = await db.insert(teams)
        .values({
          name: 'Default Team',
          organizationId,
          description: 'Default team created during initialization',
        })
        .returning();
      
      teamId = teamResult[0].id;
    }
    
    // Check if we already have an admin user
    const existingAdmin = await db.select()
      .from(users)
      .where(sql`role = ${UserRole.ADMIN}`)
      .limit(1);
    
    // Default settings for users
    const defaultWorkingHours = {
      0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
      1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
      2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
      3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
      4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
      5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
      6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
    };
    
    // SECURITY: Only create demo accounts in development mode
    // In production, admins should be created manually or through a secure setup process
    const demoAccounts = process.env.NODE_ENV !== 'production' ? [
      {
        username: 'admin',
        password: 'adminpass',
        email: 'admin@example.com',
        displayName: 'Administrator',
        role: UserRole.ADMIN
      },
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
    ] : []; // No demo accounts in production

    if (demoAccounts.length === 0) {
      console.log('⚠️ Production mode: Skipping demo account creation');
      console.log('⚠️ Create admin users manually through registration or database scripts');
    }

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
            workingHours: defaultWorkingHours,
            timeFormat: '12h',
            timeBlocks: []
          });
        
        console.log(`✅ Created ${account.role} user: ${account.username}`);
      } else if (account.username === 'admin') {
        // Update admin password if it exists but with wrong password
        const passwordHash = await hash(account.password);
        await db.update(users)
          .set({ password: passwordHash })
          .where(sql`id = ${existingUser[0].id}`);
        console.log('✅ Updated admin password');
      }
    }
    
    console.log('✅ Demo accounts setup complete');
  } catch (error) {
    console.error('❌ Error initializing default data:', error);
    // Don't throw the error, as this shouldn't prevent the app from starting
    console.log('⚠️ Continuing without default data initialization');
  }
}