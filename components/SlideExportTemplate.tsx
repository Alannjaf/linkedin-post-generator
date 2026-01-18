
import React, { forwardRef } from 'react';
import { GeneratedCarousel } from '@/types';


export interface SlideStyles {
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    accentColor: string;
    layout: 'start' | 'center' | 'end'; // For vertical alignment/moving text
    titleFontSize: number;
    contentFontSize: number;
    textPositionX: number;
    textPositionY: number;
}

interface SlideExportTemplateProps {
    slide: {
        title: string;
        content: string;
        imageUrl?: string;
        slideNumber: number;
    };
    totalSlides: number;
    theme?: string;
    userName?: string;
    userHandle?: string;
    styles?: SlideStyles; // New prop for styling
}

const SlideExportTemplate = forwardRef<HTMLDivElement, SlideExportTemplateProps>(
    ({ slide, totalSlides, theme, userName, userHandle, styles }, ref) => {
        // Default styles if not provided
        const currentStyles: SlideStyles = styles || {
            fontFamily: 'Inter',
            textColor: '#FFFFFF',
            backgroundColor: '#18181b', // zinc-900
            accentColor: '#3b82f6', // blue-500
            layout: 'center',
            titleFontSize: 60,
            contentFontSize: 30,
            textPositionX: 0,
            textPositionY: 0
        };

        const alignmentClass = {
            'start': 'justify-start items-start text-left pt-20 px-20',
            'center': 'justify-center items-center text-center px-20',
            'end': 'justify-end items-end text-right pb-20 px-20'
        }[currentStyles.layout];

        return (
            <div
                ref={ref}
                id={`slide-export-${slide.slideNumber}`}
                className={`relative overflow-hidden flex flex-col ${currentStyles.fontFamily === 'Serif' ? 'font-serif' : 'font-sans'}`}
                style={{
                    width: '1080px',
                    height: '1350px', // 4:5 aspect ratio
                    // padding: '80px', // Padding handled by alignment classes now for better control
                    backgroundColor: currentStyles.backgroundColor,
                    color: currentStyles.textColor,
                    // fontFamily: currentStyles.fontFamily // Removing this to let className handle it, or we can keep it if we ensure it doesn't conflict. 
                    // Actually, for custom fonts safely, let's keep inline style but rely on the prop match. 
                    // But standard options use Inter vs Serif classes. 
                    // Let's rely on the classNames from line 49 which already toggles serif/sans.
                }}
            >
                {/* Background Gradients - Dynamic Accent Color */}
                {/* Background Gradients - using radial-gradient for better html2canvas support */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-15"
                    style={{
                        background: `
                            radial-gradient(circle at 90% 10%, ${currentStyles.accentColor}, transparent 50%),
                            radial-gradient(circle at 10% 90%, ${currentStyles.accentColor}, transparent 50%)
                        `,
                        mixBlendMode: 'screen'
                    }}
                />

                {/* Header / Branding */}
                <div className="flex justify-between items-center mb-12 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Placeholder for optional user avatar or logo */}
                        {userName && (
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
                                style={{ backgroundColor: currentStyles.accentColor }}
                            >
                                {userName.charAt(0)}
                            </div>
                        )}
                        <div className="flex flex-col">
                            {userName && <span className="font-bold text-lg tracking-wide opacity-90">{userName}</span>}
                            {userHandle && <span className="text-sm opacity-60">@{userHandle}</span>}
                        </div>
                    </div>
                    <div className="flex items-center justify-center h-12 px-6 mt-2 mr-2 rounded-full border backdrop-blur-md min-w-[3rem]" style={{ borderColor: `${currentStyles.textColor}20`, backgroundColor: `${currentStyles.textColor}05` }}>
                        <span className="text-lg font-mono opacity-80 pb-4">
                            {slide.slideNumber} / {totalSlides}
                        </span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div
                    className={`flex-1 flex flex-col items-center gap-12 z-10 ${alignmentClass}`}
                    style={{
                        transform: `translate(${currentStyles.textPositionX || 0}px, ${currentStyles.textPositionY || 0}px)`
                    }}
                >

                    {/* Title */}
                    <h1
                        className="text-6xl font-bold leading-tight drop-shadow-sm mb-4"
                        style={{
                            color: currentStyles.textColor,
                            fontSize: `${currentStyles.titleFontSize}px`
                        }}
                    >
                        {slide.title}
                    </h1>

                    {/* Image Area */}
                    {slide.imageUrl ? (
                        <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border group shrink-0" style={{ borderColor: `${currentStyles.textColor}20` }}>
                            <img
                                src={slide.imageUrl}
                                alt={slide.title}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous" // Important for html2canvas
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                    ) : (
                        <div
                            className="w-full aspect-video rounded-3xl flex items-center justify-center border-dashed border-2 shrink-0"
                            style={{ borderColor: `${currentStyles.textColor}20`, backgroundColor: `${currentStyles.textColor}05` }}
                        >
                            <span className="text-2xl opacity-50">No Image</span>
                        </div>
                    )}

                    {/* Content Body */}
                    <div
                        className="relative p-8 rounded-3xl w-full"
                        // Removed backdrop-blur-sm as it causes issues with html2canvas. Increased opacity for visibility.
                        style={{ backgroundColor: `${currentStyles.textColor}10`, border: `1px solid ${currentStyles.textColor}15` }}
                    >
                        <p
                            className="text-3xl leading-relaxed font-light opacity-90"
                            style={{ fontSize: `${currentStyles.contentFontSize}px` }}
                        >
                            {slide.content}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-12 pb-12 flex justify-center items-center gap-2 text-lg z-10 opacity-50 shrink-0">
                    <span>Swipe for more</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        );
    }
);

SlideExportTemplate.displayName = 'SlideExportTemplate';

export default SlideExportTemplate;
