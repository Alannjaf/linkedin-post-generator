'use client';

import { useState } from 'react';
import { Language, Tone, GeneratedCarousel, CarouselSlide } from '@/types';
import { htmlToPlainText, plainTextToHtml } from '@/lib/linkedin-formatter';

interface CarouselGeneratorProps {
  postContent: string;
  language: Language;
  tone: Tone;
  onCarouselSelected: (carouselContent: string) => void;
}

export default function CarouselGenerator({
  postContent,
  language,
  tone,
  onCarouselSelected,
}: CarouselGeneratorProps) {
  const [carousel, setCarousel] = useState<GeneratedCarousel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleGenerateCarousel = async () => {
    if (!postContent.trim()) {
      setError(language === 'kurdish' ? 'پۆستەکە بەتاڵە' : 'Post content is empty');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const plainTextContent = htmlToPlainText(postContent);
      const response = await fetch('/api/carousel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent: plainTextContent,
          language,
          tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setCarousel(data.carousel);
      setCurrentSlideIndex(0);
      setIsExpanded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate carousel';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseCarousel = () => {
    if (!carousel) return;

    // Format carousel as text with slide structure
    let carouselText = '';
    
    if (carousel.introduction) {
      carouselText += carousel.introduction + '\n\n';
    }

    carousel.slides.forEach((slide, index) => {
      carouselText += `--- Slide ${slide.slideNumber} ---\n`;
      carouselText += `${slide.title}\n\n`;
      carouselText += `${slide.content}\n\n`;
      if (slide.imageSuggestion) {
        carouselText += `[Image: ${slide.imageSuggestion}]\n\n`;
      }
    });

    if (carousel.conclusion) {
      carouselText += carousel.conclusion + '\n\n';
    }

    if (carousel.hashtags.length > 0) {
      carouselText += carousel.hashtags.map(h => `#${h}`).join(' ');
    }

    const htmlContent = plainTextToHtml(carouselText);
    onCarouselSelected(htmlContent);
  };

  const handleExportCarousel = () => {
    if (!carousel) return;

    let exportText = `LinkedIn Carousel Post\n`;
    exportText += `Total Slides: ${carousel.totalSlides}\n`;
    exportText += `Average Slide Length: ${carousel.metadata.averageSlideLength} characters\n\n`;

    if (carousel.imageTheme) {
      exportText += `MASTER IMAGE THEME:\n${carousel.imageTheme}\n\n`;
    }

    if (carousel.brandingGuidelines) {
      exportText += `BRANDING GUIDELINES:\n${carousel.brandingGuidelines}\n\n`;
    }

    exportText += '--- CAROUSEL SLIDES ---\n\n';

    if (carousel.introduction) {
      exportText += `INTRODUCTION:\n${carousel.introduction}\n\n`;
    }

    carousel.slides.forEach((slide) => {
      exportText += `SLIDE ${slide.slideNumber}:\n`;
      exportText += `Title: ${slide.title}\n`;
      exportText += `Content: ${slide.content}\n`;
      exportText += `Character Count: ${slide.characterCount}\n`;
      if (slide.imageSuggestion) {
        exportText += `Image Suggestion: ${slide.imageSuggestion}\n`;
      }
      exportText += '\n';
    });

    if (carousel.conclusion) {
      exportText += `CONCLUSION:\n${carousel.conclusion}\n\n`;
    }

    if (carousel.hashtags.length > 0) {
      exportText += `HASHTAGS: ${carousel.hashtags.map(h => `#${h}`).join(' ')}\n`;
    }

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carousel-post-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentSlide = carousel?.slides[currentSlideIndex];

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {language === 'kurdish' ? 'بەرهەمهێنانی Carousel' : 'Carousel Generator'}
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

          <button
            type="button"
            onClick={handleGenerateCarousel}
            disabled={isGenerating || !postContent.trim()}
            className="w-full mb-4 bg-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>{language === 'kurdish' ? 'بەرهەمهێنانی Carousel' : 'Generate Carousel'}</span>
              </>
            )}
          </button>

          {carousel && carousel.slides.length > 0 && (
            <div className="space-y-4">
              {/* Master Theme Display */}
              {carousel.imageTheme && (
                <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    {language === 'kurdish' ? 'تێمی سەرەکی وێنەکان (بۆ هەموو سلایدەکان):' : 'Master Image Theme (Applies to All Slides):'}
                  </h4>
                  <p className="text-sm text-purple-800 whitespace-pre-wrap">{carousel.imageTheme}</p>
                  {carousel.brandingGuidelines && (
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <p className="text-xs font-medium text-purple-700 mb-1">
                        {language === 'kurdish' ? 'ڕێنماییەکانی براندینگ:' : 'Branding Guidelines:'}
                      </p>
                      <p className="text-xs text-purple-700 whitespace-pre-wrap">{carousel.brandingGuidelines}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Slide Navigation */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {language === 'kurdish' ? 'پێشوو' : 'Previous'}
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {language === 'kurdish' 
                    ? `سلاید ${currentSlideIndex + 1} لە ${carousel.totalSlides}`
                    : `Slide ${currentSlideIndex + 1} of ${carousel.totalSlides}`}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(Math.min(carousel.slides.length - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex === carousel.slides.length - 1}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {language === 'kurdish' ? 'دواتر' : 'Next'}
                </button>
              </div>

              {/* Current Slide Display */}
              {currentSlide && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {language === 'kurdish' ? 'سەردێڕ:' : 'Title:'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {currentSlide.characterCount} {language === 'kurdish' ? 'پیت' : 'chars'}
                      </span>
                    </div>
                    <p className="text-base font-medium text-gray-800">{currentSlide.title}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      {language === 'kurdish' ? 'ناوەڕۆک:' : 'Content:'}
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentSlide.content}</p>
                  </div>

                  {currentSlide.imageSuggestion && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {language === 'kurdish' ? 'پێشنیاری وێنە:' : 'Image Suggestion:'}
                      </h4>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{currentSlide.imageSuggestion}</p>
                    </div>
                  )}
                </div>
              )}

              {/* All Slides Overview */}
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  {language === 'kurdish' ? 'پێداچوونەوەی هەموو سلایدەکان:' : 'All Slides Overview:'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {carousel.slides.map((slide, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentSlideIndex(index)}
                      className={`p-2 text-xs rounded-lg border transition-colors ${
                        currentSlideIndex === index
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">#{slide.slideNumber}</div>
                      <div className="text-xs text-gray-500 truncate mt-1">{slide.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleUseCarousel}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {language === 'kurdish' ? 'بەکارهێنان' : 'Use Carousel'}
                </button>
                <button
                  type="button"
                  onClick={handleExportCarousel}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
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
