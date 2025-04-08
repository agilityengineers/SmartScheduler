import { User } from "@shared/schema";

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
 * Checks if there's a name collision with any other user
 * 
 * @param user The current user
 * @param allUsers All users in the system
 * @returns true if there's a collision, false otherwise
 */
export function hasNameCollision(user: User, allUsers: User[]): boolean {
  // Generate path for current user
  const userPath = generateUserUrlPath(user);
  
  // Check if any other user has the same path
  return allUsers.some(otherUser => 
    otherUser.id !== user.id && generateUserUrlPath(otherUser) === userPath
  );
}

/**
 * Generates a unique URL-friendly path segment for a user,
 * taking into account potential name collisions.
 * 
 * @param user The user object to generate a path for
 * @param allUsers All users in the system (to check for collisions)
 * @returns A unique URL-friendly path segment
 */
export function generateUniqueUserPath(user: User, allUsers: User[]): string {
  // If there's a name collision, always use username
  if (hasNameCollision(user, allUsers)) {
    return user.username.toLowerCase();
  }
  
  // Otherwise use the regular path generation
  return generateUserUrlPath(user);
}