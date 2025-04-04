// reset-database.js
// Script to completely reset the database and rebuild it from scratch
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function resetDatabase() {
  console.log('----------------------------------------');
  console.log('⚠️ DATABASE RESET SCRIPT');
  console.log('----------------------------------------');
  console.log('This script will DROP ALL TABLES and rebuild the database');
  console.log('');
  
  try {
    // Database connection
    console.log('Connecting to database...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Connect to database
    const client = await pool.connect();
    console.log('Database connection established!');
    
    // 1. Drop all tables
    console.log('\n1. Dropping all tables...');
    await client.query(`
      DROP TABLE IF EXISTS settings CASCADE;
      DROP TABLE IF EXISTS bookings CASCADE;
      DROP TABLE IF EXISTS booking_links CASCADE;
      DROP TABLE IF EXISTS events CASCADE;
      DROP TABLE IF EXISTS calendar_integrations CASCADE;
      DROP TABLE IF EXISTS teams CASCADE;
      DROP TABLE IF EXISTS organizations CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS session CASCADE;
    `);
    console.log('✅ All tables dropped successfully');
    
    // 2. Create new tables
    console.log('\n2. Creating new tables...');
    await client.query(`
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
        availability JSONB DEFAULT '{"window": 30, "days": ["1", "2", "3", "4", "5"], "hours": {"start": "09:00", "end": "17:00"}}',
        buffer_before INTEGER DEFAULT 0,
        buffer_after INTEGER DEFAULT 0,
        max_bookings_per_day INTEGER DEFAULT 0,
        lead_time INTEGER DEFAULT 60
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

      -- Session table for storing session data
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    `);
    console.log('✅ All tables created successfully');
    
    // 3. Add default organization
    console.log('\n3. Creating default organization...');
    const orgResult = await client.query(`
      INSERT INTO organizations (name, description)
      VALUES ('Default Organization', 'Default organization created during reset')
      RETURNING id;
    `);
    
    const organizationId = orgResult.rows[0].id;
    console.log(`✅ Created default organization with ID: ${organizationId}`);
    
    // 4. Add default team
    console.log('\n4. Creating default team...');
    const teamResult = await client.query(`
      INSERT INTO teams (name, description, organization_id)
      VALUES ('Default Team', 'Default team created during reset', $1)
      RETURNING id;
    `, [organizationId]);
    
    const teamId = teamResult.rows[0].id;
    console.log(`✅ Created default team with ID: ${teamId}`);
    
    // 5. Add default users
    console.log('\n5. Creating default users...');
    
    // Create admin user hash
    const adminPassword = await hashPassword('adminpass');
    const companyAdminPassword = await hashPassword('companypass');
    const teamManagerPassword = await hashPassword('teampass');
    const userPassword = await hashPassword('password');
    
    // Insert admin user
    const adminResult = await client.query(`
      INSERT INTO users (username, password, email, email_verified, display_name, role, organization_id, team_id)
      VALUES ('admin', $1, 'admin@example.com', TRUE, 'Administrator', 'admin', $2, $3)
      RETURNING id;
    `, [adminPassword, organizationId, teamId]);
    
    console.log(`✅ Created admin user with ID: ${adminResult.rows[0].id}`);
    
    // Insert company admin
    const companyAdminResult = await client.query(`
      INSERT INTO users (username, password, email, email_verified, display_name, role, organization_id, team_id)
      VALUES ('companyadmin', $1, 'companyadmin@example.com', TRUE, 'Company Admin', 'company_admin', $2, $3)
      RETURNING id;
    `, [companyAdminPassword, organizationId, teamId]);
    
    console.log(`✅ Created company_admin user with ID: ${companyAdminResult.rows[0].id}`);
    
    // Insert team manager
    const teamManagerResult = await client.query(`
      INSERT INTO users (username, password, email, email_verified, display_name, role, organization_id, team_id)
      VALUES ('teammanager', $1, 'teammanager@example.com', TRUE, 'Team Manager', 'team_manager', $2, $3)
      RETURNING id;
    `, [teamManagerPassword, organizationId, teamId]);
    
    console.log(`✅ Created team_manager user with ID: ${teamManagerResult.rows[0].id}`);
    
    // Insert regular user
    const userResult = await client.query(`
      INSERT INTO users (username, password, email, email_verified, display_name, role, organization_id, team_id)
      VALUES ('testuser', $1, 'testuser@example.com', TRUE, 'Test User', 'user', $2, $3)
      RETURNING id;
    `, [userPassword, organizationId, teamId]);
    
    console.log(`✅ Created regular user with ID: ${userResult.rows[0].id}`);
    
    // 6. Add settings for each user
    console.log('\n6. Creating default settings for users...');
    
    // Default working hours JSON
    const workingHoursJson = JSON.stringify({
      0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
      1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
      2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
      3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
      4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
      5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
      6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
    });
    
    // Create settings for admin
    await client.query(`
      INSERT INTO settings (user_id, default_reminders, email_notifications, working_hours)
      VALUES ($1, '[15]', TRUE, $2);
    `, [adminResult.rows[0].id, workingHoursJson]);
    
    // Create settings for company admin
    await client.query(`
      INSERT INTO settings (user_id, default_reminders, email_notifications, working_hours)
      VALUES ($1, '[15]', TRUE, $2);
    `, [companyAdminResult.rows[0].id, workingHoursJson]);
    
    // Create settings for team manager
    await client.query(`
      INSERT INTO settings (user_id, default_reminders, email_notifications, working_hours)
      VALUES ($1, '[15]', TRUE, $2);
    `, [teamManagerResult.rows[0].id, workingHoursJson]);
    
    // Create settings for regular user
    await client.query(`
      INSERT INTO settings (user_id, default_reminders, email_notifications, working_hours)
      VALUES ($1, '[15]', TRUE, $2);
    `, [userResult.rows[0].id, workingHoursJson]);
    
    console.log('✅ Created settings for all users');
    
    // 7. Verify the reset
    console.log('\n7. Verifying database reset...');
    
    // Check users
    const usersCheck = await client.query('SELECT id, username, role FROM users ORDER BY id');
    console.log('Users created:');
    usersCheck.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    // Release client
    client.release();
    
    console.log('\n----------------------------------------');
    console.log('✅ DATABASE RESET COMPLETE');
    console.log('----------------------------------------');
    console.log('Your database has been reset with fresh tables and demo data.');
    console.log('You can now log in with these credentials:');
    console.log('');
    console.log('Admin:');
    console.log('  Username: admin');
    console.log('  Password: adminpass');
    console.log('');
    console.log('Company Admin:');
    console.log('  Username: companyadmin');
    console.log('  Password: companypass');
    console.log('');
    console.log('Team Manager:');
    console.log('  Username: teammanager');
    console.log('  Password: teampass');
    console.log('');
    console.log('Regular User:');
    console.log('  Username: testuser');
    console.log('  Password: password');
    console.log('');
    console.log('Please restart your application to apply these changes.');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  }
}

// Simple password hashing function
async function hashPassword(password) {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Run the reset function
resetDatabase();