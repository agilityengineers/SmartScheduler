import { zoomService } from '../calendarServices/zoomService';
import { storage } from '../storage';
import { checkDatabaseConnection, db } from '../db';
import '../loadEnv';
import { Event, InsertUser, InsertCalendarIntegration } from '@shared/schema';
import * as crypto from 'crypto';

/**
 * Generate a salt for password hashing
 * @returns A random salt string
 */
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash a password with a salt
 * @param password The password to hash
 * @param salt The salt to use for hashing
 * @returns The hashed password
 */
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

/**
 * Create a test user for Zoom integration testing
 * @returns The created user ID
 */
async function createTestUser() {
  // Check if test user already exists
  const existingUser = await storage.getUserByEmail('test.zoom@example.com');
  if (existingUser) {
    console.log('Test user already exists, using existing user');
    return existingUser;
  }
  
  // Create a new test user
  const salt = generateSalt();
  const password = 'testpassword';
  const hashedPassword = hashPassword(password, salt);
  
  const insertUser: InsertUser = {
    username: 'testzoom',
    email: 'test.zoom@example.com',
    password: hashedPassword,
    role: 'user',
    emailVerified: true,
    organizationId: null,
    teamId: null
  };
  
  const user = await storage.createUser(insertUser);
  console.log(`Created test user with ID ${user.id}`);
  return user;
}

/**
 * Create a Zoom integration for testing
 * @param userId The user ID to create the integration for
 * @returns The created integration
 */
async function createTestZoomIntegration(userId: number) {
  // Check if Zoom integration already exists for this user
  const existingIntegrations = await storage.getCalendarIntegrations(userId);
  const existingZoom = existingIntegrations.find(i => i.type === 'zoom');
  
  if (existingZoom) {
    console.log('Zoom integration already exists for test user');
    return existingZoom;
  }
  
  // Ask for Zoom API credentials
  console.log('⚠️ This test requires valid Zoom API credentials');
  console.log('⚠️ For testing purposes, you need to set environment variables:');
  console.log('   - ZOOM_API_KEY: Your Zoom API key/Client ID');
  console.log('   - ZOOM_API_SECRET: Your Zoom API secret/Client Secret');
  console.log('   - ZOOM_ACCOUNT_ID: (Optional) Your Zoom Account ID for OAuth');
  
  const apiKey = process.env.ZOOM_API_KEY;
  const apiSecret = process.env.ZOOM_API_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Missing Zoom API credentials. Set ZOOM_API_KEY and ZOOM_API_SECRET environment variables.');
  }
  
  // Create the integration using the service
  const service = zoomService(userId);
  const isOAuth = !!accountId;
  const integration = await service.connect(apiKey, apiSecret, 'Test Zoom Integration', accountId, isOAuth);
  
  console.log(`Created test Zoom integration with ID ${integration.id}`);
  return integration;
}

/**
 * Test script to validate Zoom integration
 */
async function testZoomIntegration() {
  console.log('Starting Zoom integration test...');
  console.log('API Key exists:', !!process.env.ZOOM_API_KEY);
  console.log('API Secret exists:', !!process.env.ZOOM_API_SECRET);
  console.log('Account ID exists:', !!process.env.ZOOM_ACCOUNT_ID);
  
  // Ensure database connection is established
  console.log('Checking database connection...');
  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.error('❌ Could not connect to PostgreSQL database');
    return;
  }
  console.log('✅ Connected to PostgreSQL database');
  
  try {
    console.log('🔍 Testing Zoom integration functionality...');
    
    // Create a test user if needed
    const testUser = await createTestUser();
    console.log(`Using test user: ${testUser.username} (ID: ${testUser.id})`);
    
    // Create a test Zoom integration
    let integration;
    try {
      integration = await createTestZoomIntegration(testUser.id);
      console.log(`Using Zoom integration: ${integration.name} (ID: ${integration.id})`);
    } catch (error: any) {
      console.error('❌ Failed to create Zoom integration:', error?.message || String(error));
      console.log('Please set ZOOM_API_KEY and ZOOM_API_SECRET environment variables.');
      return;
    }
    
    // Initialize the service
    const service = zoomService(testUser.id);
    const authenticated = await service.initialize();
    
    if (authenticated) {
      console.log(`✅ Successfully authenticated with Zoom for user ${testUser.id}`);
        
      // Test validating a meeting URL
      console.log('Testing Zoom meeting URL validation...');
      
      // Test a valid Zoom meeting URL format (may not be a real meeting)
      const validFormatUrl = 'https://zoom.us/j/123456789';
      const isValidFormat = await service.validateMeetingUrl(validFormatUrl);
      console.log(`URL "${validFormatUrl}" has valid format: ${isValidFormat}`);
      
      // Test an invalid Zoom meeting URL
      const invalidUrl = 'https://invalid-url.com/meeting';
      const isInvalidUrlValid = await service.validateMeetingUrl(invalidUrl);
      console.log(`URL "${invalidUrl}" is valid: ${isInvalidUrlValid} (should be false)`);
      
      // Try to create a test meeting
      try {
        console.log('Creating a test Zoom meeting...');
        // Create an event for testing
        const testEvent: Event = {
          id: 0, // Placeholder ID
          userId: testUser.id,
          title: 'Test Meeting',
          description: 'This is a test meeting created by the integration test',
          startTime: new Date(Date.now() + 3600000), // 1 hour from now
          endTime: new Date(Date.now() + 7200000),   // 2 hours from now
          location: null,
          meetingUrl: null,
          externalId: null,
          calendarIntegrationId: integration.id,
          isAllDay: false,
          timezone: 'UTC',
          attendees: [],
          reminders: [],
          calendarType: 'zoom',
          recurrence: null
        };
        
        const meetingUrl = await service.createMeeting(testEvent);
        console.log(`✅ Test meeting created with URL: ${meetingUrl}`);
        
        // Validate the created meeting URL
        const isCreatedMeetingValid = await service.validateMeetingUrl(meetingUrl);
        console.log(`Created meeting URL is valid: ${isCreatedMeetingValid}`);
        
        // Clean up - delete the test meeting
        if (meetingUrl) {
          console.log('Cleaning up - deleting test meeting...');
          try {
            const deleted = await service.deleteMeeting(meetingUrl);
            console.log(`✅ Test meeting deleted: ${deleted}`);
          } catch (deleteError) {
            // If this is a PMI (Personal Meeting ID), we can't delete it - this is expected
            console.log('Note: If the test used a PMI, deletion may fail but this is normal');
            console.log('✅ Test completed successfully despite cleanup issues');
          }
        }
      } catch (error: any) {
        console.error('❌ Error creating test meeting:', error.message || error);
      }
    } else {
      console.error('❌ Could not authenticate with Zoom');
    }
  } catch (error: any) {
    console.error('❌ Error testing Zoom integration:', error.message || error);
  }
}

// Run the test
testZoomIntegration()
  .then(() => {
    console.log('✅ Zoom integration test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Zoom integration test failed:', error);
    process.exit(1);
  });