'use client';

import { useState } from 'react';
import HookGenerator from '@/components/HookGenerator';
import CTAOptimizer from '@/components/CTAOptimizer';
import CrossPlatformAdapter from '@/components/CrossPlatformAdapter';
import CarouselGenerator from '@/components/CarouselGenerator';
import { Language, Tone } from '@/types';
import { UseImageGenerationReturn } from '@/hooks/useImageGeneration';

interface EnhancementSectionProps {
  postContent: string;
  currentLanguage: Language;
  currentTone: Tone;
  imageGeneration: UseImageGenerationReturn;
  onPostContentChange: (content: string) => void;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function EnhancementSection({
  postContent,
  currentLanguage,
  currentTone,
  imageGeneration,
  onPostContentChange,
  onToast,
}: EnhancementSectionProps) {
  const [enhancementTab, setEnhancementTab] = useState<'content' | 'formatting' | 'media'>('content');

  const tabs = [
    { id: 'content' as const, label: 'Content', icon: '📝' },
    { id: 'formatting' as const, label: 'Formatting', icon: '✨' },
    { id: 'media' as const, label: 'Media', icon: '🎨' },
  ];

  return (
    <div id="enhance-section" className="mt-8 lg:mt-12">
      <div className="glass-card gradient-border p-6 sm:p-8">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Post Enhancements
        </h3>

        {/* Modern Pill Tabs */}
        <div className="flex gap-2 p-1 bg-[var(--bg-input)] rounded-xl mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEnhancementTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                font-medium text-sm transition-all duration-200
                ${enhancementTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4 animate-fade-in">
          {enhancementTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HookGenerator
                postContent={postContent}
                language={currentLanguage}
                tone={currentTone}
                onHookSelected={(newContent) => {
                  onPostContentChange(newContent);
                  onToast('Hook applied to post!', 'success');
                }}
              />
              <CTAOptimizer
                postContent={postContent}
                language={currentLanguage}
                tone={currentTone}
                onCTASelected={(newContent, position) => {
                  onPostContentChange(newContent);
                  onToast('CTA inserted into post!', 'success');
                }}
              />
            </div>
          )}

          {enhancementTab === 'formatting' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CrossPlatformAdapter
                postContent={postContent}
                language={currentLanguage}
              />
              <CarouselGenerator
                postContent={postContent}
                language={currentLanguage}
                tone={currentTone}
                onCarouselSelected={(newContent) => {
                  onPostContentChange(newContent);
                  onToast('Carousel applied to post!', 'success');
                }}
              />
            </div>
          )}

          {enhancementTab === 'media' && (
            <div className="space-y-4">
              {/* Image Prompt Section */}
              {imageGeneration.editedImagePrompt && (
                <div className="glass-card p-4">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </span>
                    Image Generation Prompt
                  </h4>
                  <textarea
                    value={imageGeneration.editedImagePrompt}
                    onChange={(e) => imageGeneration.setEditedImagePrompt(e.target.value)}
                    className="input-field min-h-[100px] resize-y font-mono text-sm"
                    placeholder="Image prompt will appear here..."
                  />
                </div>
              )}

              {/* Generated Image Section */}
              {imageGeneration.generatedImage && (
                <div className="glass-card p-4">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    Generated Image
                  </h4>
                  <div className="rounded-xl overflow-hidden shadow-lg border border-[var(--border-default)]">
                    <img
                      src={imageGeneration.generatedImage}
                      alt="Generated LinkedIn post image"
                      className="w-full h-auto"
                      onError={() => {
                        onToast('Failed to load image. The image URL might be invalid.', 'error');
                        imageGeneration.setGeneratedImage(null);
                      }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = imageGeneration.generatedImage!;
                        link.download = 'linkedin-post-image.png';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        onToast('Image download started!', 'success');
                      }}
                      className="btn-secondary text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(imageGeneration.generatedImage!);
                        onToast('Image URL copied to clipboard!', 'success');
                      }}
                      className="btn-secondary text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy URL
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!imageGeneration.editedImagePrompt && !imageGeneration.generatedImage && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-[var(--text-secondary)] font-medium">No media generated yet</p>
                  <p className="text-[var(--text-muted)] text-sm mt-1">Generate a post first to see media options</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
