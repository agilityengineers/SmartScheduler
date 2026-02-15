/**
 * Domain Middleware
 *
 * Extracts the entry domain from incoming requests and stores it in the session.
 * This ensures consistent domain handling throughout the user's experience,
 * including email links, OAuth callbacks, and generated URLs.
 */

import { Request, Response, NextFunction } from 'express';
import {
  extractDomainFromHost,
  isValidPlatformDomain,
  isDevelopmentDomain,
  getDomainConfig,
  DomainConfig,
} from '../utils/domainConfig';

// Extend Express Request to include domain information
declare global {
  namespace Express {
    interface Request {
      entryDomain?: string;
      domainConfig?: DomainConfig;
    }
  }
}

/**
 * Extract the domain from the request
 * Checks multiple sources in order of priority:
 * 1. Host header (most reliable for the actual request domain)
 * 2. Origin header (useful for CORS requests)
 * 3. Referer header (fallback)
 */
function extractDomainFromRequest(req: Request): string {
  // Primary: use the Host header
  const host = req.get('host');
  if (host) {
    const domain = extractDomainFromHost(host);
    if (domain) return domain;
  }

  // Fallback: try Origin header
  const origin = req.get('origin');
  if (origin) {
    try {
      const url = new URL(origin);
      return url.hostname;
    } catch {
      // Invalid URL, continue to next fallback
    }
  }

  // Last resort: try Referer header
  const referer = req.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      return url.hostname;
    } catch {
      // Invalid URL
    }
  }

  return '';
}

/**
 * Domain detection middleware
 *
 * - Extracts domain from request headers
 * - Stores entry domain in session (first request only)
 * - Attaches domain info to request object for easy access
 */
export function domainMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract current request domain
  const requestDomain = extractDomainFromRequest(req);

  // For session-based tracking, only set entryDomain on first request
  // This ensures the user stays on their entry domain throughout the session
  if (req.session && !req.session.entryDomain) {
    // Validate that it's a known platform domain or dev domain
    if (isValidPlatformDomain(requestDomain) || isDevelopmentDomain(requestDomain)) {
      req.session.entryDomain = requestDomain;
    }
  }

  // Attach domain info to request for easy access in route handlers
  // Use session entry domain if available, otherwise use current request domain
  const effectiveDomain = req.session?.entryDomain || requestDomain;
  req.entryDomain = effectiveDomain;
  req.domainConfig = getDomainConfig(effectiveDomain);

  next();
}

/**
 * Get the entry domain from a request
 * Prioritizes session value, falls back to request headers
 */
export function getEntryDomain(req: Request): string {
  return req.session?.entryDomain || req.entryDomain || extractDomainFromRequest(req);
}

/**
 * Get the domain config from a request
 */
export function getDomainConfigFromRequest(req: Request): DomainConfig {
  return req.domainConfig || getDomainConfig(getEntryDomain(req));
}
