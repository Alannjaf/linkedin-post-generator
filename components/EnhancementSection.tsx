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

  return (
    <div id="enhance-section" className="mt-8 lg:mt-10">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Post Enhancements
        </h3>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setEnhancementTab('content')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              enhancementTab === 'content'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Content
          </button>
          <button
            type="button"
            onClick={() => setEnhancementTab('formatting')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              enhancementTab === 'formatting'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Formatting
          </button>
          <button
            type="button"
            onClick={() => setEnhancementTab('media')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              enhancementTab === 'media'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Media
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
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
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Image Generation Prompt</h4>
                  <textarea
                    value={imageGeneration.editedImagePrompt}
                    onChange={(e) => imageGeneration.setEditedImagePrompt(e.target.value)}
                    className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y text-sm font-mono bg-white"
                    placeholder="Image prompt will appear here..."
                  />
                </div>
              )}

              {/* Generated Image Section */}
              {imageGeneration.generatedImage && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Generated Image</h4>
                  <div className="rounded-lg overflow-hidden shadow-md border border-gray-200 bg-white">
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
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(imageGeneration.generatedImage!);
                        onToast('Image URL copied to clipboard!', 'success');
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
