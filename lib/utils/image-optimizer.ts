/**
 * Utility functions for optimizing and validating images before sending to APIs
 */

/**
 * Check if a base64 data URL is too large
 * @param dataUrl Base64 data URL
 * @param maxSizeMB Maximum size in MB (default: 1MB)
 * @returns Object with isValid flag and size info
 */
export function validateImageSize(
  dataUrl: string,
  maxSizeMB: number = 1
): { isValid: boolean; sizeMB: number; sizeBytes: number } {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return { isValid: true, sizeMB: 0, sizeBytes: 0 };
  }

  // Extract base64 part (after the comma)
  const base64Part = dataUrl.split(',')[1];
  if (!base64Part) {
    return { isValid: true, sizeMB: 0, sizeBytes: 0 };
  }

  // Calculate approximate size (base64 is ~33% larger than binary)
  const sizeBytes = (base64Part.length * 3) / 4;
  const sizeMB = sizeBytes / (1024 * 1024);

  return {
    isValid: sizeMB <= maxSizeMB,
    sizeMB: Math.round(sizeMB * 100) / 100, // Round to 2 decimals
    sizeBytes: Math.round(sizeBytes),
  };
}

/**
 * Optimize a base64 image by creating a smaller version
 * This is a placeholder - actual image compression would require canvas API
 * For now, we'll just validate and warn if too large
 * 
 * @param dataUrl Base64 data URL
 * @param maxSizeMB Maximum size in MB
 * @returns Optimized data URL or original if already small enough
 */
export async function optimizeImage(
  dataUrl: string,
  maxSizeMB: number = 1
): Promise<string> {
  const validation = validateImageSize(dataUrl, maxSizeMB);
  
  if (validation.isValid) {
    return dataUrl;
  }

  // If image is too large, we'll return it anyway
  // In a production environment, you might want to:
  // 1. Use canvas API to resize/compress the image
  // 2. Upload to a CDN and return a URL instead
  // 3. Use a server-side image processing library

  return dataUrl;
}

/**
 * Check if reference image should be included based on size
 * @param referenceImage Base64 data URL or URL
 * @returns Whether to include the reference image
 */
export function shouldIncludeReferenceImage(referenceImage: string | null): boolean {
  if (!referenceImage) {
    return false;
  }

  // If it's not a data URL, assume it's a regular URL and include it
  if (!referenceImage.startsWith('data:')) {
    return true;
  }

  // For base64 data URLs, check size
  const validation = validateImageSize(referenceImage, 1.5); // 1.5MB threshold
  return validation.isValid;
}
