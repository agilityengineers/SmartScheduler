import '../loadEnv';

// Print out the Zoom environment variables
console.log('=== Zoom API Credentials ===');
console.log('API Key exists:', !!process.env.ZOOM_API_KEY);
console.log('API Secret exists:', !!process.env.ZOOM_API_SECRET);
console.log('Account ID exists:', !!process.env.ZOOM_ACCOUNT_ID);

const apiKey = process.env.ZOOM_API_KEY;
const apiSecret = process.env.ZOOM_API_SECRET;

// Try a simple API call
import axios from 'axios';

async function getZoomToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  if (!apiKey || !apiSecret || !accountId) {
    throw new Error('Missing required Zoom credentials');
  }

  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'account_credentials',
          account_id: accountId
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error('OAuth response did not contain access_token');
    }
  } catch (error) {
    console.error('Failed to get Zoom token:', error);
    throw error;
  }
}

async function createZoomMeeting(token: string) {
  try {
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: 'Test Meeting from Direct API Call',
        type: 2, // Scheduled meeting
        start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        duration: 60, // 60 minutes
        timezone: 'UTC',
        agenda: 'This is a test meeting created directly via the Zoom API',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          auto_recording: 'none'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Meeting created:', {
      id: response.data.id,
      join_url: response.data.join_url,
      start_url: response.data.start_url
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to create meeting:', error);
    throw error;
  }
}

async function testZoomAPI() {
  try {
    console.log('\n=== Testing Zoom API ===');
    
    // Get token
    console.log('Getting OAuth token...');
    const token = await getZoomToken();
    console.log('✅ OAuth token obtained:', token.substring(0, 20) + '...');
    
    // Create a meeting
    console.log('\nCreating a test meeting...');
    const meeting = await createZoomMeeting(token);
    console.log('\n✅ Meeting creation successful! Join URL:', meeting.join_url);
    
    // Try to list all meetings
    try {
      console.log('\nListing user meetings...');
      const listResponse = await axios.get(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Successfully retrieved ${listResponse.data.meetings.length} meetings`);
      console.log('Sample meeting:', listResponse.data.meetings[0]);
    } catch (error) {
      console.error('❌ Failed to list meetings:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testZoomAPI().then(() => {
  console.log('\n=== Test completed ===');
}).catch(error => {
  console.error('Test failed with uncaught error:', error);
});