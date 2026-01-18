'use client';

import { useState, useEffect } from 'react';
import { AdaptedPostRow, CarouselRow } from '@/lib/db';
import { CarouselSlide } from '@/types';

interface SavedContentManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onUseAdaptedPost?: (content: string) => void;
    onUseCarousel?: (carousel: CarouselRow) => void;
}

type ContentType = 'adapted' | 'carousels';

export default function SavedContentManager({
    isOpen,
    onClose,
    onUseAdaptedPost,
    onUseCarousel,
}: SavedContentManagerProps) {
    const [activeTab, setActiveTab] = useState<ContentType>('adapted');
    const [adaptedPosts, setAdaptedPosts] = useState<AdaptedPostRow[]>([]);
    const [carousels, setCarousels] = useState<CarouselRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carousel viewer state
    const [viewingCarousel, setViewingCarousel] = useState<CarouselRow | null>(null);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            loadContent();
        }
    }, [isOpen, activeTab]);

    const loadContent = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (activeTab === 'adapted') {
                const response = await fetch('/api/adapted-posts');
                if (!response.ok) throw new Error('Failed to load adapted posts');
                const data = await response.json();
                setAdaptedPosts(data.posts || []);
            } else {
                const response = await fetch('/api/carousels');
                if (!response.ok) throw new Error('Failed to load carousels');
                const data = await response.json();
                setCarousels(data.carousels || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load content');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAdaptedPost = async (id: string) => {
        try {
            const response = await fetch(`/api/adapted-posts?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            setAdaptedPosts(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            setError('Failed to delete');
        }
    };

    const handleDeleteCarousel = async (id: string) => {
        try {
            const response = await fetch(`/api/carousels?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            setCarousels(prev => prev.filter(c => c.id !== id));
            if (viewingCarousel?.id === id) {
                setViewingCarousel(null);
            }
        } catch (err) {
            setError('Failed to delete');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'twitter':
                return '𝕏';
            case 'facebook':
                return 'f';
            case 'medium':
                return 'M';
            case 'instagram':
                return '📷';
            default:
                return '📝';
        }
    };

    const handleViewCarousel = (carousel: CarouselRow) => {
        setViewingCarousel(carousel);
        setCurrentSlideIndex(0);
    };

    const handleBackToList = () => {
        setViewingCarousel(null);
        setCurrentSlideIndex(0);
    };

    if (!isOpen) return null;

    // Carousel Detail View
    if (viewingCarousel) {
        const currentSlide = viewingCarousel.slides[currentSlideIndex];
        const slideImages = viewingCarousel.slide_images || {};
        const hasImage = slideImages[currentSlide?.slideNumber];

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                        <button
                            onClick={handleBackToList}
                            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to List
                        </button>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] truncate max-w-[300px]">
                            {viewingCarousel.title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Master Theme */}
                    {viewingCarousel.image_theme && (
                        <div className="px-4 py-3 bg-purple-500/10 border-b border-[var(--border-default)]">
                            <p className="text-xs text-purple-400">
                                <strong>Image Theme:</strong> {viewingCarousel.image_theme}
                            </p>
                        </div>
                    )}

                    {/* Slide Navigation */}
                    <div className="flex items-center justify-between p-3 border-b border-[var(--border-default)]">
                        <button
                            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                            disabled={currentSlideIndex === 0}
                            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-medium text-[var(--text-secondary)]">
                            Slide {currentSlideIndex + 1} of {viewingCarousel.total_slides}
                        </span>
                        <button
                            onClick={() => setCurrentSlideIndex(Math.min(viewingCarousel.slides.length - 1, currentSlideIndex + 1))}
                            disabled={currentSlideIndex === viewingCarousel.slides.length - 1}
                            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>

                    {/* Current Slide Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {currentSlide && (
                            <div className="space-y-4">
                                {/* Slide Title */}
                                <div>
                                    <h3 className="text-sm font-semibold text-purple-400 mb-1">Title</h3>
                                    <p className="text-lg font-medium text-[var(--text-primary)]">{currentSlide.title}</p>
                                </div>

                                {/* Slide Content */}
                                <div>
                                    <h3 className="text-sm font-semibold text-purple-400 mb-1">Content</h3>
                                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{currentSlide.content}</p>
                                </div>

                                {/* Generated Image */}
                                {hasImage && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Generated Image
                                        </h3>
                                        <img
                                            src={slideImages[currentSlide.slideNumber]}
                                            alt={`Slide ${currentSlide.slideNumber}`}
                                            className="w-full rounded-lg max-h-64 object-cover border border-[var(--border-default)]"
                                        />
                                    </div>
                                )}

                                {/* Image Suggestion (if no generated image) */}
                                {!hasImage && currentSlide.imageSuggestion && (
                                    <div className="p-3 bg-purple-500/10 rounded-lg">
                                        <h3 className="text-xs font-semibold text-purple-400 mb-1">Image Suggestion</h3>
                                        <p className="text-sm text-[var(--text-muted)]">{currentSlide.imageSuggestion}</p>
                                    </div>
                                )}

                                {/* Character Count */}
                                <div className="text-xs text-[var(--text-muted)]">
                                    {currentSlide.characterCount} characters
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Slide Thumbnails */}
                    <div className="p-4 border-t border-[var(--border-default)]">
                        <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2">All Slides</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {viewingCarousel.slides.map((slide, idx) => {
                                const hasSlideImage = slideImages[slide.slideNumber];
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlideIndex(idx)}
                                        className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 transition-colors flex flex-col items-center justify-center relative ${currentSlideIndex === idx
                                                ? 'border-purple-500 bg-purple-500/20'
                                                : 'border-[var(--border-default)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)]'
                                            }`}
                                    >
                                        <span className="text-lg font-bold text-[var(--text-primary)]">
                                            {slide.slideNumber}
                                        </span>
                                        {hasSlideImage && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--bg-card)]"></span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-4 border-t border-[var(--border-default)]">
                        <button
                            onClick={() => {
                                const text = viewingCarousel.slides.map(s => `${s.title}\n${s.content}`).join('\n\n');
                                navigator.clipboard.writeText(text);
                            }}
                            className="btn-secondary flex-1 py-2 justify-center"
                        >
                            Copy All Text
                        </button>
                        {onUseCarousel && (
                            <button
                                onClick={() => {
                                    onUseCarousel(viewingCarousel);
                                    onClose();
                                }}
                                className="btn-primary flex-1 py-2 justify-center"
                            >
                                Use Carousel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Main List View
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Saved Content</h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border-default)]">
                    <button
                        onClick={() => setActiveTab('adapted')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'adapted'
                                ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/10'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Adapted Posts ({adaptedPosts.length})
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('carousels')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'carousels'
                                ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                            </svg>
                            Carousels ({carousels.length})
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border-l-4 border-red-500 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-[var(--text-muted)] border-t-transparent rounded-full"></div>
                        </div>
                    ) : activeTab === 'adapted' ? (
                        adaptedPosts.length === 0 ? (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <p>No adapted posts saved yet</p>
                                <p className="text-sm mt-2">Generate content for other platforms and click &quot;Save&quot;</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {adaptedPosts.map((post) => (
                                    <div
                                        key={post.id}
                                        className="p-4 glass-card hover:bg-[var(--bg-card-hover)] transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 font-bold">
                                                    {getPlatformIcon(post.platform)}
                                                </span>
                                                <div>
                                                    <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                                                        {post.platform}
                                                    </span>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {formatDate(post.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-muted)]">
                                                    {post.character_count} chars
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteAdaptedPost(post.id)}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-3 whitespace-pre-wrap">
                                            {post.adapted_content}
                                        </p>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(post.adapted_content);
                                                }}
                                                className="btn-secondary py-1.5 px-3 text-xs"
                                            >
                                                Copy
                                            </button>
                                            {onUseAdaptedPost && (
                                                <button
                                                    onClick={() => {
                                                        onUseAdaptedPost(post.adapted_content);
                                                        onClose();
                                                    }}
                                                    className="btn-primary py-1.5 px-3 text-xs"
                                                >
                                                    Use Content
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : carousels.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                            </svg>
                            <p>No carousels saved yet</p>
                            <p className="text-sm mt-2">Generate a carousel and click &quot;Save&quot;</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {carousels.map((carousel) => {
                                const imageCount = Object.keys(carousel.slide_images || {}).length;
                                return (
                                    <div
                                        key={carousel.id}
                                        className="p-4 glass-card hover:bg-[var(--bg-card-hover)] transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                                    {carousel.title.length > 50 ? carousel.title.substring(0, 50) + '...' : carousel.title}
                                                </h4>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {carousel.total_slides} slides
                                                    {imageCount > 0 && (
                                                        <span className="text-green-400 ml-2">• {imageCount} images</span>
                                                    )}
                                                    <span className="ml-2">• {formatDate(carousel.created_at)}</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCarousel(carousel.id)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex gap-1 flex-wrap mb-3">
                                            {carousel.slides.slice(0, 5).map((slide, idx) => {
                                                const hasImage = (carousel.slide_images || {})[slide.slideNumber];
                                                return (
                                                    <span
                                                        key={idx}
                                                        className={`text-xs px-2 py-1 rounded relative ${hasImage
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-purple-500/20 text-purple-400'
                                                            }`}
                                                    >
                                                        #{slide.slideNumber}
                                                        {hasImage && (
                                                            <span className="ml-1">📷</span>
                                                        )}
                                                    </span>
                                                );
                                            })}
                                            {carousel.slides.length > 5 && (
                                                <span className="text-xs px-2 py-1 rounded bg-[var(--bg-input)] text-[var(--text-muted)]">
                                                    +{carousel.slides.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleViewCarousel(carousel)}
                                                className="btn-primary py-1.5 px-3 text-xs"
                                            >
                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Carousel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const text = carousel.slides.map(s => `${s.title}\n${s.content}`).join('\n\n');
                                                    navigator.clipboard.writeText(text);
                                                }}
                                                className="btn-secondary py-1.5 px-3 text-xs"
                                            >
                                                Copy All
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
