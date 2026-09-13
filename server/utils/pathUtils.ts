import { User, Team, Organization, BookingLink } from '@shared/schema';
import { storage } from '../storage';

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

/**
 * Canonical public path segment for a user: `first.last`, each half run through
 * slugifyName() so a name like "Dr. Nadine Richards" becomes `dr-nadine.richards`
 * rather than landing in the URL with a space and a period. Plain names are
 * unchanged from the historical form (`john.doe`). Falls back to the display
 * name split on spaces, then to the username.
 *
 * Collisions (two users with the same name path) are handled by the callers
 * below: both users use their username instead.
 */
export function getUserPathSync(user: User): string {
  const parts = nameParts(user);
  if (parts) {
    const first = slugifyName(parts[0]);
    const last = slugifyName(parts[1]);
    // slugifyName empties a segment made only of punctuation; the username is
    // the safer identifier then.
    if (first && last) return `${first}.${last}`;
  }
  return user.username.toLowerCase();
}

/**
 * The form this app generated before segments were slugified: raw lowercased
 * first/last joined with a dot. Only used to recognise links shared under the
 * old form so they can be redirected — never to build a new one.
 */
export function getLegacyUserPathSync(user: User): string {
  const parts = nameParts(user);
  if (parts) return `${parts[0].toLowerCase()}.${parts[1].toLowerCase()}`;
  return user.username.toLowerCase();
}

function nameParts(user: User): [string, string] | null {
  if (user.firstName && user.lastName) return [user.firstName, user.lastName];
  if (user.displayName && user.displayName.includes(' ')) {
    const parts = user.displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts[parts.length - 1]];
  }
  return null;
}

/**
 * Canonical path for every user in one pass: one collision map instead of a
 * full-table scan per user. Users whose name path collides get their username.
 */
function buildUserPathIndex(users: User[], pathOf: (u: User) => string): Map<number, string> {
  const seen = new Map<string, number>();
  for (const u of users) {
    const p = pathOf(u);
    seen.set(p, (seen.get(p) ?? 0) + 1);
  }
  const index = new Map<number, string>();
  for (const u of users) {
    const p = pathOf(u);
    index.set(u.id, (seen.get(p) ?? 0) > 1 ? u.username.toLowerCase() : p);
  }
  return index;
}

/**
 * Generate a unique URL path for a user based on their name
 * @param user The user object
 * @param allUsers Pass the user table when the caller already has it, to skip the re-read
 * @returns A URL-friendly path
 */
export async function getUniqueUserPath(user: User, allUsers?: User[]): Promise<string> {
  const users = allUsers ?? await storage.getAllUsers();
  const index = buildUserPathIndex(users, getUserPathSync);
  // The user may not be in the list yet (e.g. mid-registration); fall back to
  // their own path with no collision check rather than to nothing.
  return index.get(user.id) ?? getUserPathSync(user);
}

export interface ResolvedUserPath {
  user: User;
  /** The path this user's links are served at today. Differs from the requested path only for legacy URLs. */
  canonicalPath: string;
}

/**
 * Find the user a public URL's first segment refers to.
 *
 * Matches the canonical form first, then the pre-slugify form, so a link that
 * was shared as /dr. nadine.richards/booking/... still finds its owner and can
 * be redirected to /dr-nadine.richards/booking/... by the caller.
 */
export async function resolveUserByPath(path: string): Promise<ResolvedUserPath | undefined> {
  const wanted = path.trim().toLowerCase();
  if (!wanted) return undefined;

  const users = await storage.getAllUsers();
  const canonical = buildUserPathIndex(users, getUserPathSync);

  for (const user of users) {
    if (canonical.get(user.id) === wanted) return { user, canonicalPath: wanted };
  }

  const legacy = buildUserPathIndex(users, getLegacyUserPathSync);
  for (const user of users) {
    if (legacy.get(user.id) === wanted) {
      return { user, canonicalPath: canonical.get(user.id) ?? getUserPathSync(user) };
    }
  }

  // A bare username always identifies its user; the caller redirects to the
  // canonical form when that differs.
  for (const user of users) {
    if (user.username.toLowerCase() === wanted) {
      return { user, canonicalPath: canonical.get(user.id) ?? getUserPathSync(user) };
    }
  }

  return undefined;
}

/**
 * The path a booking link is served at, without the host. Team links live under
 * their team (and organisation, when it has one); personal links under the
 * owner's user path.
 */
export async function getCanonicalBookingPath(
  bookingLink: Pick<BookingLink, 'slug' | 'isTeamBooking' | 'teamId'>,
  owner: User,
  allUsers?: User[],
): Promise<string> {
  if (bookingLink.isTeamBooking && bookingLink.teamId) {
    const team = await storage.getTeam(bookingLink.teamId);
    if (team) {
      const teamSlug = slugifyName(team.name);
      if (team.organizationId) {
        const org = await storage.getOrganization(team.organizationId);
        if (org) {
          return `/${slugifyName(org.name)}/${teamSlug}/booking/${bookingLink.slug}`;
        }
      }
      return `/team/${teamSlug}/booking/${bookingLink.slug}`;
    }
  }
  const userPath = await getUniqueUserPath(owner, allUsers);
  return `/${userPath}/booking/${bookingLink.slug}`;
}

export async function getCanonicalBookingUrl(
  baseUrl: string,
  bookingLink: Pick<BookingLink, 'slug' | 'isTeamBooking' | 'teamId'>,
  owner: User,
  allUsers?: User[],
): Promise<string> {
  return `${baseUrl}${await getCanonicalBookingPath(bookingLink, owner, allUsers)}`;
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
  
  // Check combined org/team pattern (must be before user pattern)
  match = cleanPath.match(combinedPattern);
  if (match) {
    return {
      type: 'combined',
      identifier: match[1],
      secondaryIdentifier: match[2],
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