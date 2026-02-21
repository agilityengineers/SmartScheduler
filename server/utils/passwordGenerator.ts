import crypto from 'crypto';

/**
 * Generates a simple, easy-to-type password
 * Uses uppercase letters, lowercase letters, and numbers only
 * @param length - Length of the password (default: 8)
 * @returns A randomly generated password
 */
export function generateSimplePassword(length: number = 8): string {
  // Character sets - no special characters for ease of typing
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded I and O to avoid confusion with 1 and 0
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Excluded i, l, o to avoid confusion
  const numbers = '23456789'; // Excluded 0 and 1 to avoid confusion with O and l

  const allChars = uppercase + lowercase + numbers;

  // Ensure at least one of each type
  let password = '';

  // Add one character from each required set
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];

  // Fill the rest with random characters from all sets
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password to randomize character positions
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}
