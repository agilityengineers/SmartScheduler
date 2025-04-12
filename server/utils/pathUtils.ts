import { User, Team, Organization } from "@shared/schema";
import { storage } from "../storage";

/**
 * Generates a URL-friendly slug from any text
 * @param text Text to convert to slug
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '') // Remove non-word chars (except hyphens)
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Trim hyphens from start
    .replace(/-+$/, ''); // Trim hyphens from end
}

/**
 * Generates a user path for URL based on name or username
 * @param user User object
 * @returns URL-friendly path segment
 */
export function generateUserPath(user: User): string {
  // If first and last name are available, use them
  if (user.firstName && user.lastName) {
    return `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`;
  }
  
  // If display name is available, try to extract first and last name
  if (user.displayName && user.displayName.includes(" ")) {
    const nameParts = user.displayName.split(" ");
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      return `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    }
  }
  
  // Fall back to username
  return user.username.toLowerCase();
}

/**
 * Generates a team path for URL
 * @param team Team object
 * @returns URL-friendly path segment
 */
export function generateTeamPath(team: Team): string {
  return `team/${generateSlug(team.name)}`;
}

/**
 * Generates an organization path for URL
 * @param organization Organization object
 * @returns URL-friendly path segment
 */
export function generateOrganizationPath(organization: Organization): string {
  return `org/${generateSlug(organization.name)}`;
}

/**
 * Checks if a user's path collides with any other user
 * @param user User to check
 * @returns true if collision exists
 */
export async function hasUserNameCollision(user: User): Promise<boolean> {
  // Get all users
  const allUsers = await storage.getAllUsers();
  
  // Generate path for current user
  const userPath = generateUserPath(user);
  
  // Check if any other user has the same path
  return allUsers.some(otherUser => 
    otherUser.id !== user.id && generateUserPath(otherUser) === userPath
  );
}

/**
 * Checks if a team's path collides with any other team
 * @param team Team to check
 * @returns true if collision exists
 */
export async function hasTeamNameCollision(team: Team): Promise<boolean> {
  // Get all teams
  const allTeams = await storage.getTeams();
  
  // Generate path for current team
  const teamPath = generateSlug(team.name);
  
  // Check if any other team has the same path
  return allTeams.some(otherTeam => 
    otherTeam.id !== team.id && generateSlug(otherTeam.name) === teamPath
  );
}

/**
 * Checks if an organization's path collides with any other organization
 * @param organization Organization to check
 * @returns true if collision exists
 */
export async function hasOrganizationNameCollision(organization: Organization): Promise<boolean> {
  // Get all organizations
  const allOrganizations = await storage.getOrganizations();
  
  // Generate path for current organization
  const orgPath = generateSlug(organization.name);
  
  // Check if any other organization has the same path
  return allOrganizations.some(otherOrg => 
    otherOrg.id !== organization.id && generateSlug(otherOrg.name) === orgPath
  );
}

/**
 * Gets a unique user path, avoiding collisions
 * @param user User object
 * @returns Unique URL-friendly path
 */
export async function getUniqueUserPath(user: User): Promise<string> {
  // If there's a name collision, always use username
  if (await hasUserNameCollision(user)) {
    return user.username.toLowerCase();
  }
  
  // Otherwise use the regular path generation
  return generateUserPath(user);
}

/**
 * Gets a unique team path, avoiding collisions
 * @param team Team object
 * @returns Unique URL-friendly path
 */
export async function getUniqueTeamPath(team: Team): Promise<string> {
  // If there's a name collision, append team ID
  if (await hasTeamNameCollision(team)) {
    return `team/${generateSlug(team.name)}-${team.id}`;
  }
  
  // Otherwise use the regular path generation
  return generateTeamPath(team);
}

/**
 * Gets a unique organization path, avoiding collisions
 * @param organization Organization object
 * @returns Unique URL-friendly path
 */
export async function getUniqueOrganizationPath(organization: Organization): Promise<string> {
  // If there's a name collision, append organization ID
  if (await hasOrganizationNameCollision(organization)) {
    return `org/${generateSlug(organization.name)}-${organization.id}`;
  }
  
  // Otherwise use the regular path generation
  return generateOrganizationPath(organization);
}

/**
 * Parses a booking path to determine its type and components
 * @param path URL path to parse
 * @returns Object with path type and components
 */
export function parseBookingPath(path: string): {
  type: 'user' | 'team' | 'org' | 'unknown',
  identifier: string,
  slug: string | null
} {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Check for team path format
  const teamMatch = cleanPath.match(/^team\/([^\/]+)\/booking\/(.+)$/);
  if (teamMatch) {
    return {
      type: 'team',
      identifier: teamMatch[1], // team slug
      slug: teamMatch[2]        // booking link slug
    };
  }
  
  // Check for org path format
  const orgMatch = cleanPath.match(/^org\/([^\/]+)\/booking\/(.+)$/);
  if (orgMatch) {
    return {
      type: 'org',
      identifier: orgMatch[1],  // org slug
      slug: orgMatch[2]         // booking link slug
    };
  }
  
  // Check for user path format (default)
  const userMatch = cleanPath.match(/^([^\/]+)\/booking\/(.+)$/);
  if (userMatch) {
    return {
      type: 'user',
      identifier: userMatch[1], // user path 
      slug: userMatch[2]        // booking link slug
    };
  }
  
  // Unknown format
  return {
    type: 'unknown',
    identifier: '',
    slug: null
  };
}