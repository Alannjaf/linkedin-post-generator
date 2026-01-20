'use client';

import { useState, useEffect } from 'react';
import { Language, Tone, GeneratedCarousel, CarouselSlide } from '@/types';
import { htmlToPlainText, plainTextToHtml } from '@/lib/linkedin-formatter';
import SavedContentManager from './SavedContentManager';
import SlideExportTemplate from './SlideExportTemplate';
import { exportCarouselToPDF } from '@/utils/CarouselPDFExport';
import CarouselEditor from './CarouselEditor';

interface CarouselGeneratorProps {
  postContent: string;
  language: Language;
  tone: Tone;
  onCarouselSelected?: (carouselText: string) => void;
  initialCarousel?: GeneratedCarousel | null;
}

export default function CarouselGenerator({
  postContent,
  language,
  tone,
  onCarouselSelected,
  initialCarousel,
}: CarouselGeneratorProps) {
  const [carousel, setCarousel] = useState<GeneratedCarousel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingImageForSlide, setGeneratingImageForSlide] = useState<number | null>(null);
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (initialCarousel) {
      setCarousel(initialCarousel);
      if (initialCarousel.slideImages) {
        setSlideImages(initialCarousel.slideImages);
      }
      setIsExpanded(true);
      setCurrentSlideIndex(0);
    }
  }, [initialCarousel]);

  const handleGenerateCarousel = async () => {
    if (!postContent.trim()) {
      setError(language === 'kurdish' ? 'پۆستەکە بەتاڵە' : 'Post content is empty');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);
    setSlideImages({});

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

  const handleGenerateSlideImage = async (slideNumber: number, currentPrompt?: string) => {
    const imageSuggestion = currentPrompt;
    const promptToUse = currentPrompt || imageSuggestion;

    if (!promptToUse) {
      setError(language === 'kurdish' ? 'پێشنیاری وێنە نییە' : 'No image suggestion available');
      return;
    }

    setGeneratingImageForSlide(slideNumber);
    setError(null);

    // Find reference image (previous slide's image)
    const previousSlideNumber = slideNumber - 1;
    const referenceImage = slideImages[previousSlideNumber] || null;

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imagePrompt: promptToUse,
          imageTheme: carousel?.imageTheme,
          referenceImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      if (data.imageUrl) {
        setSlideImages(prev => ({
          ...prev,
          [slideNumber]: data.imageUrl,
        }));
        setSuccessMessage(language === 'kurdish' ? 'وێنە دروستکرا!' : 'Image generated!');
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      setError(errorMessage);
    } finally {
      setGeneratingImageForSlide(null);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!carousel) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const title = carousel.slides[0]?.title || 'Untitled Carousel';
      const response = await fetch('/api/carousels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: carousel.id, // Include ID if it exists (for updates in future, though backend might treat as new if logic isn't there)
          title,
          sourceContent: htmlToPlainText(postContent),
          slides: carousel.slides,
          totalSlides: carousel.totalSlides,
          introduction: carousel.introduction,
          conclusion: carousel.conclusion,
          hashtags: carousel.hashtags,
          imageTheme: carousel.imageTheme,
          brandingGuidelines: carousel.brandingGuidelines,
          language,
          tone,
          slideImages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save carousel');
      }

      setSuccessMessage(language === 'kurdish' ? 'پاشەکەوت کرا بە سەرکەوتوویی' : 'Saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError(language === 'kurdish' ? 'هەڵە لە پاشەکەوتکردن' : 'Failed to save');
    } finally {
      setIsSaving(false);
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
    if (onCarouselSelected) {
      onCarouselSelected(htmlContent);
    }
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
      if (slideImages[slide.slideNumber]) {
        exportText += `Generated Image: [Base64 Image Available]\n`;
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
    a.download = `linkedin-carousel-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!carousel) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      await exportCarouselToPDF(
        carousel.slides[0]?.title || 'Unknown Carousel',
        carousel.totalSlides,
        (progress) => setExportProgress(progress)
      );
      setSuccessMessage(language === 'kurdish' ? 'PDF بە سەرکەوتوویی دروستکرا' : 'PDF generated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('PDF Export Error:', error);
      setError(language === 'kurdish' ? 'هەڵە لە دروستکردنی PDF' : 'Failed to generate PDF');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Editing handlers
  const handleSlideChange = (index: number, field: keyof CarouselSlide, value: string) => {
    if (!carousel) return;

    setCarousel(prev => {
      if (!prev) return null;
      const newSlides = [...prev.slides];
      newSlides[index] = {
        ...newSlides[index],
        [field]: value,
        characterCount: field === 'content' ? value.length : newSlides[index].characterCount
      };
      return {
        ...prev,
        slides: newSlides
      };
    });
  };

  const handleAddSlide = () => {
    if (!carousel) return;

    setCarousel(prev => {
      if (!prev) return null;
      const newSlideNumber = prev.slides.length + 1;
      const newSlide: CarouselSlide = {
        slideNumber: newSlideNumber,
        title: language === 'kurdish' ? 'ناونیشانی نوێ' : 'New Title',
        content: language === 'kurdish' ? 'ناوەڕۆکی نوێ' : 'New Content',
        characterCount: 0,
        imageSuggestion: ''
      };

      return {
        ...prev,
        slides: [...prev.slides, newSlide],
        totalSlides: prev.totalSlides + 1
      };
    });

    // Auto-navigate to new slide
    setTimeout(() => {
      setCurrentSlideIndex(carousel.slides.length);
    }, 100);
  };

  const handleDeleteSlide = (index: number) => {
    if (!carousel || carousel.slides.length <= 1) {
      setError(language === 'kurdish' ? 'ناتوانیت تەنها سلایدەکە بسڕیتەوە' : 'Cannot delete the only slide');
      return;
    }

    setCarousel(prev => {
      if (!prev) return null;
      const newSlides = prev.slides.filter((_, i) => i !== index);
      // Renumber slides
      const renumberedSlides = newSlides.map((slide, i) => ({
        ...slide,
        slideNumber: i + 1
      }));
      return {
        ...prev,
        slides: renumberedSlides,
        totalSlides: renumberedSlides.length
      };
    });

    // Adjust current index if needed
    if (currentSlideIndex >= carousel.slides.length - 1) {
      setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
    }

    // Clean up any associated image
    setSlideImages(prev => {
      const newImages: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const slideNum = parseInt(key);
        if (slideNum < index + 1) {
          newImages[slideNum] = value;
        } else if (slideNum > index + 1) {
          newImages[slideNum - 1] = value;
        }
      });
      return newImages;
    });

    setSuccessMessage(language === 'kurdish' ? 'سلاید سڕایەوە' : 'Slide deleted');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleDuplicateSlide = (index: number) => {
    if (!carousel) return;

    setCarousel(prev => {
      if (!prev) return null;
      const slideToDuplicate = prev.slides[index];
      const newSlide: CarouselSlide = {
        ...slideToDuplicate,
        slideNumber: index + 2,
        title: `${slideToDuplicate.title} (Copy)`,
      };

      const newSlides = [
        ...prev.slides.slice(0, index + 1),
        newSlide,
        ...prev.slides.slice(index + 1)
      ];

      // Renumber slides after the duplicate
      const renumberedSlides = newSlides.map((slide, i) => ({
        ...slide,
        slideNumber: i + 1
      }));

      return {
        ...prev,
        slides: renumberedSlides,
        totalSlides: renumberedSlides.length
      };
    });

    // Navigate to the duplicated slide
    setTimeout(() => {
      setCurrentSlideIndex(index + 1);
    }, 100);

    setSuccessMessage(language === 'kurdish' ? 'سلاید کۆپی کرا' : 'Slide duplicated');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!carousel || !isExpanded) return;

      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentSlideIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentSlideIndex(prev => Math.min(carousel.slides.length - 1, prev + 1));
          break;
        case 'Delete':
          e.preventDefault();
          handleDeleteSlide(currentSlideIndex);
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleDuplicateSlide(currentSlideIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carousel, isExpanded, currentSlideIndex, language]);

  const currentSlide = carousel?.slides[currentSlideIndex];

  // RTL support for Kurdish (and Arabic if added in future)
  const isRTL = language === 'kurdish';

  return (
    <div className="glass-card overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors duration-200"
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {language === 'kurdish' ? 'بەرهەمهێنانی Carousel' : 'Carousel Generator'}
          {Object.keys(slideImages).length > 0 && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              {Object.keys(slideImages).length} {language === 'kurdish' ? 'وێنە' : 'images'}
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
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
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

          <button
            type="button"
            onClick={handleGenerateCarousel}
            disabled={isGenerating || !postContent.trim()}
            className="w-full mb-4 bg-gradient-to-r from-purple-500 to-violet-500 text-white px-4 py-2.5 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
                <div className="p-4 bg-purple-500/10 border-l-4 border-purple-500 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    {language === 'kurdish' ? 'تێمی سەرەکی وێنەکان:' : 'Master Image Theme:'}
                  </h4>
                  <p className="text-sm text-purple-300 whitespace-pre-wrap">{carousel.imageTheme}</p>
                </div>
              )}

              {/* Slide Navigation */}
              <div className="flex items-center justify-between p-3 glass-card">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                    className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={language === 'kurdish' ? 'پێشوو (←)' : 'Previous (←)'}
                  >
                    {language === 'kurdish' ? 'پێشوو' : 'Previous'}
                  </button>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {language === 'kurdish'
                      ? `سلاید ${currentSlideIndex + 1} لە ${carousel.totalSlides}`
                      : `Slide ${currentSlideIndex + 1} of ${carousel.totalSlides}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex(Math.min(carousel.slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === carousel.slides.length - 1}
                    className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={language === 'kurdish' ? 'دواتر (→)' : 'Next (→)'}
                  >
                    {language === 'kurdish' ? 'دواتر' : 'Next'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateSlide(currentSlideIndex)}
                    className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    title={language === 'kurdish' ? 'کۆپی کردنی سلاید (Ctrl+D)' : 'Duplicate slide (Ctrl+D)'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(currentSlideIndex)}
                    disabled={carousel.slides.length <= 1}
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={language === 'kurdish' ? 'سڕینەوەی سلاید (Delete)' : 'Delete slide (Delete)'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Current Slide Display */}
              {currentSlide && (
                <div className="p-4 glass-card">
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        {language === 'kurdish' ? 'سەردێڕ:' : 'Title:'}
                      </h4>
                      <span className="text-xs text-[var(--text-muted)]">
                        {currentSlide.characterCount} {language === 'kurdish' ? 'پیت' : 'chars'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={currentSlide.title}
                      onChange={(e) => handleSlideChange(currentSlideIndex, 'title', e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="Slide Title"
                    />
                  </div>

                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                      {language === 'kurdish' ? 'ناوەڕۆک:' : 'Content:'}
                    </h4>
                    <textarea
                      value={currentSlide.content}
                      onChange={(e) => handleSlideChange(currentSlideIndex, 'content', e.target.value)}
                      rows={4}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors resize-y"
                      placeholder="Slide Content"
                    />
                  </div>

                  {/* Image Section */}
                  <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                    <h4 className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {language === 'kurdish' ? 'وێنە و ڕێنمایی:' : 'Image & Prompt:'}
                    </h4>

                    {slideImages[currentSlide.slideNumber] && (
                      <div className="mb-3">
                        <img
                          src={slideImages[currentSlide.slideNumber]}
                          alt={`Slide ${currentSlide.slideNumber}`}
                          className="w-full rounded-lg max-h-64 object-cover mb-2"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 mb-2">
                      <textarea
                        value={currentSlide.imageSuggestion || ''}
                        onChange={(e) => handleSlideChange(currentSlideIndex, 'imageSuggestion', e.target.value)}
                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border-default)] rounded px-2 py-1 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-purple-500 resize-y min-h-[60px]"
                        placeholder="Image Prompt"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerateSlideImage(currentSlide.slideNumber, currentSlide.imageSuggestion)}
                      disabled={generatingImageForSlide === currentSlide.slideNumber || !currentSlide.imageSuggestion}
                      className="btn-secondary py-1.5 px-3 text-xs w-full justify-center disabled:opacity-50"
                    >
                      {generatingImageForSlide === currentSlide.slideNumber ? (
                        <>
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{language === 'kurdish' ? 'دروستکردنی وێنە...' : 'Generating Image...'}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            {slideImages[currentSlide.slideNumber]
                              ? (language === 'kurdish' ? 'دروستکردنەوەی وێنە' : 'Regenerate Image')
                              : (language === 'kurdish' ? 'دروستکردنی وێنە' : 'Generate Image')}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Slide Thumbnail Strip */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    {language === 'kurdish' ? 'پێداچوونەوەی هەموو سلایدەکان:' : 'All Slides Overview:'}
                  </h4>
                  <span className="text-xs text-[var(--text-muted)] hidden sm:block">
                    ← → {language === 'kurdish' ? 'گەڕان' : 'Navigate'} • Delete {language === 'kurdish' ? 'سڕینەوە' : 'Remove'} • Ctrl+D {language === 'kurdish' ? 'کۆپی' : 'Duplicate'}
                  </span>
                </div>

                {/* Horizontal Scrollable Thumbnail Strip */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
                  {carousel.slides.map((slide, index) => (
                    <div
                      key={index}
                      role="button"
                      tabIndex={0}
                      onClick={() => setCurrentSlideIndex(index)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentSlideIndex(index); } }}
                      className={`relative flex-shrink-0 w-28 rounded-xl border-2 transition-all duration-200 overflow-hidden group cursor-pointer ${currentSlideIndex === index
                        ? 'border-purple-500 ring-2 ring-purple-500/30 scale-105'
                        : 'border-[var(--border-default)] hover:border-purple-500/50 hover:scale-102'
                        }`}
                    >
                      {/* Thumbnail Image or Placeholder */}
                      <div className="aspect-[4/5] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-card)] relative">
                        {slideImages[slide.slideNumber] ? (
                          <img
                            src={slideImages[slide.slideNumber]}
                            alt={`Slide ${slide.slideNumber}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-[var(--text-muted)]">{slide.slideNumber}</span>
                          </div>
                        )}

                        {/* Overlay with title */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-[10px] text-white font-medium truncate">{slide.title}</p>
                        </div>

                        {/* Current indicator */}
                        {currentSlideIndex === index && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                        )}

                        {/* Image indicator */}
                        {slideImages[slide.slideNumber] && (
                          <div className="absolute top-1 left-1 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}

                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDuplicateSlide(index); }}
                            className="p-1.5 rounded-full bg-blue-500/80 text-white hover:bg-blue-500 transition-colors"
                            title="Duplicate"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          {carousel.slides.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteSlide(index); }}
                              className="p-1.5 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Slide Button */}
                  <button
                    type="button"
                    onClick={handleAddSlide}
                    className="flex-shrink-0 w-28 aspect-[4/5] rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:border-purple-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs font-medium">{language === 'kurdish' ? 'زیادکردن' : 'Add'}</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleUseCarousel}
                  className="btn-primary py-2 text-sm justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {language === 'kurdish' ? 'بەکارهێنان' : 'Use'}
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

                <div className="col-span-3 sm:col-span-3 grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleExportCarousel}
                    className="btn-secondary py-2 text-sm justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {language === 'kurdish' ? 'Markdown' : 'Markdown'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="btn-primary py-2 text-sm justify-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Visual Editor & PDF
                  </button>
                </div>
              </div>

              {/* Hidden Export Templates */}
              <div style={{ position: 'absolute', top: -10000, left: -10000, visibility: 'hidden' }}>
                {carousel.slides.map((slide, index) => (
                  <SlideExportTemplate
                    key={index}
                    slide={{
                      ...slide,
                      imageUrl: slideImages[slide.slideNumber]
                    }}
                    totalSlides={carousel.totalSlides}
                    theme={carousel.imageTheme}
                    language={language}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visual Editor Modal */}
        {isEditorOpen && carousel && (
          <CarouselEditor
            carousel={carousel}
            slideImages={slideImages}
            onClose={() => setIsEditorOpen(false)}
            language={language}
          />
        )}
      </div>
    </div >
  );
}
