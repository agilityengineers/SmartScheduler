/**
 * Domain Configuration Module
 *
 * Centralized configuration for multi-domain support in SmartScheduler.
 * Supports admin-level domains (mysmartscheduler.co, smart-scheduler.ai) and
 * prepares for future company white-label domains.
 */

export interface DomainConfig {
  domain: string;
  baseUrl: string;
  fromEmail: string;
  brandName: string;
  oauthCredentialSuffix: string; // '' for primary, '_ALT' for alternate
}

/**
 * Platform-owned domains configuration
 * These are the admin-level domains that SmartScheduler operates on
 */
export const PLATFORM_DOMAINS: Record<string, DomainConfig> = {
  'mysmartscheduler.co': {
    domain: 'mysmartscheduler.co',
    baseUrl: 'https://mysmartscheduler.co',
    fromEmail: 'noreply@mysmartscheduler.co',
    brandName: 'My Smart Scheduler',
    oauthCredentialSuffix: '',
  },
  'smart-scheduler.ai': {
    domain: 'smart-scheduler.ai',
    baseUrl: 'https://smart-scheduler.ai',
    fromEmail: 'noreply@smart-scheduler.ai',
    brandName: 'Smart Scheduler',
    oauthCredentialSuffix: '_ALT',
  },
};

// Default domain when no match is found
const DEFAULT_DOMAIN = 'smart-scheduler.ai';

/**
 * Check if a domain is a valid platform domain
 */
export function isValidPlatformDomain(domain: string): boolean {
  if (!domain) return false;
  // Normalize domain (remove port if present, lowercase)
  const normalizedDomain = domain.split(':')[0].toLowerCase();
  return normalizedDomain in PLATFORM_DOMAINS;
}

/**
 * Get domain configuration for a given domain
 * Returns default configuration if domain is not found
 */
export function getDomainConfig(domain?: string): DomainConfig {
  if (!domain) {
    return PLATFORM_DOMAINS[DEFAULT_DOMAIN];
  }

  // Normalize domain (remove port if present, lowercase)
  const normalizedDomain = domain.split(':')[0].toLowerCase();

  return PLATFORM_DOMAINS[normalizedDomain] || PLATFORM_DOMAINS[DEFAULT_DOMAIN];
}

/**
 * Get the base URL for a given domain
 * Used for constructing links in emails, OAuth callbacks, etc.
 */
export function getBaseUrlForDomain(domain?: string): string {
  // Check for environment override first
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  const config = getDomainConfig(domain);
  return config.baseUrl;
}

/**
 * Get the FROM email address for a given domain
 */
export function getFromEmailForDomain(domain?: string): string {
  // Check for environment override first
  if (process.env.FROM_EMAIL) {
    return process.env.FROM_EMAIL;
  }

  const config = getDomainConfig(domain);
  return config.fromEmail;
}

/**
 * Get the OAuth credential suffix for a given domain
 * Used to select domain-specific OAuth credentials
 */
export function getOAuthCredentialSuffix(domain?: string): string {
  const config = getDomainConfig(domain);
  return config.oauthCredentialSuffix;
}

/**
 * Get all valid platform domain hostnames
 * Useful for CORS configuration
 */
export function getAllPlatformDomains(): string[] {
  return Object.keys(PLATFORM_DOMAINS);
}

/**
 * Get all platform domain base URLs
 * Useful for CORS allowed origins
 */
export function getAllPlatformOrigins(): string[] {
  return Object.values(PLATFORM_DOMAINS).map(config => config.baseUrl);
}

/**
 * Extract domain from a host header value
 * Handles port numbers (e.g., "localhost:5000" -> "localhost")
 */
export function extractDomainFromHost(host: string): string {
  if (!host) return '';
  return host.split(':')[0].toLowerCase();
}

/**
 * Check if a domain is localhost or a development domain
 */
export function isDevelopmentDomain(domain: string): boolean {
  const devDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
  const normalizedDomain = extractDomainFromHost(domain);
  return devDomains.includes(normalizedDomain) ||
         normalizedDomain.endsWith('.replit.dev') ||
         normalizedDomain.endsWith('.replit.app');
}

/**
 * Get environment variable with optional domain-specific suffix
 * Example: getEnvVarForDomain('GOOGLE_CLIENT_ID', 'smart-scheduler.ai')
 *          returns process.env.GOOGLE_CLIENT_ID_ALT
 */
export function getEnvVarForDomain(envVarName: string, domain?: string): string {
  const suffix = getOAuthCredentialSuffix(domain);
  const fullVarName = `${envVarName}${suffix}`;
  return process.env[fullVarName] || process.env[envVarName] || '';
}
