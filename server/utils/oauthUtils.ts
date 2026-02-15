import { google } from 'googleapis';
import axios from 'axios';
import { IStorage } from '../storage';

// Helper function for OAuth debugging logs
function logOAuth(source: string, message: string, data?: any) {
  console.log(`[OAuth:${source}] ${message}`, data || '');
}

// Function to get environment variables (allows for dynamic updates)
function getEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

// Function to get the base URL - will be re-evaluated each time
function getBaseUrl(): string {
  const customUrl = getEnvVar('BASE_URL');
  if (customUrl) {
    logOAuth('Config', 'Using custom BASE_URL:', customUrl);
    return customUrl;
  }
  
  // Fall back to Replit environment
  if (getEnvVar('REPL_SLUG') && getEnvVar('REPL_OWNER')) {
    const replitUrl = `https://${getEnvVar('REPL_SLUG')}.${getEnvVar('REPL_OWNER')}.replit.app`;
    logOAuth('Config', 'Using Replit URL:', replitUrl);
    return replitUrl;
  }
  
  // Default to localhost
  logOAuth('Config', 'Using localhost URL');
  return 'http://localhost:5000';
}

// Log current configuration
const baseUrl = getBaseUrl();
logOAuth('Config', 'BASE_URL configured as', baseUrl);

// Google OAuth configuration
function getGoogleRedirectUri(): string {
  return `${getBaseUrl()}/api/integrations/google/callback`;
}

// Microsoft OAuth configuration
function getOutlookRedirectUri(): string {
  return `${getBaseUrl()}/api/integrations/outlook/callback`;
}

// Apple OAuth configuration
function getAppleRedirectUri(): string {
  return `${getBaseUrl()}/api/integrations/icloud/callback`;
}

// Scopes for Google Calendar
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'profile',
  'email'
];

// Scopes for Outlook Calendar
const OUTLOOK_SCOPES = [
  'offline_access',
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite'
];

// Scopes for Apple Sign In
// Note: Apple uses a different model - Sign in with Apple is for authentication
// Calendar access requires CalDAV protocol with app-specific passwords
const APPLE_SCOPES = [
  'name',
  'email'
];

/**
 * Creates a Google OAuth2 client
 */
export function createGoogleOAuth2Client() {
  const googleClientId = getEnvVar('GOOGLE_CLIENT_ID');
  const googleClientSecret = getEnvVar('GOOGLE_CLIENT_SECRET');
  const redirectUri = getGoogleRedirectUri();
  
  logOAuth('Google', 'Creating OAuth2 client with', { 
    clientId: googleClientId,
    clientSecret: googleClientSecret ? '(Secret provided)' : '(No secret)',
    redirectUri 
  });
  
  return new google.auth.OAuth2(
    googleClientId,
    googleClientSecret,
    redirectUri
  );
}

/**
 * Generates a URL for Google OAuth authentication
 * @param customName Optional custom name for the calendar
 */
export function generateGoogleAuthUrl(customName?: string) {
  const oauth2Client = createGoogleOAuth2Client();
  
  const state = customName ? JSON.stringify({ name: customName }) : '';
  
  const redirectUri = getGoogleRedirectUri();
  const googleClientId = getEnvVar('GOOGLE_CLIENT_ID');
  const googleClientSecret = getEnvVar('GOOGLE_CLIENT_SECRET');
  
  logOAuth('Google', 'Redirect URI', redirectUri);
  logOAuth('Google', 'Client ID available', !!googleClientId);
  logOAuth('Google', 'Client Secret available', !!googleClientSecret);
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
    state
  });
  
  logOAuth('Google', 'Generated Auth URL', authUrl);
  return authUrl;
}

/**
 * Exchanges an OAuth code for Google access and refresh tokens
 * @param code The authorization code
 */
