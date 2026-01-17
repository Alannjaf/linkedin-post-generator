export type Language = 'kurdish' | 'english';

export type Tone = 'professional' | 'casual' | 'friendly' | 'inspirational' | 'informative' | 'comedy';

export type PostLength = 'short' | 'medium' | 'long';

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

