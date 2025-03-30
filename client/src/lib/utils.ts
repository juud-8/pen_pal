import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generic file saving utility
 * @param content The content to save
 * @param filename The filename to save as
 * @param contentType The content type (MIME type)
 */
export function save(content: string, filename: string, contentType: string) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  
  // Clean up
  URL.revokeObjectURL(a.href);
}
