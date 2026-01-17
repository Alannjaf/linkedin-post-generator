'use client';

import { useState, useCallback } from 'react';
import { Language, Tone } from '@/types';

export interface UseImageGenerationReturn {
  // State
  generatedImage: string | null;
  isGeneratingImage: boolean;
  isGeneratingImagePrompt: boolean;
  imagePrompt: string;
  editedImagePrompt: string;
  isImagePromptExpanded: boolean;
  isGeneratedImageExpanded: boolean;
  
  // Setters
  setGeneratedImage: (image: string | null) => void;
  setImagePrompt: (prompt: string) => void;
  setEditedImagePrompt: (prompt: string) => void;
  setIsImagePromptExpanded: (expanded: boolean) => void;
  setIsGeneratedImageExpanded: (expanded: boolean) => void;
  setIsGeneratingImage: (generating: boolean) => void;
  setIsGeneratingImagePrompt: (generating: boolean) => void;
  
  // Actions
  handleGenerateImagePrompt: (postContent: string, language: Language, tone: Tone, context: string, setSuccess: (msg: string) => void, setError: (msg: string) => void) => Promise<void>;
  handleGenerateImage: (postContent: string, language: Language, tone: Tone, context: string, setSuccess: (msg: string) => void, setError: (msg: string) => void) => Promise<void>;
  clearImageState: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [editedImagePrompt, setEditedImagePrompt] = useState<string>('');
  const [isImagePromptExpanded, setIsImagePromptExpanded] = useState(false);
  const [isGeneratedImageExpanded, setIsGeneratedImageExpanded] = useState(false);

  const handleGenerateImagePrompt = useCallback(async (
    postContent: string,
    language: Language,
    tone: Tone,
    context: string,
    setSuccess: (msg: string) => void,
    setError: (msg: string) => void
  ) => {
    if (!postContent.trim()) {
      setError('Please generate a post first');
      return;
    }

    setIsGeneratingImagePrompt(true);
    setError('');
    setSuccess('Analyzing post content and generating image prompt...');

    try {
      const response = await fetch('/api/generate-image-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent,
          language,
          tone,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedPrompt = data.prompt;

      if (!generatedPrompt) {
        throw new Error('No prompt generated');
      }

      setImagePrompt(generatedPrompt);
      setEditedImagePrompt(generatedPrompt);
      setIsImagePromptExpanded(true);
      setSuccess('Image prompt generated! Review and edit if needed, then click Generate Image.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate prompt';
      setError(errorMessage);
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  }, []);

  const handleGenerateImage = useCallback(async (
    postContent: string,
    language: Language,
    tone: Tone,
    context: string,
    setSuccess: (msg: string) => void,
    setError: (msg: string) => void,
    editedPrompt?: string
  ) => {
    if (!postContent.trim()) {
      setError('Please generate a post first');
      return;
    }

    // Use edited prompt if available, otherwise generate a new one using AI
    let promptToUse = (editedPrompt || editedImagePrompt).trim();
    
    if (!promptToUse) {
      // If no edited prompt, generate one using AI
      setSuccess('Generating image prompt with AI...');
      try {
        const promptResponse = await fetch('/api/generate-image-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postContent,
            language,
            tone,
            context,
          }),
        });

        if (!promptResponse.ok) {
          const errorData = await promptResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate prompt');
        }

        const promptData = await promptResponse.json();
        promptToUse = promptData.prompt;
        setImagePrompt(promptToUse);
        setEditedImagePrompt(promptToUse);
        setIsImagePromptExpanded(true);
      } catch (error) {
        setError('Failed to generate image prompt');
        return;
      }
    }

    setIsGeneratingImage(true);
    setIsGeneratedImageExpanded(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imagePrompt: promptToUse }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setIsGeneratedImageExpanded(true);
        setSuccess('Image generated successfully!');
      } else {
        throw new Error('No image URL received');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      setError(errorMessage);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [editedImagePrompt, setImagePrompt, setEditedImagePrompt, setIsImagePromptExpanded]);

  const clearImageState = useCallback(() => {
    setImagePrompt('');
    setEditedImagePrompt('');
    setGeneratedImage(null);
    setIsImagePromptExpanded(false);
    setIsGeneratedImageExpanded(false);
  }, []);

  return {
    // State
    generatedImage,
    isGeneratingImage,
    isGeneratingImagePrompt,
    imagePrompt,
    editedImagePrompt,
    isImagePromptExpanded,
    isGeneratedImageExpanded,
    
    // Setters
    setGeneratedImage,
    setImagePrompt,
    setEditedImagePrompt,
    setIsImagePromptExpanded,
    setIsGeneratedImageExpanded,
    setIsGeneratingImage,
    setIsGeneratingImagePrompt,
    
    // Actions
    handleGenerateImagePrompt,
    handleGenerateImage,
    clearImageState,
  };
}
