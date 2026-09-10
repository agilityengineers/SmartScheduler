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

// Deprecated domains that must never be used for OAuth URLs, even if a stale
// committed .env value points at them.
const DEPRECATED_DOMAINS = ['mysmartscheduler.co'];
const CANONICAL_BASE_URL = 'https://smart-scheduler.ai';

function isDeprecatedUrl(value?: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return DEPRECATED_DOMAINS.some(domain => lower.includes(domain));
}

// Function to get the base URL - will be re-evaluated each time
function getBaseUrl(): string {
  const customUrl = getEnvVar('BASE_URL');
  if (customUrl && isDeprecatedUrl(customUrl)) {
    logOAuth('Config', 'Ignoring deprecated BASE_URL, using canonical:', CANONICAL_BASE_URL);
    return CANONICAL_BASE_URL;
  }
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

// Google OAuth configuration with multi-domain support
function getGoogleRedirectUri(originDomain?: string): string {
  if (originDomain && GOOGLE_DOMAINS[originDomain]) {
    return `https://${originDomain}/api/integrations/google/callback`;
  }
  return `${getBaseUrl()}/api/integrations/google/callback`;
}

// Microsoft OAuth configuration with multi-domain support
function getOutlookRedirectUri(originDomain?: string): string {
  if (originDomain && OUTLOOK_DOMAINS[originDomain]) {
    return `https://${originDomain}/api/integrations/outlook/callback`;
  }
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

// OAuth configuration for Google
const GOOGLE_DOMAINS: Record<string, { clientIdKey: string; clientSecretKey: string }> = {
  'smart-scheduler.ai': {
    clientIdKey: 'GOOGLE_CLIENT_ID',
    clientSecretKey: 'GOOGLE_CLIENT_SECRET',
  },
};

// OAuth configuration for Outlook
const OUTLOOK_DOMAINS: Record<string, { clientIdKey: string; clientSecretKey: string }> = {
  'smart-scheduler.ai': {
    clientIdKey: 'OUTLOOK_CLIENT_ID',
    clientSecretKey: 'OUTLOOK_CLIENT_SECRET',
  },
};

/**
 * Get Google OAuth credentials for a specific domain
 */
function getGoogleCredentials(originDomain?: string): { clientId: string; clientSecret: string; domain: string } {
  const domain = originDomain && GOOGLE_DOMAINS[originDomain] ? originDomain : '';

  if (domain && GOOGLE_DOMAINS[domain]) {
    const config = GOOGLE_DOMAINS[domain];
    const clientId = getEnvVar(config.clientIdKey);
    const clientSecret = getEnvVar(config.clientSecretKey);
    if (clientId && clientSecret) {
      logOAuth('Google', `Using domain-specific credentials for ${domain}`);
      return { clientId, clientSecret, domain };
    }
    logOAuth('Google', `Domain ${domain} matched but credentials not found, falling back`);
  }

  // Fallback to default credentials
  const clientId = getEnvVar('GOOGLE_CLIENT_ID');
  const clientSecret = getEnvVar('GOOGLE_CLIENT_SECRET');
  const fallbackDomain = Object.keys(GOOGLE_DOMAINS)[0] || '';
  return { clientId, clientSecret, domain: fallbackDomain };
}

/**
 * Get Outlook OAuth credentials for a specific domain
 */
function getOutlookCredentials(originDomain?: string): { clientId: string; clientSecret: string; domain: string } {
  const domain = originDomain && OUTLOOK_DOMAINS[originDomain] ? originDomain : '';

  if (domain && OUTLOOK_DOMAINS[domain]) {
    const config = OUTLOOK_DOMAINS[domain];
    const clientId = getEnvVar(config.clientIdKey);
    const clientSecret = getEnvVar(config.clientSecretKey);
    if (clientId && clientSecret) {
      logOAuth('Outlook', `Using domain-specific credentials for ${domain}`);
      return { clientId, clientSecret, domain };
    }
    logOAuth('Outlook', `Domain ${domain} matched but credentials not found, falling back`);
  }

  // Fallback to default credentials
  const clientId = getEnvVar('OUTLOOK_CLIENT_ID');
  const clientSecret = getEnvVar('OUTLOOK_CLIENT_SECRET');
  const fallbackDomain = Object.keys(OUTLOOK_DOMAINS)[0] || '';
  return { clientId, clientSecret, domain: fallbackDomain };
}

/**
 * Reports whether each provider has the credentials it needs to run an OAuth
 * flow. Used by the integration-status endpoint and by the auth-URL builders so
 * a missing env var surfaces as an actionable error instead of a broken
 * redirect to the provider ("invalid_client").
 */
export function getOAuthConfigStatus(originDomain?: string) {
  const google = getGoogleCredentials(originDomain);
  const outlook = getOutlookCredentials(originDomain);
  const zoom = getZoomCredentials(originDomain);

  return {
    baseUrl: getBaseUrl(),
    google: {
      configured: !!google.clientId && !!google.clientSecret,
      hasClientId: !!google.clientId,
      hasClientSecret: !!google.clientSecret,
      redirectUri: getGoogleRedirectUri(originDomain),
      scopes: GOOGLE_SCOPES,
    },
    outlook: {
      configured: !!outlook.clientId && !!outlook.clientSecret,
      hasClientId: !!outlook.clientId,
      hasClientSecret: !!outlook.clientSecret,
      redirectUri: getOutlookRedirectUri(originDomain),
      scopes: OUTLOOK_SCOPES,
    },
    zoom: {
      configured: !!zoom.clientId && !!zoom.clientSecret,
      hasClientId: !!zoom.clientId,
      hasClientSecret: !!zoom.clientSecret,
      redirectUri: getZoomRedirectUri(originDomain),
    },
  };
}

/**
 * Throws a descriptive error when a provider's OAuth credentials are missing.
 * Without this the googleapis client happily builds an auth URL with
 * `client_id=undefined`, so the user is bounced to a Google error page instead
 * of being told the server is not configured.
 */
function assertOAuthConfigured(
  provider: string,
  clientId: string,
  clientSecret: string,
  clientIdVar: string,
  clientSecretVar: string
) {
  const missing: string[] = [];
  if (!clientId) missing.push(clientIdVar);
  if (!clientSecret) missing.push(clientSecretVar);
  if (missing.length > 0) {
    throw new Error(
      `${provider} integration is not configured on this server. Missing environment ` +
      `variable(s): ${missing.join(', ')}.`
    );
  }
}

/**
 * Creates a Google OAuth2 client with optional domain-specific credentials
 */
export function createGoogleOAuth2Client(originDomain?: string) {
  const { clientId, clientSecret, domain } = getGoogleCredentials(originDomain);
  const redirectUri = getGoogleRedirectUri(originDomain);

  logOAuth('Google', 'Creating OAuth2 client with', {
    clientId: clientId,
    clientSecret: clientSecret ? '(Secret provided)' : '(No secret)',
    redirectUri,
    domain: domain || 'default'
  });

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Generates a URL for Google OAuth authentication
 * @param customName Optional custom name for the calendar
 * @param originDomain Optional domain for multi-domain OAuth support
 */
export function generateGoogleAuthUrl(customName?: string, originDomain?: string) {
  const creds = getGoogleCredentials(originDomain);
  assertOAuthConfigured(
    'Google Calendar', creds.clientId, creds.clientSecret,
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'
  );

  const oauth2Client = createGoogleOAuth2Client(originDomain);

  // Include origin domain in state for recovery in callback
  const stateData: Record<string, string> = {};
  if (customName) stateData.name = customName;
  if (originDomain) stateData.origin = originDomain;
  const state = Object.keys(stateData).length > 0 ? JSON.stringify(stateData) : '';

  const redirectUri = getGoogleRedirectUri(originDomain);
  const { clientId, clientSecret } = getGoogleCredentials(originDomain);

  logOAuth('Google', 'Redirect URI', redirectUri);
  logOAuth('Google', 'Client ID available', !!clientId);
  logOAuth('Google', 'Client Secret available', !!clientSecret);
  logOAuth('Google', 'Origin domain', originDomain || 'none');
  
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
 * @param originDomain Optional domain for multi-domain OAuth support
 */
export async function getGoogleTokens(code: string, originDomain?: string) {
  logOAuth('Google', 'Exchanging authorization code for tokens');
  logOAuth('Google', 'Origin domain', originDomain || 'none');

  try {
    const oauth2Client = createGoogleOAuth2Client(originDomain);
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
 * @param originDomain Optional domain for multi-domain OAuth support
 */
export async function refreshGoogleAccessToken(refreshToken: string, originDomain?: string) {
  logOAuth('Google', 'Refreshing access token');
  try {
    const oauth2Client = createGoogleOAuth2Client(originDomain);
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
 * @param originDomain Optional domain for multi-domain OAuth support
 */
export function generateOutlookAuthUrl(customName?: string, originDomain?: string) {
  // Include origin domain in state for recovery in callback
  const stateData: Record<string, string> = {};
  if (customName) stateData.name = customName;
  if (originDomain) stateData.origin = originDomain;
  const state = Object.keys(stateData).length > 0 ? encodeURIComponent(JSON.stringify(stateData)) : '';

  const redirectUri = getOutlookRedirectUri(originDomain);
  const { clientId: outlookClientId, clientSecret: outlookClientSecret } = getOutlookCredentials(originDomain);

  assertOAuthConfigured(
    'Outlook Calendar', outlookClientId, outlookClientSecret,
    'OUTLOOK_CLIENT_ID', 'OUTLOOK_CLIENT_SECRET'
  );

  logOAuth('Outlook', 'Redirect URI', redirectUri);
  logOAuth('Outlook', 'Origin domain', originDomain || 'none');
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
 * @param originDomain Optional domain for multi-domain OAuth support
 */
export async function getOutlookTokens(code: string, originDomain?: string) {
  logOAuth('Outlook', 'Exchanging authorization code for tokens');
  logOAuth('Outlook', 'Origin domain', originDomain || 'none');
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const redirectUri = getOutlookRedirectUri(originDomain);
  const { clientId: outlookClientId, clientSecret: outlookClientSecret } = getOutlookCredentials(originDomain);

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
 * @param originDomain Optional domain for multi-domain OAuth support
 */
export async function refreshOutlookAccessToken(refreshToken: string, originDomain?: string) {
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const { clientId: outlookClientId, clientSecret: outlookClientSecret } = getOutlookCredentials(originDomain);

  const params = new URLSearchParams();
  params.append('client_id', outlookClientId);
  params.append('client_secret', outlookClientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  logOAuth('Outlook', 'Refreshing token');
  logOAuth('Outlook', 'Origin domain', originDomain || 'none');
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
const ZOOM_DOMAINS: Record<string, { clientIdKey: string; clientSecretKey: string }> = {
  'smart-scheduler.ai': {
    clientIdKey: 'ZOOM_CLIENT_ID',
    clientSecretKey: 'ZOOM_CLIENT_SECRET',
  },
};

function getZoomCredentials(originDomain?: string): { clientId: string; clientSecret: string; domain: string } {
  const domain = originDomain && ZOOM_DOMAINS[originDomain] ? originDomain : '';

  if (domain && ZOOM_DOMAINS[domain]) {
    const config = ZOOM_DOMAINS[domain];
    const clientId = getEnvVar(config.clientIdKey);
    const clientSecret = getEnvVar(config.clientSecretKey);
    if (clientId && clientSecret) {
      logOAuth('Zoom', `Using domain-specific credentials for ${domain}`);
      return { clientId, clientSecret, domain };
    }
    logOAuth('Zoom', `Domain ${domain} matched but credentials not found, falling back`);
  }

  const clientId = getEnvVar('ZOOM_CLIENT_ID') || getEnvVar('ZOOM_API_KEY');
  const clientSecret = getEnvVar('ZOOM_CLIENT_SECRET') || getEnvVar('ZOOM_API_SECRET');
  const fallbackDomain = Object.keys(ZOOM_DOMAINS)[0] || '';
  return { clientId, clientSecret, domain: fallbackDomain };
}

function getZoomRedirectUri(originDomain?: string): string {
  if (originDomain && ZOOM_DOMAINS[originDomain]) {
    return `https://${originDomain}/api/integrations/zoom/callback`;
  }
  return `${getBaseUrl()}/api/integrations/zoom/callback`;
}

// Zoom resolves scopes from the Marketplace app configuration rather than from
// the authorize request, so no scope parameter is sent. The app must be granted
// meeting:write (create/update/delete meetings) and user:read (resolve /users/me)
// in the Zoom Marketplace, or the callback succeeds and every API call 4xxs.
export function generateZoomAuthUrl(customName?: string, originDomain?: string): string {
  const { clientId: zoomClientId, domain } = getZoomCredentials(originDomain);

  logOAuth('Zoom', 'Client ID available', !!zoomClientId);
  logOAuth('Zoom', 'Origin domain', originDomain || 'none');
  logOAuth('Zoom', 'Resolved domain', domain);

  const { clientSecret: zoomClientSecret } = getZoomCredentials(originDomain);
  assertOAuthConfigured(
    'Zoom', zoomClientId, zoomClientSecret,
    'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'
  );

  const redirectUri = getZoomRedirectUri(originDomain);
  logOAuth('Zoom', 'Redirect URI', redirectUri);

  const stateData: Record<string, string> = {};
  if (customName) stateData.name = customName;
  if (originDomain) stateData.origin = originDomain;
  const state = Object.keys(stateData).length > 0 ? encodeURIComponent(JSON.stringify(stateData)) : '';

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

export async function getZoomTokens(code: string, originDomain?: string) {
  logOAuth('Zoom', 'Exchanging authorization code for tokens');
  logOAuth('Zoom', 'Origin domain for token exchange', originDomain || 'none');

  const { clientId: zoomClientId, clientSecret: zoomClientSecret } = getZoomCredentials(originDomain);
  const redirectUri = getZoomRedirectUri(originDomain);

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
 * Revokes a provider's OAuth grant so disconnecting in SmartScheduler actually
 * ends the app's access, rather than just hiding it behind a flag. Best effort:
 * a revoke failure must not block the disconnect the user asked for.
 */
export async function revokeGoogleToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    // Revoking a refresh token also invalidates every access token minted from it.
    await axios.post(
      'https://oauth2.googleapis.com/revoke',
      new URLSearchParams({ token }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    logOAuth('Google', 'Revoked OAuth token');
    return true;
  } catch (error: any) {
    // 400 "invalid_token" just means it was already dead - that is the desired
    // end state, so treat it as success.
    if (error.response?.status === 400) {
      logOAuth('Google', 'Token was already invalid or revoked');
      return true;
    }
    logOAuth('Google', 'Failed to revoke token', error.response?.data || error.message);
    return false;
  }
}

export async function revokeZoomToken(token: string): Promise<boolean> {
  if (!token) return false;

  const clientId = getEnvVar('ZOOM_CLIENT_ID') || getEnvVar('ZOOM_API_KEY');
  const clientSecret = getEnvVar('ZOOM_CLIENT_SECRET') || getEnvVar('ZOOM_API_SECRET');
  if (!clientId || !clientSecret) {
    logOAuth('Zoom', 'Cannot revoke token: Zoom OAuth is not configured');
    return false;
  }

  try {
    await axios.post(
      'https://zoom.us/oauth/revoke',
      new URLSearchParams({ token }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        }
      }
    );
    logOAuth('Zoom', 'Revoked OAuth token');
    return true;
  } catch (error: any) {
    logOAuth('Zoom', 'Failed to revoke token', error.response?.data || error.message);
    return false;
  }
}

/**
 * Microsoft identity platform exposes no endpoint for a confidential client to
 * revoke a single delegated grant: refresh tokens are invalidated by the user
 * (via myapplications.microsoft.com) or by an admin, not by the app. The best we
 * can do on disconnect is stop using and destroy our copy of the tokens, which
 * disconnect() does. Kept as a named no-op so the disconnect paths read the same
 * across providers and the reason is documented where someone will look for it.
 */
export async function revokeOutlookToken(_token: string): Promise<boolean> {
  logOAuth(
    'Outlook',
    'Microsoft has no app-initiated revocation endpoint; stored tokens are destroyed locally instead'
  );
  return false;
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