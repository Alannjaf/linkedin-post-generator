
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { GeneratedCarousel, CarouselSlide } from '@/types';
import SlideExportTemplate, { SlideStyles } from './SlideExportTemplate';

interface CarouselEditorProps {
    carousel: GeneratedCarousel;
    slideImages: Record<number, string>;
    onClose: () => void;
}

export default function CarouselEditor({ carousel, slideImages, onClose }: CarouselEditorProps) {
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    // Default Styles
    const [styles, setStyles] = useState<SlideStyles>({
        fontFamily: 'Inter',
        textColor: '#FFFFFF',
        backgroundColor: '#18181b',
        accentColor: '#3b82f6',
        layout: 'center',
        titleFontSize: 60,
        contentFontSize: 30,
        textPositionX: 0,
        textPositionY: 0
    });

    const exportContainerRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = async () => {
        if (!exportContainerRef.current) return;
        setIsExporting(true);
        setExportProgress(0);

        try {
            const pdf = new jsPDF('p', 'px', [1080, 1350]); // Match template dimensions
            const slideElements = exportContainerRef.current.querySelectorAll('.slide-export-container');
            const totalSlides = slideElements.length;

            for (let i = 0; i < totalSlides; i++) {
                const element = slideElements[i] as HTMLElement;

                // Allow browser to render updates
                await new Promise(resolve => setTimeout(resolve, 100));

                const canvas = await html2canvas(element, {
                    scale: 1, // Already at high resolution
                    useCORS: true,
                    backgroundColor: styles.backgroundColor,
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);

                if (i > 0) {
                    pdf.addPage([1080, 1350]);
                }

                pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
                setExportProgress(((i + 1) / totalSlides) * 100);
            }

            const filename = `carousel-${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(filename);

            // Show success logic here via parent or toast if available, or just close
            onClose();

        } catch (error) {
            console.error('PDF Export failed:', error);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    const activeSlide = carousel.slides[activeSlideIndex];

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 overflow-hidden">
                    <div className="w-full max-w-7xl h-full max-h-[90vh] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] gap-8">

                        {/* Main Preview Area */}
                        <div className="relative flex flex-col items-center justify-center h-full bg-zinc-900/50 rounded-3xl border border-white/10 overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 flex gap-2">
                                <button onClick={onClose} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
                                    Close
                                </button>
                            </div>

                            {/* Preview Canvas */}
                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                {/* 
                                    We render the slide scaled down. 
                                    Using a wrapper with flex items-center ensures it stays centered.
                                    min-w-0 ensures flex child doesn't force expansion.
                                */}
                                <div className="transform scale-[0.35] sm:scale-[0.4] lg:scale-[0.5] origin-center shadow-2xl transition-all duration-300">
                                    {/* Explicit dimensions to ensure transform origin works consistently */}
                                    <div style={{ width: 1080, height: 1350 }}>
                                        <SlideExportTemplate
                                            slide={{
                                                ...activeSlide,
                                                imageUrl: slideImages[activeSlide.slideNumber]
                                            }}
                                            totalSlides={carousel.totalSlides}
                                            theme={carousel.imageTheme}
                                            styles={styles}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                                <button
                                    disabled={activeSlideIndex === 0}
                                    onClick={() => setActiveSlideIndex(prev => prev - 1)}
                                    className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <span className="text-white font-mono min-w-[3ch] text-center">{activeSlideIndex + 1}</span>
                                <span className="text-zinc-500">/</span>
                                <span className="text-zinc-500 font-mono">{carousel.totalSlides}</span>
                                <button
                                    disabled={activeSlideIndex === carousel.slides.length - 1}
                                    onClick={() => setActiveSlideIndex(prev => prev + 1)}
                                    className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Sidebar Controls */}
                        <div className="h-full bg-zinc-900 rounded-3xl border border-white/10 p-6 flex flex-col gap-8 overflow-y-auto">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2">Design Editor</h2>
                                <p className="text-zinc-400 text-sm">Customize your carousel style</p>
                            </div>

                            {/* Font Selection */}
                            <div className="space-y-3">
                                <label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Typography</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setStyles(s => ({ ...s, fontFamily: 'Inter' }))}
                                        className={`p-3 rounded-xl border text-sm text-left transition-all ${styles.fontFamily === 'Inter' ? 'bg-white/10 border-blue-500 text-white' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/20'}`}
                                    >
                                        <span className="block font-bold mb-1">Modern</span>
                                        <span className="text-xs opacity-70">Inter / Sans</span>
                                    </button>
                                    <button
                                        onClick={() => setStyles(s => ({ ...s, fontFamily: 'Serif' }))}
                                        className={`p-3 rounded-xl border text-sm text-left transition-all font-serif ${styles.fontFamily === 'Serif' ? 'bg-white/10 border-blue-500 text-white' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/20'}`}
                                    >
                                        <span className="block font-bold mb-1">Classic</span>
                                        <span className="text-xs opacity-70">Merriweather</span>
                                    </button>
                                </div>
                            </div>

                            {/* Typography Details */}
                            <div className="space-y-3">
                                <label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Typography Sizes</label>
                                <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-zinc-400">
                                            <span>Title</span>
                                            <span>{styles.titleFontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="30"
                                            max="120"
                                            value={styles.titleFontSize}
                                            onChange={(e) => setStyles(s => ({ ...s, titleFontSize: parseInt(e.target.value) }))}
                                            className="w-full accent-blue-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-zinc-400">
                                            <span>Content</span>
                                            <span>{styles.contentFontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="14"
                                            max="60"
                                            value={styles.contentFontSize}
                                            onChange={(e) => setStyles(s => ({ ...s, contentFontSize: parseInt(e.target.value) }))}
                                            className="w-full accent-blue-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Layout / Alignment */}
                            <div className="space-y-3">
                                <label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Layout</label>
                                <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                                    {['start', 'center', 'end'].map((align) => (
                                        <button
                                            key={align}
                                            onClick={() => setStyles(s => ({ ...s, layout: align as any }))}
                                            className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${styles.layout === align ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            {align.charAt(0).toUpperCase() + align.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Free Positioning */}
                            <div className="space-y-3">
                                <label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Text Position</label>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-zinc-400">
                                            <span>Horizontal (X)</span>
                                            <span>{styles.textPositionX}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-400"
                                            max="400"
                                            value={styles.textPositionX}
                                            onChange={(e) => setStyles(s => ({ ...s, textPositionX: parseInt(e.target.value) }))}
                                            className="w-full accent-purple-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-zinc-400">
                                            <span>Vertical (Y)</span>
                                            <span>{styles.textPositionY}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-400"
                                            max="400"
                                            value={styles.textPositionY}
                                            onChange={(e) => setStyles(s => ({ ...s, textPositionY: parseInt(e.target.value) }))}
                                            className="w-full accent-purple-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setStyles(s => ({ ...s, textPositionX: 0, textPositionY: 0 }))}
                                            className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                                        >
                                            Reset Position
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Colors */}
                            <div className="space-y-3">
                                <label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Colors</label>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-zinc-300">Accent</span>
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: styles.accentColor }} />
                                        </div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#10b981'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setStyles(s => ({ ...s, accentColor: color }))}
                                                    className={`w-full aspect-square rounded-full border-2 transition-all ${styles.accentColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-zinc-300">Background</span>
                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: styles.backgroundColor }} />
                                        </div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['#18181b', '#09090b', '#1e1b4b', '#311b1b', '#064e3b'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setStyles(s => ({ ...s, backgroundColor: color }))}
                                                    className={`w-full aspect-square rounded-full border-2 transition-all ${styles.backgroundColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-zinc-300">Text</span>
                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: styles.textColor }} />
                                        </div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['#FFFFFF', '#e4e4e7', '#a1a1aa', '#fef3c7', '#dbeafe'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setStyles(s => ({ ...s, textColor: color }))}
                                                    className={`w-full aspect-square rounded-full border-2 transition-all ${styles.textColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                                >
                                    {isExporting ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Exporting... {Math.round(exportProgress)}%</span>
                                            </div>
                                            <span className="text-xs font-normal opacity-80">Please wait</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Download PDF</span>
                                            <span className="text-xs font-normal opacity-80">High Quality • Watermark Free</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Hidden Render Container for PDF Export - Includes Styles */}
                        <div
                            ref={exportContainerRef}
                            style={{ position: 'fixed', top: 0, left: '100vw', pointerEvents: 'none' }}
                        >
                            {carousel.slides.map((slide, index) => (
                                <div key={index} className="slide-export-container">
                                    <SlideExportTemplate
                                        slide={{
                                            ...slide,
                                            imageUrl: slideImages[slide.slideNumber]
                                        }}
                                        totalSlides={carousel.totalSlides}
                                        theme={carousel.imageTheme}
                                        styles={styles}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
