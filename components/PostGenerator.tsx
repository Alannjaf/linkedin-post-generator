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
    <div className="space-y-6">
      <div>
        <label htmlFor="context" className="block text-sm font-semibold text-gray-900 mb-3">
          Draft Idea / Context
        </label>
        <textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Enter your draft idea, context, or key points for the LinkedIn post..."
          className="w-full min-h-[140px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y bg-white input-focus transition-all duration-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-semibold text-gray-900 mb-2">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white input-focus transition-all duration-200 font-medium"
          >
            <option value="english">English</option>
            <option value="kurdish">Kurdish (کوردی)</option>
          </select>
        </div>

        <div>
          <label htmlFor="tone" className="block text-sm font-semibold text-gray-900 mb-2">
            Tone
          </label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white input-focus transition-all duration-200 font-medium"
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
          <label htmlFor="length" className="block text-sm font-semibold text-gray-900 mb-2">
            Length
          </label>
          <select
            id="length"
            value={length}
            onChange={(e) => setLength(e.target.value as PostLength)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white input-focus transition-all duration-200 font-medium"
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
        className="w-full bg-blue-600 text-white px-6 py-3.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Post
          </>
        )}
      </button>
    </div>
  );
}

