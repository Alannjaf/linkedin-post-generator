export type Language = 'kurdish' | 'english';

export type BuiltInTone = 'professional' | 'casual' | 'friendly' | 'inspirational' | 'informative' | 'comedy';

// Tone can be a built-in tone or a custom tone ID (format: "custom:123") or mixed tone (format: "mixed:hash")
export type Tone = BuiltInTone | string;

export type PostLength = 'short' | 'medium' | 'long';

export interface ToneMix {
  tone: BuiltInTone;
  percentage: number;
}

export interface CustomTone {
  id: number;
  name: string;
  descriptionEnglish: string;
  descriptionKurdish: string;
  industry?: string;
  isPreset: boolean;
  toneMix?: ToneMix[];
  createdAt: string;
  updatedAt: string;
}

export type IndustryPreset = 'technology' | 'finance' | 'healthcare' | 'marketing' | 'education' | 'startup';

export interface Draft {
  id: string;
  title: string;
  content: string;
  language: Language;
  tone: Tone;
  length: PostLength;
  hashtags: string[];
  generatedImage?: string | null;
  imagePrompt?: string;
  editedImagePrompt?: string;
  originalContext?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostGenerationParams {
  context: string;
  language: Language;
  tone: Tone;
  length: PostLength;
  trendingHashtags?: string[]; // Optional trending hashtags from similar posts
}

export interface GeneratedPost {
  content: string;
  hashtags: string[];
}

export interface TrendingPost {
  id: string;
  content: string;
  author: {
    name: string;
    profileUrl: string;
    company?: string;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    totalReactions: number;
    reactionBreakdown: { type: string; count: number }[];
  };
  postUrl: string;
  postedAt: string;
  postType: 'text' | 'poll' | 'video' | 'image';
  hashtags: string[];
}

export interface TrendingPostsSearchParams {
  query: string;
  limit?: number;
  offsite?: number;
  minEngagement?: number;
}

export interface SavedTrendingPost {
  id: number;
  postId: string;
  post: TrendingPost;
  savedAt: string;
  notes?: string;
}

export interface CreateCustomToneRequest {
  name: string;
  descriptionEnglish: string;
  descriptionKurdish: string;
  industry?: string;
  toneMix?: ToneMix[];
}

export interface UpdateCustomToneRequest {
  name?: string;
  descriptionEnglish?: string;
  descriptionKurdish?: string;
  industry?: string;
  toneMix?: ToneMix[];
}

