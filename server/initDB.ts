import { db, pool } from './db';
import { sql } from 'drizzle-orm';
import { 
  users, UserRole,
  organizations,
  teams,
  settings
} from '@shared/schema';
import * as crypto from 'crypto';

// Password hashing function
async function hash(password: string): Promise<string> {
  // Simple hash function for demonstration purposes
  // In production, use a more secure method with salt
  return crypto.createHash('sha256').update(password).digest('hex');
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
        metadata JSONB DEFAULT '{}'
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
        assignment_method TEXT,
        availability JSONB DEFAULT '{}',
        buffer_before INTEGER DEFAULT 0,
        buffer_after INTEGER DEFAULT 0,
        verification_method TEXT,
        reminder_settings JSONB DEFAULT '{}',
        max_bookings_per_day INTEGER,
        lead_time INTEGER
      );

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
        time_format TEXT DEFAULT '12h'
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
    // Check if we already have an admin user
    const existingAdmin = await db.select()
      .from(users)
      .where(sql`role = ${UserRole.ADMIN}`)
      .limit(1);
    
    // Create default admin user if none exists
    if (existingAdmin.length === 0) {
      console.log('👨‍💼 Creating default admin user...');
      
      // Create default organization
      const orgResult = await db.insert(organizations)
        .values({
          name: 'Default Organization',
          description: 'Default organization created during initialization',
        })
        .returning();
      
      const organizationId = orgResult[0].id;
      
      // Create default team
      const teamResult = await db.insert(teams)
        .values({
          name: 'Default Team',
          organizationId,
          description: 'Default team created during initialization',
        })
        .returning();
      
      const teamId = teamResult[0].id;
      
      // Create admin user
      const passwordHash = await hash('admin');
      const adminResult = await db.insert(users)
        .values({
          username: 'admin',
          password: passwordHash,
          email: 'admin@example.com',
          emailVerified: true,
          displayName: 'Administrator',
          role: UserRole.ADMIN,
          organizationId,
          teamId,
        })
        .returning();
      
      const adminId = adminResult[0].id;
      
      // Create default settings for admin
      await db.insert(settings)
        .values({
          userId: adminId,
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
      
      console.log('✅ Default admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing default data:', error);
    // Don't throw the error, as this shouldn't prevent the app from starting
    console.log('⚠️ Continuing without default data initialization');
  }
}