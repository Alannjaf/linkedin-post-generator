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
  // Store adapted content per platform
  const [adaptedContentByPlatform, setAdaptedContentByPlatform] = useState<Record<Platform, AdaptedContent | null>>({
    twitter: null,
    facebook: null,
    medium: null,
    instagram: null,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const adaptedContent = adaptedContentByPlatform[selectedPlatform];

  const handleAdapt = async () => {
    if (!postContent.trim()) {
      setError(language === 'kurdish' ? 'پۆستەکە بەتاڵە' : 'Post content is empty');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

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
      // Store in the per-platform state
      setAdaptedContentByPlatform(prev => ({
        ...prev,
        [selectedPlatform]: data.adaptedContent,
      }));
      setIsExpanded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to adapt content';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!adaptedContent) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/adapted-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceContent: htmlToPlainText(postContent),
          platform: selectedPlatform,
          adaptedContent: adaptedContent.content,
          characterCount: adaptedContent.characterCount,
          changes: adaptedContent.changes,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      setSuccessMessage(language === 'kurdish' ? 'پاشەکەوت کرا بە سەرکەوتوویی' : 'Saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError(language === 'kurdish' ? 'هەڵە لە پاشەکەوتکردن' : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!adaptedContent) return;

    try {
      await navigator.clipboard.writeText(adaptedContent.content);
      setSuccessMessage(language === 'kurdish' ? 'کۆپی کرا!' : 'Copied!');
      setTimeout(() => setSuccessMessage(null), 2000);
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

  // Check which platforms have generated content
  const platformsWithContent = PLATFORMS.filter(p => adaptedContentByPlatform[p] !== null);

  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors duration-200"
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {language === 'kurdish' ? 'گونجاندن بۆ پلاتفۆرمەکان' : 'Cross-Platform Adapter'}
          {platformsWithContent.length > 0 && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
              {platformsWithContent.length} {language === 'kurdish' ? 'دروستکراو' : 'generated'}
            </span>
          )}
        </h3>
        <svg
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-[var(--border-default)]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border-l-4 border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/10 border-l-4 border-green-500 rounded text-green-400 text-sm">
              {successMessage}
            </div>
          )}

          {/* Platform Selector */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              {language === 'kurdish' ? 'پلاتفۆرم' : 'Platform'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(platform);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  disabled={isGenerating}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors relative ${selectedPlatform === platform
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {getPlatformLabel(platform, language)}
                  {/* Show indicator if platform has content */}
                  {adaptedContentByPlatform[platform] && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {language === 'kurdish'
                ? `سنووری پیت: ${limits.maxCharacters} | سنووری هاشتاگ: ${limits.maxHashtags || 'بێ سنوور'}`
                : `Character limit: ${limits.maxCharacters} | Hashtag limit: ${limits.maxHashtags || 'unlimited'}`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdapt}
            disabled={isGenerating || !postContent.trim()}
            className="w-full mb-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2.5 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
                <span>
                  {adaptedContent
                    ? (language === 'kurdish' ? 'نوێکردنەوە' : 'Regenerate')
                    : (language === 'kurdish' ? 'گونجاندن' : 'Adapt Content')}
                </span>
              </>
            )}
          </button>

          {adaptedContent && (
            <div className="space-y-4">
              {/* Character Count */}
              <div className="flex items-center justify-between p-3 glass-card">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {language === 'kurdish' ? 'ژمارەی پیتەکان:' : 'Character Count:'}
                </span>
                <span className={`text-sm font-semibold ${adaptedContent.characterCount > limits.maxCharacters
                    ? 'text-red-400'
                    : adaptedContent.characterCount > limits.maxCharacters * 0.9
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}>
                  {adaptedContent.characterCount} / {limits.maxCharacters}
                </span>
              </div>

              {/* Changes Summary */}
              {adaptedContent.changes.length > 0 && (
                <div className="p-3 bg-blue-500/10 border-l-4 border-blue-500 rounded">
                  <p className="text-sm font-semibold text-blue-400 mb-2">
                    {language === 'kurdish' ? 'گۆڕانکاریەکان:' : 'Changes:'}
                  </p>
                  <ul className="text-xs text-blue-300 space-y-1">
                    {adaptedContent.changes.map((change, index) => (
                      <li key={index}>• {change}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Adapted Content Preview */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  {language === 'kurdish' ? 'پێشبینینی ناوەڕۆک:' : 'Adapted Content Preview:'}
                </label>
                <div className="p-4 glass-card max-h-96 overflow-y-auto">
                  <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
                    {adaptedContent.content}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-primary py-2 text-sm justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {language === 'kurdish' ? 'کۆپی' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  disabled={isSaving}
                  className="btn-secondary py-2 text-sm justify-center"
                >
                  {isSaving ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )}
                  {language === 'kurdish' ? 'پاشەکەوت' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="btn-secondary py-2 text-sm justify-center"
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
