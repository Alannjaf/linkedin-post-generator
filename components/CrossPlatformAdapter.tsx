'use client';

import { useState } from 'react';
import { Language, Platform, AdaptedContent } from '@/types';
import { getPlatformLabel, getPlatformLimits } from '@/lib/platform-config';
import { htmlToPlainText } from '@/lib/linkedin-formatter';

interface CrossPlatformAdapterProps {
  postContent: string;
  language: Language;
}

const PLATFORMS: Platform[] = ['twitter', 'facebook', 'medium', 'instagram'];

export default function CrossPlatformAdapter({
  postContent,
  language,
}: CrossPlatformAdapterProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('twitter');
  const [adaptedContent, setAdaptedContent] = useState<AdaptedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAdapt = async () => {
    if (!postContent.trim()) {
      setError(language === 'kurdish' ? 'پۆستەکە بەتاڵە' : 'Post content is empty');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/adapt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent,
          sourceLanguage: language,
          targetPlatform: selectedPlatform,
          preserveTone: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setAdaptedContent(data.adaptedContent);
      setIsExpanded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to adapt content';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!adaptedContent) return;
    
    try {
      await navigator.clipboard.writeText(adaptedContent.content);
      setError(null);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleExport = () => {
    if (!adaptedContent) return;
    
    const blob = new Blob([adaptedContent.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPlatform}-post-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const limits = getPlatformLimits(selectedPlatform);
  const originalLength = htmlToPlainText(postContent).length;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {language === 'kurdish' ? 'گونجاندن بۆ پلاتفۆرمەکان' : 'Cross-Platform Adapter'}
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

          {/* Platform Selector */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              {language === 'kurdish' ? 'پلاتفۆرم' : 'Platform'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(platform);
                    setAdaptedContent(null);
                  }}
                  disabled={isGenerating}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedPlatform === platform
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {getPlatformLabel(platform, language)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {language === 'kurdish' 
                ? `سنووری پیت: ${limits.maxCharacters} | سنووری هاشتاگ: ${limits.maxHashtags || 'بێ سنوور'}`
                : `Character limit: ${limits.maxCharacters} | Hashtag limit: ${limits.maxHashtags || 'unlimited'}`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdapt}
            disabled={isGenerating || !postContent.trim()}
            className="w-full mb-4 bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{language === 'kurdish' ? 'گونجاندن...' : 'Adapting...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>{language === 'kurdish' ? 'گونجاندن' : 'Adapt Content'}</span>
              </>
            )}
          </button>

          {adaptedContent && (
            <div className="space-y-4">
              {/* Character Count */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {language === 'kurdish' ? 'ژمارەی پیتەکان:' : 'Character Count:'}
                </span>
                <span className={`text-sm font-semibold ${
                  adaptedContent.characterCount > limits.maxCharacters
                    ? 'text-red-600'
                    : adaptedContent.characterCount > limits.maxCharacters * 0.9
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  {adaptedContent.characterCount} / {limits.maxCharacters}
                </span>
              </div>

              {/* Changes Summary */}
              {adaptedContent.changes.length > 0 && (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    {language === 'kurdish' ? 'گۆڕانکاریەکان:' : 'Changes:'}
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {adaptedContent.changes.map((change, index) => (
                      <li key={index}>• {change}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Adapted Content Preview */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {language === 'kurdish' ? 'پێشبینینی ناوەڕۆک:' : 'Adapted Content Preview:'}
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                    {adaptedContent.content}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {language === 'kurdish' ? 'کۆپی' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {language === 'kurdish' ? 'دەرهێنان' : 'Export'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
