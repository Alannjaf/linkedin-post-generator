'use client';

import { useState } from 'react';
import { Language, Tone, GeneratedHook, HookStyle } from '@/types';
import { htmlToPlainText, plainTextToHtml } from '@/lib/linkedin-formatter';

interface HookGeneratorProps {
  postContent: string;
  language: Language;
  tone: Tone;
  onHookSelected: (hook: string) => void;
}

const HOOK_STYLE_LABELS: Record<HookStyle, { en: string; ku: string }> = {
  question: { en: 'Question', ku: 'پرسیار' },
  statement: { en: 'Statement', ku: 'دەربڕین' },
  story: { en: 'Story', ku: 'چیرۆک' },
  statistic: { en: 'Statistic', ku: 'ئامار' },
  any: { en: 'Any Style', ku: 'هەموو جۆر' },
};

export default function HookGenerator({
  postContent,
  language,
  tone,
  onHookSelected,
}: HookGeneratorProps) {
  const [hooks, setHooks] = useState<GeneratedHook[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHookStyle, setSelectedHookStyle] = useState<HookStyle>('any');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerateHooks = async () => {
    if (!postContent.trim()) {
      setError(language === 'kurdish' ? 'پۆستەکە بەتاڵە' : 'Post content is empty');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const plainTextContent = htmlToPlainText(postContent);
      const response = await fetch('/api/hooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent: plainTextContent,
          language,
          tone,
          hookStyle: selectedHookStyle === 'any' ? undefined : selectedHookStyle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setHooks(data.hooks || []);
      setIsExpanded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate hooks';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseHook = (hook: string) => {
    const plainTextContent = htmlToPlainText(postContent);
    const lines = plainTextContent.split('\n').filter(line => line.trim());
    
    // Replace first line with hook, or prepend if no content
    if (lines.length > 0) {
      lines[0] = hook;
    } else {
      lines.unshift(hook);
    }
    
    const newContent = lines.join('\n');
    const htmlContent = plainTextToHtml(newContent);
    onHookSelected(htmlContent);
  };

  const getStyleLabel = (style: HookStyle): string => {
    return language === 'kurdish' ? HOOK_STYLE_LABELS[style].ku : HOOK_STYLE_LABELS[style].en;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {language === 'kurdish' ? 'بەرهەمهێنانی هۆک' : 'Hook Generator'}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-gray-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              {language === 'kurdish' ? 'جۆری هۆک' : 'Hook Style'}
            </label>
            <select
              value={selectedHookStyle}
              onChange={(e) => setSelectedHookStyle(e.target.value as HookStyle)}
              disabled={isGenerating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(['any', 'question', 'statement', 'story', 'statistic'] as HookStyle[]).map((style) => (
                <option key={style} value={style}>
                  {getStyleLabel(style)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerateHooks}
            disabled={isGenerating || !postContent.trim()}
            className="w-full mb-4 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{language === 'kurdish' ? 'دروستکردن...' : 'Generating...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{language === 'kurdish' ? 'بەرهەمهێنانی هۆک' : 'Generate Hooks'}</span>
              </>
            )}
          </button>

          {hooks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {language === 'kurdish' ? 'هۆکە دروستکراوەکان:' : 'Generated Hooks:'}
              </h4>
              {hooks.map((hook, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {getStyleLabel(hook.style)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{hook.text}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUseHook(hook.text)}
                    className="mt-2 w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {language === 'kurdish' ? 'بەکارهێنانی ئەم هۆکە' : 'Use This Hook'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
