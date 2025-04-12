import { User, Team, Organization } from "@shared/schema";

/**
 * Utility functions for generating and managing booking URL paths
 * With support for user, team, and organization paths
 */

/**
 * Generates a slug-friendly string from any text
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
 * Generates a URL-friendly path segment for a user.
 * Uses firstName.lastName if available, otherwise falls back to username.
 * 
 * @param user The user object to generate a path for
 * @returns A URL-friendly path segment
 */
export function generateUserUrlPath(user: User): string {
  // If both first and last name are available, use them
  if (user.firstName && user.lastName) {
    return `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`;
  }
  
  // If only displayName is available, try to extract first and last name
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
 * Generates a URL-friendly path segment for a team
 * 
 * @param team The team object to generate a path for
 * @returns A URL-friendly path segment
 */
export function generateTeamUrlPath(team: Team): string {
  return `team/${generateSlug(team.name)}`;
}

/**
 * Generates a URL-friendly path segment for an organization
 * 
 * @param organization The organization object to generate a path for
 * @returns A URL-friendly path segment
 */
export function generateOrganizationUrlPath(organization: Organization): string {
  return `org/${generateSlug(organization.name)}`;
}

/**
 * Checks if there's a name collision with any other user
 * 
 * @param user The current user
 * @param allUsers All users in the system
 * @returns true if there's a collision, false otherwise
 */
export function hasUserNameCollision(user: User, allUsers: User[]): boolean {
  // Generate path for current user
  const userPath = generateUserUrlPath(user);
  
  // Check if any other user has the same path
  return allUsers.some(otherUser => 
    otherUser.id !== user.id && generateUserUrlPath(otherUser) === userPath
  );
}

/**
 * Checks if there's a name collision with any other team
 * 
 * @param team The current team
 * @param allTeams All teams in the system
 * @returns true if there's a collision, false otherwise
 */
export function hasTeamNameCollision(team: Team, allTeams: Team[]): boolean {
  // Generate path for current team
  const teamPath = generateSlug(team.name);
  
  // Check if any other team has the same path
  return allTeams.some(otherTeam => 
    otherTeam.id !== team.id && generateSlug(otherTeam.name) === teamPath
  );
}

/**
 * Checks if there's a name collision with any other organization
 * 
 * @param organization The current organization
 * @param allOrganizations All organizations in the system
 * @returns true if there's a collision, false otherwise
 */
export function hasOrganizationNameCollision(
  organization: Organization, 
  allOrganizations: Organization[]
): boolean {
  // Generate path for current organization
  const orgPath = generateSlug(organization.name);
  
  // Check if any other organization has the same path
  return allOrganizations.some(otherOrg => 
    otherOrg.id !== organization.id && generateSlug(otherOrg.name) === orgPath
  );
}

/**
 * Generates a path for a booking link based on the context (user, team, or organization)
 * 
 * @param bookingLink The booking link object
 * @param user The user who owns the booking link
 * @param team Optional team if this is a team booking link
 * @param organization Optional organization if this is an org booking link
 * @param slug The booking link slug
 * @returns The complete path for the booking link URL
 */
export function generateBookingLinkPath(
  user: User,
  team?: Team | null,
  organization?: Organization | null,
  slug: string = ""
): string {
  // For team booking links
  if (team) {
    return `/${generateTeamUrlPath(team)}/booking/${slug}`;
  }
  
  // For organization booking links (if implemented in the future)
  if (organization) {
    return `/${generateOrganizationUrlPath(organization)}/booking/${slug}`;
  }
  
  // Default to user path
  return `/${generateUserUrlPath(user)}/booking/${slug}`;
}

/**
 * Extracts path components from a booking URL path
 * @param path The URL path to parse
 * @returns Object with extracted components (type, identifier, slug)
 */
export function parseBookingLinkPath(path: string): {
  type: 'user' | 'team' | 'org' | 'unknown',
  identifier: string,
  slug: string
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
    slug: ''
  };
}