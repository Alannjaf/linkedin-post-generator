import { BuiltInTone, Language, ToneMix, CustomTone } from '@/types';
import { TONE_DESCRIPTIONS } from './prompts';
import { getCustomTone } from './db';

/**
 * Validates that tone mix percentages sum to 100%
 */
export function validateToneMix(toneMix: ToneMix[]): { valid: boolean; error?: string } {
  if (!toneMix || toneMix.length === 0) {
    return { valid: false, error: 'Tone mix must contain at least one tone' };
  }

  const total = toneMix.reduce((sum, mix) => sum + mix.percentage, 0);
  
  if (Math.abs(total - 100) > 0.01) {
    return { valid: false, error: `Tone mix percentages must sum to 100% (currently ${total}%)` };
  }

  // Validate all percentages are positive
  for (const mix of toneMix) {
    if (mix.percentage < 0 || mix.percentage > 100) {
      return { valid: false, error: `Percentage for ${mix.tone} must be between 0 and 100` };
    }
  }

  return { valid: true };
}

/**
 * Creates a hash from tone mix for consistent identification
 */
export function createToneMixHash(toneMix: ToneMix[]): string {
  const sorted = [...toneMix].sort((a, b) => a.tone.localeCompare(b.tone));
  const mixString = sorted.map(m => `${m.tone}:${m.percentage}`).join(',');
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < mixString.length; i++) {
    const char = mixString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a combined tone description from multiple tones with percentages
 */
export function generateMixedToneDescription(
  toneMix: ToneMix[],
  language: Language
): string {
  if (!toneMix || toneMix.length === 0) {
    return '';
  }

  // Sort by percentage (descending) to emphasize dominant tones
  const sorted = [...toneMix]
    .filter(mix => mix.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  if (sorted.length === 0) {
    return '';
  }

  // If single tone at 100%, return its description
  if (sorted.length === 1 && sorted[0].percentage === 100) {
    return TONE_DESCRIPTIONS[sorted[0].tone][language];
  }

  // Build combined description
  const descriptions: string[] = [];
  
  for (const mix of sorted) {
    const desc = TONE_DESCRIPTIONS[mix.tone][language];
    if (mix.percentage >= 50) {
      descriptions.push(desc);
    } else if (mix.percentage >= 25) {
      descriptions.push(`with elements of ${desc}`);
    } else {
      descriptions.push(`with a touch of ${desc}`);
    }
  }

  if (language === 'kurdish') {
    return descriptions.join('، ');
  } else {
    return descriptions.join(', ');
  }
}

/**
 * Gets tone description for any tone type (built-in, custom, or mixed)
 */
export async function getToneDescription(
  tone: string,
  language: Language
): Promise<string> {
  // Built-in tone
  if (isBuiltInTone(tone)) {
    return TONE_DESCRIPTIONS[tone][language];
  }

  // Custom tone (format: "custom:123")
  if (tone.startsWith('custom:')) {
    const id = parseInt(tone.split(':')[1], 10);
    if (isNaN(id)) {
      return '';
    }

    const customTone = await getCustomTone(id);
    if (!customTone) {
      return '';
    }

    // Type assertion since getCustomTone returns properly typed CustomTone
    const customToneData = customTone as CustomTone;

    // If custom tone has a tone mix, generate mixed description
    if (customToneData.toneMix && customToneData.toneMix.length > 0) {
      return generateMixedToneDescription(customToneData.toneMix, language);
    }

    // Otherwise use custom description
    return language === 'english' 
      ? customToneData.descriptionEnglish 
      : customToneData.descriptionKurdish;
  }

  // Mixed tone (format: "mixed:hash")
  // This would need to be stored/retrieved, but for now we'll handle it differently
  // Mixed tones should be created as custom tones with toneMix
  return '';
}

/**
 * Checks if a tone string is a built-in tone
 */
export function isBuiltInTone(tone: string): tone is BuiltInTone {
  return ['professional', 'casual', 'friendly', 'inspirational', 'informative', 'comedy'].includes(tone);
}

/**
 * Parses a tone string to determine its type
 */
export function parseToneType(tone: string): 'built-in' | 'custom' | 'mixed' {
  if (isBuiltInTone(tone)) {
    return 'built-in';
  }
  if (tone.startsWith('custom:')) {
    return 'custom';
  }
  if (tone.startsWith('mixed:')) {
    return 'mixed';
  }
  // Default to built-in for backward compatibility
  return 'built-in';
}
