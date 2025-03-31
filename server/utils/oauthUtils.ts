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

/**
 * Creates a Google OAuth2 client
 */
export function createGoogleOAuth2Client() {
  const googleClientId = getEnvVar('GOOGLE_CLIENT_ID');
  const googleClientSecret = getEnvVar('GOOGLE_CLIENT_SECRET');
  const redirectUri = getGoogleRedirectUri();
  
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
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
    state
  });
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