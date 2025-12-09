'use client';

import { useState } from 'react';
import { Language, Tone, PostLength } from '@/types';
import { generatePost } from '@/lib/openrouter';

interface PostGeneratorProps {
  onPostGenerated: (content: string, hashtags: string[], language: Language, tone: Tone, length: PostLength) => void;
  onError: (error: string) => void;
}

export default function PostGenerator({ onPostGenerated, onError }: PostGeneratorProps) {
  const [context, setContext] = useState('');
  const [language, setLanguage] = useState<Language>('english');
  const [tone, setTone] = useState<Tone>('professional');
  const [length, setLength] = useState<PostLength>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!context.trim()) {
      onError('Please provide some context or draft idea');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePost({
        context: context.trim(),
        language,
        tone,
        length,
      });
      onPostGenerated(result.content, result.hashtags, language, tone, length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate post';
      onError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
          Draft Idea / Context
        </label>
        <textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Enter your draft idea, context, or key points for the LinkedIn post..."
          className="w-full min-h-[120px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="english">English</option>
            <option value="kurdish">Kurdish (کوردی)</option>
          </select>
        </div>

        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
            Tone
          </label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="friendly">Friendly</option>
            <option value="inspirational">Inspirational</option>
            <option value="informative">Informative</option>
            <option value="comedy">Comedy</option>
          </select>
        </div>

        <div>
          <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-2">
            Length
          </label>
          <select
            id="length"
            value={length}
            onChange={(e) => setLength(e.target.value as PostLength)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="short">Short (~300 chars)</option>
            <option value="medium">Medium (~800 chars)</option>
            <option value="long">Long (~1500+ chars)</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !context.trim()}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? 'Generating...' : 'Generate Post'}
      </button>
    </div>
  );
}

