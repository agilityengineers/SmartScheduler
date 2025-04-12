import { User, Team, Organization } from '@shared/schema';
import { storage } from '../storage';

/**
 * Generate a unique URL path for a user based on their name
 * @param user The user object
 * @returns A URL-friendly path
 */
export async function getUniqueUserPath(user: User): Promise<string> {
  // First try displayName if available, otherwise use username
  const baseName = user.displayName || user.username;
  
  // Generate slugified version of the user's name
  let slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 60); // Limit to 60 chars max
    
  // For usernames, keep as is if already URL-safe
  if (slug === user.username.toLowerCase()) {
    return slug;
  }
  
  // Check for name collisions recursively
  let uniqueSlug = slug;
  let counter = 1;
  let hasCollision = true;
  
  while (hasCollision) {
    // Search for any users with this path
    const existingUsers = await storage.getAllUsers();
    const collision = existingUsers.find(u => {
      if (u.id === user.id) return false; // Skip self
      
      // Check for existing user path match
      const existingPath = u.displayName || u.username;
      const existingSlug = existingPath
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
        
      return existingSlug === uniqueSlug;
    });
    
    if (!collision) {
      hasCollision = false;
    } else {
      // If collision, append counter and increment
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }
  
  return uniqueSlug;
}

/**
 * Generate a unique URL path for a team based on its name
 * @param team The team object
 * @returns A URL-friendly path
 */
export async function getUniqueTeamPath(team: Team): Promise<string> {
  // Generate slugified version of the team name
  let slug = team.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
    
  // Check for name collisions
  let uniqueSlug = `team/${slug}`;
  let counter = 1;
  let hasCollision = true;
  
  while (hasCollision) {
    // Search for any teams with this path
    const existingTeams = await storage.getTeams();
    const collision = existingTeams.find(t => {
      if (t.id === team.id) return false; // Skip self
      
      // Check for existing team path match
      const existingSlug = t.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
        
      return existingSlug === slug;
    });
    
    if (!collision) {
      hasCollision = false;
    } else {
      // If collision, append counter and increment
      uniqueSlug = `team/${slug}-${counter}`;
      counter++;
    }
  }
  
  return uniqueSlug;
}

/**
 * Generate a unique URL path for an organization based on its name
 * @param organization The organization object
 * @returns A URL-friendly path
 */
export async function getUniqueOrganizationPath(organization: Organization): Promise<string> {
  // Generate slugified version of the organization name
  let slug = organization.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
    
  // Check for name collisions
  let uniqueSlug = `org/${slug}`;
  let counter = 1;
  let hasCollision = true;
  
  while (hasCollision) {
    // Search for any organizations with this path
    const existingOrgs = await storage.getOrganizations();
    const collision = existingOrgs.find(o => {
      if (o.id === organization.id) return false; // Skip self
      
      // Check for existing org path match
      const existingSlug = o.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
        
      return existingSlug === slug;
    });
    
    if (!collision) {
      hasCollision = false;
    } else {
      // If collision, append counter and increment
      uniqueSlug = `org/${slug}-${counter}`;
      counter++;
    }
  }
  
  return uniqueSlug;
}

/**
 * Parse a booking path to determine its type and extract identifiers
 * @param path Full path string (e.g., "john-doe/booking/weekly", "team/sales/booking/demo", "org/acme/booking/enterprise")
 * @returns Object with parsed path components
 */
export function parseBookingPath(path: string): {
  type: 'user' | 'team' | 'org' | 'unknown';
  identifier: string;
  slug: string | null;
} {
  // Remove leading/trailing slashes
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  
  // Different path patterns to match
  const teamPattern = /^team\/([^\/]+)\/booking\/([^\/]+)$/;
  const orgPattern = /^org\/([^\/]+)\/booking\/([^\/]+)$/;
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