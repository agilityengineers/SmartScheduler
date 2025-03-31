import { google } from 'googleapis';
import axios from 'axios';
import { IStorage } from '../storage';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const GOOGLE_REDIRECT_URI = `${BASE_URL}/api/auth/google/callback`;

// Microsoft OAuth configuration
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const OUTLOOK_REDIRECT_URI = `${BASE_URL}/api/auth/outlook/callback`;

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
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generates a URL for Google OAuth authentication
 * @param customName Optional custom name for the calendar
 */
export function generateGoogleAuthUrl(customName?: string) {
  const oauth2Client = createGoogleOAuth2Client();
  
  const state = customName ? JSON.stringify({ name: customName }) : '';
  
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
  const oauth2Client = createGoogleOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Refreshes Google access token using refresh token
 * @param refreshToken The refresh token
 */
export async function refreshGoogleAccessToken(refreshToken: string) {
  const oauth2Client = createGoogleOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

/**
 * Generates a URL for Microsoft Outlook OAuth authentication
 * @param customName Optional custom name for the calendar
 */
export function generateOutlookAuthUrl(customName?: string) {
  const state = customName ? encodeURIComponent(JSON.stringify({ name: customName })) : '';
  
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.append('client_id', OUTLOOK_CLIENT_ID!);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', OUTLOOK_REDIRECT_URI);
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
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const params = new URLSearchParams();
  params.append('client_id', OUTLOOK_CLIENT_ID!);
  params.append('client_secret', OUTLOOK_CLIENT_SECRET!);
  params.append('code', code);
  params.append('redirect_uri', OUTLOOK_REDIRECT_URI);
  params.append('grant_type', 'authorization_code');
  
  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
  } catch (error) {
    console.error('Error getting Outlook tokens:', error);
    throw error;
  }
}

/**
 * Refreshes Microsoft Outlook access token using refresh token
 * @param refreshToken The refresh token
 */
export async function refreshOutlookAccessToken(refreshToken: string) {
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const params = new URLSearchParams();
  params.append('client_id', OUTLOOK_CLIENT_ID!);
  params.append('client_secret', OUTLOOK_CLIENT_SECRET!);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');
  
  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || refreshToken, // Some services don't return a new refresh token
      expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
  } catch (error) {
    console.error('Error refreshing Outlook token:', error);
    throw error;
  }
}