import { Platform, AdaptedContent } from '@/types';
import { PLATFORM_LIMITS } from './platform-config';
import { htmlToPlainText } from './linkedin-formatter';

export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#([\w\u0600-\u06FF]+)/g;
  const matches = Array.from(content.matchAll(hashtagRegex));
  return matches.map(match => match[1]).filter(tag => tag.length > 0);
}

export function removeHashtags(content: string): string {
  const hashtagRegex = /#([\w\u0600-\u06FF]+)/g;
  return content.replace(hashtagRegex, '').trim();
}

export function limitHashtags(hashtags: string[], maxHashtags: number): string[] {
  return hashtags.slice(0, maxHashtags);
}

export function formatForPlatform(
  content: string,
  platform: Platform,
  originalLength: number
): AdaptedContent {
  const limits = PLATFORM_LIMITS[platform];
  const plainText = htmlToPlainText(content);
  const hashtags = extractHashtags(plainText);
  const contentWithoutHashtags = removeHashtags(plainText);
  
  // Limit hashtags
  const limitedHashtags = limitHashtags(hashtags, limits.maxHashtags || 10);
  
  // Calculate character count
  const hashtagText = limitedHashtags.length > 0 
    ? '\n\n' + limitedHashtags.map(h => `#${h}`).join(' ')
    : '';
  const finalContent = contentWithoutHashtags + hashtagText;
  const characterCount = finalContent.length;
  
  // Determine if truncation was applied
  const truncationApplied = characterCount > limits.maxCharacters;
  
  // Build changes description
  const changes: string[] = [];
  if (originalLength > limits.maxCharacters) {
    changes.push(`Content shortened from ${originalLength} to ${Math.min(characterCount, limits.maxCharacters)} characters`);
  }
  if (hashtags.length > (limits.maxHashtags || 10)) {
    changes.push(`Hashtags reduced from ${hashtags.length} to ${limitedHashtags.length}`);
  }
  if (platform === 'twitter' && limits.supportsThreads && characterCount > limits.maxCharacters) {
    changes.push('Content may need to be split into a thread');
  }
  
  return {
    content: finalContent,
    platform,
    characterCount: Math.min(characterCount, limits.maxCharacters),
    hashtags: limitedHashtags,
    changes,
    metadata: {
      originalLength,
      adaptedLength: Math.min(characterCount, limits.maxCharacters),
      truncationApplied,
    },
  };
}

export function validatePlatformContent(
  content: string,
  platform: Platform
): { valid: boolean; message?: string } {
  const limits = PLATFORM_LIMITS[platform];
  const characterCount = content.length;
  
  if (characterCount > limits.maxCharacters) {
    return {
      valid: false,
      message: `Content exceeds ${platform} limit of ${limits.maxCharacters} characters by ${characterCount - limits.maxCharacters} characters`,
    };
  }
  
  const hashtags = extractHashtags(content);
  if (limits.maxHashtags && hashtags.length > limits.maxHashtags) {
    return {
      valid: false,
      message: `Too many hashtags. Maximum is ${limits.maxHashtags}, found ${hashtags.length}`,
    };
  }
  
  return { valid: true };
}
