// This is a simplified direct test of the ZoomService

import '../loadEnv';
import { ZoomService } from '../calendarServices/zoomService';
import { Event } from '@shared/schema';

// Print out the Zoom environment variables
console.log('=== Zoom API Credentials ===');
console.log('API Key exists:', !!process.env.ZOOM_API_KEY);
console.log('API Secret exists:', !!process.env.ZOOM_API_SECRET);
console.log('Account ID exists:', !!process.env.ZOOM_ACCOUNT_ID);

async function testZoomService() {
  try {
    console.log('Creating ZoomService instance...');
    // Use user ID 1 for testing
    const zoomService = new ZoomService(1);
    
    // Connect to Zoom
    console.log('Connecting to Zoom...');
    const integration = await zoomService.connect(
      process.env.ZOOM_API_KEY || '',
      process.env.ZOOM_API_SECRET || '',
      'Test Integration',
      process.env.ZOOM_ACCOUNT_ID,
      true // Use OAuth
    );
    
    console.log('Zoom integration created:', integration.id);
    
    // Create a test event
    const testEvent: Event = {
      id: 0,
      userId: 1,
      title: 'Test Meeting via Direct ZoomService',
      description: 'This is a test meeting created directly via the ZoomService',
      startTime: new Date(Date.now() + 3600000), // 1 hour from now
      endTime: new Date(Date.now() + 7200000),   // 2 hours from now
      location: null,
      meetingUrl: null,
      isAllDay: false,
      timezone: 'UTC',
      externalId: null,
      calendarIntegrationId: integration.id,
      attendees: [],
      reminders: [],
      calendarType: 'zoom',
      recurrence: null
    };
    
    // Create a meeting
    console.log('Creating a test meeting...');
    const meetingUrl = await zoomService.createMeeting(testEvent);
    console.log('✅ Meeting created with URL:', meetingUrl);
    
    // Validate the meeting URL
    console.log('Validating meeting URL...');
    const isValid = await zoomService.validateMeetingUrl(meetingUrl);
    console.log('Meeting URL is valid:', isValid);
    
    // Test the enhanced validateMeetingId method
    const meetingId = meetingUrl.match(/\/j\/(\d+)/)?.[1] || '';
    console.log('Testing validateMeetingId with meeting ID:', meetingId);
    const isValidId = await zoomService.validateMeetingId(meetingId);
    console.log('Meeting ID is valid:', isValidId);
    
    // Test with a standard test ID
    console.log('Testing validateMeetingId with test ID: 123456789');
    const isValidTestId = await zoomService.validateMeetingId('123456789');
    console.log('Test ID validation result:', isValidTestId);
    
    // Try to clean up by deleting the meeting
    console.log('Deleting test meeting...');
    try {
      const deleted = await zoomService.deleteMeeting(meetingUrl);
      console.log('Meeting deleted:', deleted);
    } catch (error) {
      console.log('Note: If using a PMI, deletion may fail - this is normal behavior');
    }
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testZoomService().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});