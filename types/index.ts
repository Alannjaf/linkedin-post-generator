export type Language = 'kurdish' | 'english';

export type Tone = 'professional' | 'casual' | 'friendly' | 'inspirational' | 'informative';

export type PostLength = 'short' | 'medium' | 'long';

export interface Draft {
  id: string;
  title: string;
  content: string;
  language: Language;
  tone: Tone;
  length: PostLength;
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PostGenerationParams {
  context: string;
  language: Language;
  tone: Tone;
  length: PostLength;
}

export interface GeneratedPost {
  content: string;
  hashtags: string[];
}

