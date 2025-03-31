import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get initials from a name (first letter of first name and first letter of last name)
 * @param name Full name or username
 * @returns Initials (1-2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    // If only one word, return the first character
    return name.charAt(0).toUpperCase();
  } else {
    // Return first character of first and last word
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
