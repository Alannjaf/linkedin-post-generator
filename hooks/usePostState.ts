'use client';

import { useState, useCallback } from 'react';
import { Language, Tone, PostLength, GeneratedCarousel } from '@/types';
import { plainTextToHtml } from '@/lib/linkedin-formatter';

export interface UsePostStateReturn {
  // State
  postContent: string;
  hashtags: string[];
  selectedHashtags: string[];
  currentLanguage: Language;
  currentTone: Tone;
  currentLength: PostLength;
  originalContext: string;
  currentDraftId: string | null;
  currentCarousel: GeneratedCarousel | null;

  // Setters
  setPostContent: (content: string) => void;
  setHashtags: (hashtags: string[]) => void;
  setSelectedHashtags: (hashtags: string[]) => void;
  setCurrentLanguage: (language: Language) => void;
  setCurrentTone: (tone: Tone) => void;
  setCurrentLength: (length: PostLength) => void;
  setOriginalContext: (context: string) => void;
  setCurrentDraftId: (id: string | null) => void;
  setCurrentCarousel: (carousel: GeneratedCarousel | null) => void;

  // Actions
  handlePostGenerated: (content: string, generatedHashtags: string[], language: Language, tone: Tone, length: PostLength, context: string) => void;
  handleAddHashtag: (hashtag: string) => void;
  handleRemoveHashtag: (hashtag: string) => void;
  handleClear: () => void;
}

export function usePostState(): UsePostStateReturn {
  const [postContent, setPostContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [currentTone, setCurrentTone] = useState<Tone>('professional');
  const [currentLength, setCurrentLength] = useState<PostLength>('medium');
  const [originalContext, setOriginalContext] = useState<string>('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [currentCarousel, setCurrentCarousel] = useState<GeneratedCarousel | null>(null);

  const handlePostGenerated = useCallback((
    content: string,
    generatedHashtags: string[],
    language: Language,
    tone: Tone,
    length: PostLength,
    context: string
  ) => {
    // Convert plain text to HTML if it's not already HTML
    let htmlContent = content;
    if (content && !content.includes('<') && !content.includes('>')) {
      htmlContent = plainTextToHtml(content);
    }

    setPostContent(htmlContent);
    setHashtags(generatedHashtags);
    setSelectedHashtags([]);
    setCurrentLanguage(language);
    setCurrentTone(tone);
    setCurrentLength(length);
    setOriginalContext(context);
    setCurrentDraftId(null); // New generation, clear draft ID
  }, []);

  const handleAddHashtag = useCallback((hashtag: string) => {
    setSelectedHashtags(prev => {
      if (!prev.includes(hashtag)) {
        return [...prev, hashtag];
      }
      return prev;
    });
  }, []);

  const handleRemoveHashtag = useCallback((hashtag: string) => {
    setSelectedHashtags(prev => prev.filter((h) => h !== hashtag));
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all content?')) {
      setPostContent('');
      setHashtags([]);
      setSelectedHashtags([]);
      setOriginalContext('');
      setCurrentDraftId(null); // Clear draft ID when clearing content
    }
  }, []);

  return {
    // State
    postContent,
    hashtags,
    selectedHashtags,
    currentLanguage,
    currentTone,
    currentLength,
    originalContext,
    currentDraftId,
    currentCarousel,

    // Setters
    setPostContent,
    setHashtags,
    setSelectedHashtags,
    setCurrentLanguage,
    setCurrentTone,
    setCurrentLength,
    setOriginalContext,
    setCurrentDraftId,
    setCurrentCarousel,

    // Actions
    handlePostGenerated,
    handleAddHashtag,
    handleRemoveHashtag,
    handleClear,
  };
}