export async function getGoogleTokens(code: string) {
  logOAuth('Google', 'Exchanging authorization code for tokens');
  
  try {
    const oauth2Client = createGoogleOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    logOAuth('Google', 'Successfully obtained tokens');
    return tokens;
  } catch (error: any) {
    logOAuth('Google', 'Error exchanging authorization code for tokens', error);
    
    // Additional logging for Axios errors
    if (error.response) {
      logOAuth('Google', 'OAuth error response', { 
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
}

/**
 * Refreshes Google access token using refresh token
 * @param refreshToken The refresh token
 */
export async function refreshGoogleAccessToken(refreshToken: string) {
  logOAuth('Google', 'Refreshing access token');
  try {
    const oauth2Client = createGoogleOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    logOAuth('Google', 'Successfully refreshed access token');
    return credentials;
  } catch (error: any) {
    logOAuth('Google', 'Error refreshing access token', error);
    
    // Additional logging if error contains response
    if (error.response) {
      logOAuth('Google', 'Token refresh error response', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
}

/**
 * Generates a URL for Microsoft Outlook OAuth authentication
 * @param customName Optional custom name for the calendar
 */
export function generateOutlookAuthUrl(customName?: string) {
  const state = customName ? encodeURIComponent(JSON.stringify({ name: customName })) : '';
  
  const redirectUri = getOutlookRedirectUri();
  const outlookClientId = getEnvVar('OUTLOOK_CLIENT_ID');
  const outlookClientSecret = getEnvVar('OUTLOOK_CLIENT_SECRET');
  
  logOAuth('Outlook', 'Redirect URI', redirectUri);
  logOAuth('Outlook', 'Client ID available', !!outlookClientId);
  logOAuth('Outlook', 'Client Secret available', !!outlookClientSecret);
  
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.append('client_id', outlookClientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', OUTLOOK_SCOPES.join(' '));
  authUrl.searchParams.append('response_mode', 'query');
  
  if (state) {
    authUrl.searchParams.append('state', state);
  }
  
  return authUrl.toString();
}

/**
 * Exchanges an OAuth code for Microsoft Outlook access and refresh tokens
 * @param code The authorization code
 */
export async function getOutlookTokens(code: string) {
  logOAuth('Outlook', 'Exchanging authorization code for tokens');
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const redirectUri = getOutlookRedirectUri();
  const outlookClientId = getEnvVar('OUTLOOK_CLIENT_ID');
  const outlookClientSecret = getEnvVar('OUTLOOK_CLIENT_SECRET');
  
  const params = new URLSearchParams();
  params.append('client_id', outlookClientId);
  params.append('client_secret', outlookClientSecret);
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  
  logOAuth('Outlook', 'Using redirect URI', redirectUri);
  
  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    logOAuth('Outlook', 'Successfully obtained tokens');
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
  } catch (error: any) {
    logOAuth('Outlook', 'Error getting tokens', error);
    
    // Additional logging for axios errors
    if (error.response) {
      logOAuth('Outlook', 'OAuth error response', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
}

/**
 * Refreshes Microsoft Outlook access token using refresh token
 * @param refreshToken The refresh token
 */
export async function refreshOutlookAccessToken(refreshToken: string) {
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const outlookClientId = getEnvVar('OUTLOOK_CLIENT_ID');
  const outlookClientSecret = getEnvVar('OUTLOOK_CLIENT_SECRET');
  
  const params = new URLSearchParams();
  params.append('client_id', outlookClientId);
  params.append('client_secret', outlookClientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');
  
  logOAuth('Outlook', 'Refreshing token');
  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    logOAuth('Outlook', 'Successfully refreshed token');
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || refreshToken, // Some services don't return a new refresh token
      expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
  } catch (error: any) {
    logOAuth('Outlook', 'Error refreshing token', error);

    // Additional logging for axios errors
    if (error.response) {
      logOAuth('Outlook', 'Token refresh error response', {
        status: error.response.status,
        data: error.response.data
      });
    }

    throw error;
  }
}

/**
 * Generates a URL for Apple Sign In OAuth authentication
 * Note: This requires Apple Developer account setup with Service ID, Team ID, and Key ID
 * @param customName Optional custom name for the calendar
 */
export function generateAppleAuthUrl(customName?: string) {
  const state = customName ? encodeURIComponent(JSON.stringify({ name: customName })) : Date.now().toString();

  const redirectUri = getAppleRedirectUri();
  const appleClientId = getEnvVar('APPLE_CLIENT_ID'); // This is the Service ID
  const appleTeamId = getEnvVar('APPLE_TEAM_ID');

  logOAuth('Apple', 'Redirect URI', redirectUri);
  logOAuth('Apple', 'Client ID (Service ID) available', !!appleClientId);
  logOAuth('Apple', 'Team ID available', !!appleTeamId);

  const authUrl = new URL('https://appleid.apple.com/auth/authorize');
  authUrl.searchParams.append('client_id', appleClientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('response_mode', 'form_post'); // Apple requires form_post
  authUrl.searchParams.append('scope', APPLE_SCOPES.join(' '));
  authUrl.searchParams.append('state', state);

  logOAuth('Apple', 'Generated Auth URL', authUrl.toString());
  return authUrl.toString();
}

/**
 * Exchanges an OAuth code for Apple access tokens
 * Note: Apple uses JWT-based authentication with private keys
 * @param code The authorization code
 */
export async function getAppleTokens(code: string) {
  logOAuth('Apple', 'Exchanging authorization code for tokens');

  const appleClientId = getEnvVar('APPLE_CLIENT_ID');
  const appleTeamId = getEnvVar('APPLE_TEAM_ID');
  const appleKeyId = getEnvVar('APPLE_KEY_ID');
  const applePrivateKey = getEnvVar('APPLE_PRIVATE_KEY');

  if (!appleClientId || !appleTeamId || !appleKeyId || !applePrivateKey) {
    throw new Error('Apple OAuth is not configured. Please set APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY environment variables.');
  }

  // Apple requires a client_secret which is a JWT signed with the private key
  // For now, we'll throw an error indicating this needs proper implementation
  logOAuth('Apple', 'Warning: Apple OAuth requires JWT-based client_secret generation');

  throw new Error('Apple OAuth integration requires additional setup with JWT client_secret. Please use CalDAV with app-specific passwords instead.');
}

/**
 * Refreshes Apple access token using refresh token
 * Note: Apple OAuth flow is different and may not provide refresh tokens in the same way
 * @param refreshToken The refresh token
 */
export async function refreshAppleAccessToken(refreshToken: string) {
  logOAuth('Apple', 'Apple OAuth does not support refresh tokens in the traditional sense');

  throw new Error('Apple OAuth refresh not implemented. Please re-authenticate or use CalDAV with app-specific passwords.');
}

// Zoom OAuth configuration
function getZoomRedirectUri(): string {
  return `${getBaseUrl()}/api/integrations/zoom/callback`;
}

const ZOOM_SCOPES = [
  'meeting:write',
  'user:read'
];

export function generateZoomAuthUrl(customName?: string): string {
  const zoomClientId = getEnvVar('ZOOM_CLIENT_ID') || getEnvVar('ZOOM_API_KEY');

  logOAuth('Zoom', 'Client ID available', !!zoomClientId);

  if (!zoomClientId) {
    throw new Error('Zoom OAuth is not configured. Please set ZOOM_CLIENT_ID environment variable.');
  }

  const redirectUri = getZoomRedirectUri();
  logOAuth('Zoom', 'Redirect URI', redirectUri);

  const state = customName ? encodeURIComponent(JSON.stringify({ name: customName })) : '';

  const authUrl = new URL('https://zoom.us/oauth/authorize');
  authUrl.searchParams.append('client_id', zoomClientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);

  if (state) {
    authUrl.searchParams.append('state', state);
  }

  logOAuth('Zoom', 'Generated Auth URL', authUrl.toString());
  return authUrl.toString();
}

export async function getZoomTokens(code: string) {
  logOAuth('Zoom', 'Exchanging authorization code for tokens');

  const zoomClientId = getEnvVar('ZOOM_CLIENT_ID') || getEnvVar('ZOOM_API_KEY');
  const zoomClientSecret = getEnvVar('ZOOM_CLIENT_SECRET') || getEnvVar('ZOOM_API_SECRET');
  const redirectUri = getZoomRedirectUri();

  if (!zoomClientId || !zoomClientSecret) {
    throw new Error('Zoom OAuth is not configured. Please set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET environment variables.');
  }

  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${zoomClientId}:${zoomClientSecret}`).toString('base64')}`
        }
      }
    );

    logOAuth('Zoom', 'Successfully obtained tokens');
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
  } catch (error: any) {
    logOAuth('Zoom', 'Error getting tokens', error);
    if (error.response) {
      logOAuth('Zoom', 'OAuth error response', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
}

export async function refreshZoomAccessToken(refreshToken: string) {
  logOAuth('Zoom', 'Refreshing access token');

  const zoomClientId = getEnvVar('ZOOM_CLIENT_ID') || getEnvVar('ZOOM_API_KEY');
  const zoomClientSecret = getEnvVar('ZOOM_CLIENT_SECRET') || getEnvVar('ZOOM_API_SECRET');

  if (!zoomClientId || !zoomClientSecret) {
    throw new Error('Zoom OAuth is not configured.');
  }

  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${zoomClientId}:${zoomClientSecret}`).toString('base64')}`
        }
      }
    );

    logOAuth('Zoom', 'Successfully refreshed access token');
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || refreshToken,
      expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
  } catch (error: any) {
    logOAuth('Zoom', 'Error refreshing token', error);
    if (error.response) {
      logOAuth('Zoom', 'Token refresh error response', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
}

/**
 * Helper function to configure CalDAV access for iCloud Calendar
 * This is the recommended approach for iCloud Calendar integration
 * @param appleId User's Apple ID email
 * @param appSpecificPassword App-specific password generated from appleid.apple.com
 */
export function createCalDAVConfig(appleId: string, appSpecificPassword: string) {
  return {
    serverUrl: 'https://caldav.icloud.com',
    username: appleId,
    password: appSpecificPassword,
    principalUrl: `https://caldav.icloud.com/${appleId.split('@')[0]}/principal/`,
    calendarHomeUrl: `https://caldav.icloud.com/${appleId.split('@')[0]}/calendars/`
  };
}