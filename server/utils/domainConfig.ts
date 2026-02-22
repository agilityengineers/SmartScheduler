/**
 * Domain Configuration Module
 *
 * Centralized configuration for SmartScheduler's domain: smart-scheduler.ai
 */

export interface DomainConfig {
  domain: string;
  baseUrl: string;
  fromEmail: string;
  brandName: string;
  oauthCredentialSuffix: string;
}

export const PLATFORM_DOMAINS: Record<string, DomainConfig> = {
  'smart-scheduler.ai': {
    domain: 'smart-scheduler.ai',
    baseUrl: 'https://smart-scheduler.ai',
    fromEmail: 'noreply@smart-scheduler.ai',
    brandName: 'Smart Scheduler',
    oauthCredentialSuffix: '',
  },
};

const DEFAULT_DOMAIN = 'smart-scheduler.ai';

export function isValidPlatformDomain(domain: string): boolean {
  if (!domain) return false;
  const normalizedDomain = domain.split(':')[0].toLowerCase();
  return normalizedDomain in PLATFORM_DOMAINS;
}

export function getDomainConfig(domain?: string): DomainConfig {
  if (!domain) {
    return PLATFORM_DOMAINS[DEFAULT_DOMAIN];
  }

  const normalizedDomain = domain.split(':')[0].toLowerCase();

  return PLATFORM_DOMAINS[normalizedDomain] || PLATFORM_DOMAINS[DEFAULT_DOMAIN];
}

export function getBaseUrlForDomain(domain?: string): string {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  const config = getDomainConfig(domain);
  return config.baseUrl;
}

export function getFromEmailForDomain(domain?: string): string {
  if (process.env.FROM_EMAIL) {
    return process.env.FROM_EMAIL;
  }

  const config = getDomainConfig(domain);
  return config.fromEmail;
}

export function getOAuthCredentialSuffix(domain?: string): string {
  const config = getDomainConfig(domain);
  return config.oauthCredentialSuffix;
}

export function getAllPlatformDomains(): string[] {
  return Object.keys(PLATFORM_DOMAINS);
}

export function getAllPlatformOrigins(): string[] {
  return Object.values(PLATFORM_DOMAINS).map(config => config.baseUrl);
}

export function extractDomainFromHost(host: string): string {
  if (!host) return '';
  return host.split(':')[0].toLowerCase();
}

export function isDevelopmentDomain(domain: string): boolean {
  const devDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
  const normalizedDomain = extractDomainFromHost(domain);
  return devDomains.includes(normalizedDomain) ||
         normalizedDomain.endsWith('.replit.dev') ||
         normalizedDomain.endsWith('.replit.app');
}

export function getEnvVarForDomain(envVarName: string, domain?: string): string {
  const suffix = getOAuthCredentialSuffix(domain);
  const fullVarName = `${envVarName}${suffix}`;
  return process.env[fullVarName] || process.env[envVarName] || '';
}
