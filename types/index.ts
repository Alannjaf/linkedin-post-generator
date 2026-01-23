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
  enableWebSearch?: boolean; // Enable web search for real-time information
}

export interface WebSearchCitation {
  url: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface GeneratedPost {
  content: string;
  hashtags: string[];
  citations?: WebSearchCitation[]; // Web search citations if web search was enabled
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

export type HookStyle = 'question' | 'statement' | 'story' | 'statistic' | 'any';

export interface GeneratedHook {
  text: string;
  style: HookStyle;
  reasoning?: string;
}

export interface CTAPlacement {
  position: 'start' | 'middle' | 'end' | 'embedded';
  suggestion: string;
}

export interface GeneratedCTA {
  text: string;
  placement: CTAPlacement;
  effectivenessScore?: number;
  reasoning?: string;
}

export type Platform = 'twitter' | 'facebook' | 'medium' | 'instagram';

export interface PlatformLimits {
  maxCharacters: number;
  maxHashtags?: number;
  supportsThreads?: boolean;
  supportsFormatting?: boolean;
}

export interface AdaptedContent {
  content: string;
  platform: Platform;
  characterCount: number;
  hashtags: string[];
  changes: string[];
  metadata: {
    originalLength: number;
    adaptedLength: number;
    truncationApplied: boolean;
  };
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  content: string;
  imageSuggestion?: string;
  characterCount: number;
  keyPoints?: string[];
}

export interface GeneratedCarousel {
  id?: string; // Optional ID for saved/loaded carousels
  slideImages?: Record<number, string>; // Map of slide number to image URL
  slides: CarouselSlide[];
  totalSlides: number;
  introduction?: string;
  conclusion?: string;
  hashtags: string[];
  imageTheme?: string;
  brandingGuidelines?: string;
  metadata: {
    originalLength: number;
    carouselLength: number;
    averageSlideLength: number;
  };
}

// Database row types
export interface TrendingPostsCacheRow {
  id: number;
  search_query: string;
  posts_data: TrendingPost[] | string; // Can be JSONB string or parsed array
  engagement_summary?: {
    totalPosts: number;
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    avgTotalEngagement: number;
    totalHashtags: Record<string, number>;
    postTypeDistribution: Record<string, number>;
  } | null;
  cached_at: string;
  expires_at: string;
}


export interface SavedPostRow {
  id: number;
  post_id: string;
  post_data: TrendingPost;
  saved_at: string;
  notes?: string | null;
}

export interface SwipeFilePost {
  id: number;
  content: string;
  author_name: string;
  author_profile_url?: string | null;
  post_url?: string | null;
  likes: number;
  comments: number;
  saved_at: string;
  notes?: string | null;
}

export interface CustomToneRow {
  id: number;
  name: string;
  description_english: string;
  description_kurdish: string;
  industry?: string | null;
  is_preset: boolean;
  tone_mix?: ToneMix[] | null;
  created_at: string;
  updated_at: string;
}

export interface DraftRow {
  id: string;
  title: string;
  content: string;
  language: Language;
  tone: Tone;
  length: PostLength;
  hashtags: string[];
  generated_image?: string | null;
  image_prompt?: string | null;
  edited_image_prompt?: string | null;
  original_context?: string | null;
  created_at: string;
  updated_at: string;
}

// LinkedIn API response types for parsing
export interface LinkedInAPIPostItem {
  item?: {
    searchFeedUpdate?: {
      update?: {
        commentary?: {
          text?: {
            text?: string;
          };
        };
        socialDetail?: {
          totalSocialActivityCounts?: {
            numLikes?: number;
            numComments?: number;
            numShares?: number;
            reactionTypeCounts?: Array<{
              reactionType?: string;
              count?: number;
            }>;
          };
        };
        actor?: {
          name?: {
            text?: string;
          };
          navigationContext?: {
            actionTarget?: string;
          };
          supplementaryActorInfo?: {
            text?: string;
          };
          description?: {
            text?: string;
          };
          subDescription?: {
            text?: string;
          };
        };
        socialContent?: {
          shareUrl?: string;
        };
        backendUrn?: string;
        shareUrn?: string;
        content?: {
          pollComponent?: unknown;
          linkedInVideoComponent?: unknown;
          imageComponent?: unknown;
        };
      };
      socialContent?: {
        shareUrl?: string;
      };
    };
  };
}

export interface LinkedInAPIResponse {
  data?: {
    elements?: Array<{
      items?: LinkedInAPIPostItem[];
    }>;
    paging?: {
      total?: number;
    };
  };
  success?: boolean;
  message?: string;
}
