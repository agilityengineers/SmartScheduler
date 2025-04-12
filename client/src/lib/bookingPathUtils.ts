/**
 * Utility functions for generating and parsing booking path URLs on the client side
 */

/**
 * Slugify a string for use in URLs
 * @param str The string to slugify
 * @returns A URL-friendly version of the string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 60); // Limit to 60 chars max
}

/**
 * Generate a booking link URL for a user
 * @param userPath The user's unique path
 * @param slug The booking link slug
 * @returns The full booking link URL
 */
export function getUserBookingUrl(userPath: string, slug: string): string {
  return `/${userPath}/booking/${slug}`;
}

/**
 * Generate a booking link URL for a team
 * @param teamName The team name to use in the URL
 * @param slug The booking link slug
 * @returns The full booking link URL
 */
export function getTeamBookingUrl(teamName: string, slug: string): string {
  const teamSlug = slugify(teamName);
  return `/team/${teamSlug}/booking/${slug}`;
}

/**
 * Generate a booking link URL for an organization
 * @param orgName The organization name to use in the URL
 * @param slug The booking link slug
 * @returns The full booking link URL
 */
export function getOrganizationBookingUrl(orgName: string, slug: string): string {
  const orgSlug = slugify(orgName);
  return `/org/${orgSlug}/booking/${slug}`;
}

/**
 * Generate a combined org/team booking link URL
 * @param orgName The organization name
 * @param teamName The team name
 * @param slug The booking link slug
 * @returns The full booking link URL
 */
export function getCombinedBookingUrl(orgName: string, teamName: string, slug: string): string {
  const orgSlug = slugify(orgName);
  const teamSlug = slugify(teamName);
  return `/${orgSlug}/${teamSlug}/booking/${slug}`;
}

/**
 * Parse a booking path to determine its type and extract identifiers
 * @param path Full path string (e.g., "john-doe/booking/weekly", "team/sales/booking/demo", "org/acme/booking/enterprise")
 * @returns Object with parsed path components
 */
export function parseBookingPath(path: string): {
  type: 'user' | 'team' | 'org' | 'combined' | 'unknown';
  identifier: string;
  secondaryIdentifier?: string;
  slug: string | null;
} {
  // Remove leading/trailing slashes
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  
  // Different path patterns to match
  const teamPattern = /^team\/([^\/]+)\/booking\/([^\/]+)$/;
  const orgPattern = /^org\/([^\/]+)\/booking\/([^\/]+)$/;
  const combinedPattern = /^([^\/]+)\/([^\/]+)\/booking\/([^\/]+)$/;
  const userPattern = /^([^\/]+)\/booking\/([^\/]+)$/;
  
  // Try to match each pattern
  let match;
  
  // Check team pattern
  match = cleanPath.match(teamPattern);
  if (match) {
    return {
      type: 'team',
      identifier: match[1],
      slug: match[2]
    };
  }
  
  // Check org pattern
  match = cleanPath.match(orgPattern);
  if (match) {
    return {
      type: 'org',
      identifier: match[1],
      slug: match[2]
    };
  }
  
  // Check combined org/team pattern
  match = cleanPath.match(combinedPattern);
  if (match) {
    return {
      type: 'combined',
      identifier: match[1], // org
      secondaryIdentifier: match[2], // team
      slug: match[3]
    };
  }
  
  // Check user pattern
  match = cleanPath.match(userPattern);
  if (match) {
    return {
      type: 'user',
      identifier: match[1],
      slug: match[2]
    };
  }
  
  // If no patterns match, return unknown
  return {
    type: 'unknown',
    identifier: '',
    slug: null
  };
}