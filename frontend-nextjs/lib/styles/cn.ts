import clsx, { type ClassValue } from 'clsx';

/**
 * Combines class names using clsx
 * Utility for conditionally joining class names together
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
