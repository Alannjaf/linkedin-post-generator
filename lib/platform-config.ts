import { Platform, PlatformLimits } from '@/types';

export const PLATFORM_LIMITS: Record<Platform, PlatformLimits> = {
  twitter: {
    maxCharacters: 280,
    maxHashtags: 3,
    supportsThreads: true,
    supportsFormatting: false,
  },
  facebook: {
    maxCharacters: 5000,
    maxHashtags: 10,
    supportsThreads: false,
    supportsFormatting: true,
  },
  medium: {
    maxCharacters: 10000,
    maxHashtags: 5,
    supportsThreads: false,
    supportsFormatting: true,
  },
  instagram: {
    maxCharacters: 2200,
    maxHashtags: 30,
    supportsThreads: false,
    supportsFormatting: false,
  },
};

export const PLATFORM_LABELS: Record<Platform, { en: string; ku: string }> = {
  twitter: { en: 'Twitter/X', ku: 'Twitter/X' },
  facebook: { en: 'Facebook', ku: 'Facebook' },
  medium: { en: 'Medium', ku: 'Medium' },
  instagram: { en: 'Instagram', ku: 'Instagram' },
};

export function getPlatformLabel(platform: Platform, language: 'english' | 'kurdish'): string {
  return language === 'kurdish' ? PLATFORM_LABELS[platform].ku : PLATFORM_LABELS[platform].en;
}

export function getPlatformLimits(platform: Platform): PlatformLimits {
  return PLATFORM_LIMITS[platform];
}
