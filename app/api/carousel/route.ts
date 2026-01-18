import { NextRequest, NextResponse } from "next/server";
import { Language, Tone, GeneratedCarousel, CarouselSlide } from "@/types";
import { buildCarouselPrompt } from "@/lib/prompts";
import { htmlToPlainText } from "@/lib/linkedin-formatter";
import { callOpenRouterForCarousel } from "@/lib/api/openrouter-client";
import { logger } from "@/lib/utils/logger";

function parseCarousel(content: string, language: Language, originalLength: number): GeneratedCarousel {
  // Filter out introductory text patterns - expanded list
  const introPatterns = [
    /^here(?:'s| is| are)/i,
    /^i(?:'ve| have) created/i,
    /^based on (?:your|the)/i,
    /^let me (?:create|generate|provide)/i,
    /^(?:certainly|sure|of course)[,!]?\s*/i,
    /^this carousel/i,
    /^(?:below|following) (?:is|are)/i,
    /^\*\*carousel/i,
    /^here's a linkedin carousel/i,
    /^for this carousel/i,
    /^here is the linkedin post/i,
    /^the linkedin post converted/i,
    /^converted into a/i,
    /^i've converted/i,
    /^this is a carousel/i,
    /^the following carousel/i,
    /^\*\*background:/i,
    /^background:/i,
    /^فەرموو/i,
    /^ئەمەش/i,
    /^بەڵێ/i,
    /^لێرەدا/i,
    /^بە دڵنیاییەوە/i,
  ];

  const shouldSkipLine = (line: string): boolean => {
    const trimmed = line.trim();
    const lowerTrimmed = trimmed.toLowerCase();

    // Check if it's a slide key
    if (/^SLIDE\s*\d+/i.test(trimmed) || /^سلاید\s*\d+/i.test(trimmed)) return false;

    if (trimmed.length < 5) return false; // Keep short lines

    // Skip lines that start with intro patterns
    if (introPatterns.some(pattern => pattern.test(lowerTrimmed))) {
      return true;
    }

    // Skip lines that are just formatting markers without content
    if (/^\*+$/.test(trimmed) || /^-+$/.test(trimmed) || /^=+$/.test(trimmed)) {
      return true;
    }

    return false;
  };

  // Also filter title to remove intro text
  const cleanField = (text: string): string => {
    let cleaned = text.trim();
    // Remove markdown bold markers and other common noise
    cleaned = cleaned.replace(/^[\*#\-_]+|[\*#\-_]+$/g, '').trim();

    // Skip if it looks like intro text
    if (introPatterns.some(pattern => pattern.test(cleaned.toLowerCase()))) {
      return '';
    }
    return cleaned;
  };

  let lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Filter out intro lines at the beginning
  while (lines.length > 0 && shouldSkipLine(lines[0])) {
    lines.shift();
  }

  const slides: CarouselSlide[] = [];
  let currentSlide: Partial<CarouselSlide> | null = null;
  let imageTheme: string | undefined;
  let brandingGuidelines: string | undefined;
  let introduction: string | undefined;
  let conclusion: string | undefined;
  const hashtags: string[] = [];

  // Patterns to detect slide structure - robust against markdown
  // Matches: "SLIDE 1:", "**SLIDE 1**:", "### SLIDE 1"
  const slidePattern = language === 'kurdish'
    ? /^(?:#{1,6}\s*|\*{0,2})?(?:SLIDE|سلاید)\s*(\d+)[:\.]?(?:\*{0,2})?/i
    : /^(?:#{1,6}\s*|\*{0,2})?SLIDE\s*(\d+)[:\.]?(?:\*{0,2})?/i;

  const titlePattern = language === 'kurdish'
    ? /^(?:#{1,6}\s*|\*{0,2})?(?:TITLE|سەردێڕ)[:\-]?\s*(?:\*{0,2})?/i
    : /^(?:#{1,6}\s*|\*{0,2})?TITLE[:\-]?\s*(?:\*{0,2})?/i;

  const contentPattern = language === 'kurdish'
    ? /^(?:#{1,6}\s*|\*{0,2})?(?:CONTENT|ناوەڕۆک)[:\-]?\s*(?:\*{0,2})?/i
    : /^(?:#{1,6}\s*|\*{0,2})?CONTENT[:\-]?\s*(?:\*{0,2})?/i;

  const imagePattern = language === 'kurdish'
    ? /^(?:#{1,6}\s*|\*{0,2})?(?:IMAGE|وێنە)[:\-]?\s*(?:\*{0,2})?/i
    : /^(?:#{1,6}\s*|\*{0,2})?IMAGE[:\-]?\s*(?:\*{0,2})?/i;

  const themePattern = language === 'kurdish'
    ? /(?:تێم|theme|master.*theme|branding)/i
    : /(?:master.*theme|theme|branding|image.*theme)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for slide start
    const slideMatch = line.match(slidePattern);
    if (slideMatch) {
      if (currentSlide && currentSlide.title && currentSlide.content) {
        const slideContent = (currentSlide.title || '') + ' ' + (currentSlide.content || '');
        slides.push({
          slideNumber: currentSlide.slideNumber || slides.length + 1,
          title: currentSlide.title || '',
          content: currentSlide.content || '',
          imageSuggestion: currentSlide.imageSuggestion,
          characterCount: slideContent.length,
          keyPoints: currentSlide.keyPoints,
        });
      }

      const slideNum = parseInt(slideMatch[1] || '1', 10);
      currentSlide = { slideNumber: slideNum };
      continue;
    }

    // Skip introductory lines ONLY if we haven't found a slide yet
    if (slides.length === 0 && !currentSlide && shouldSkipLine(line)) {
      continue;
    }

    // Check for title
    if (titlePattern.test(line)) {
      if (currentSlide) {
        const rawTitle = line.replace(titlePattern, '');
        currentSlide.title = cleanField(rawTitle);
      }
      continue;
    }

    // Check for content
    if (contentPattern.test(line)) {
      if (currentSlide) {
        const rawContent = line.replace(contentPattern, '');
        currentSlide.content = cleanField(rawContent);
      }
      continue;
    }

    // Check for image
    if (imagePattern.test(line)) {
      if (currentSlide) {
        const rawImage = line.replace(imagePattern, '');
        currentSlide.imageSuggestion = cleanField(rawImage);
      }
      continue;
    }

    // Check for theme/branding
    if (themePattern.test(line)) {
      if (!imageTheme) {
        imageTheme = cleanField(line.replace(themePattern, '').replace(/^[:\-\s]+/, ''));
      } else {
        brandingGuidelines = line;
      }
      continue;
    }

    // If we're in a slide context, append to content
    if (currentSlide && currentSlide.title && !currentSlide.content) {
      currentSlide.content = line;
    } else if (currentSlide && currentSlide.content && !currentSlide.imageSuggestion) {
      // Might be continuation of content or image suggestion
      if (line.length < 100) {
        currentSlide.content += ' ' + line;
      }
    } else if (!currentSlide && slides.length === 0 && line.length > 20) {
      // Might be introduction
      introduction = line;
    } else if (slides.length > 0 && !currentSlide && line.length > 20) {
      // Might be conclusion or theme
      if (themePattern.test(line)) {
        imageTheme = line;
      } else {
        conclusion = line;
      }
    }
  }

  // Save last slide
  if (currentSlide && currentSlide.title && currentSlide.content) {
    const slideContent = (currentSlide.title || '') + ' ' + (currentSlide.content || '');
    slides.push({
      slideNumber: currentSlide.slideNumber || slides.length + 1,
      title: currentSlide.title || '',
      content: currentSlide.content || '',
      imageSuggestion: currentSlide.imageSuggestion,
      characterCount: slideContent.length,
      keyPoints: currentSlide.keyPoints,
    });
  }

  // Extract hashtags from content
  const fullContent = content;
  const hashtagRegex = /#([\w\u0600-\u06FF]+)/g;
  const hashtagMatches = Array.from(fullContent.matchAll(hashtagRegex));
  const foundHashtags = hashtagMatches
    .map((match) => match[1])
    .filter((tag) => tag.length > 0)
    .slice(0, 5);

  // Calculate metadata
  const totalCarouselLength = slides.reduce((sum, slide) => sum + slide.characterCount, 0);
  const averageSlideLength = slides.length > 0 ? Math.round(totalCarouselLength / slides.length) : 0;

  // If no slides were parsed, create a fallback
  if (slides.length === 0) {
    // Try to break content into logical sections
    const sections = content.split(/\n\n+/).filter(s => s.trim().length > 20);
    sections.slice(0, 5).forEach((section, index) => {
      const lines = section.split('\n').filter(l => l.trim());
      const title = lines[0]?.substring(0, 50) || `Slide ${index + 1}`;
      const slideContent = lines.slice(1).join(' ').substring(0, 120) || section.substring(0, 120);
      slides.push({
        slideNumber: index + 1,
        title: title.trim(),
        content: slideContent.trim(),
        characterCount: (title + ' ' + slideContent).length,
      });
    });
  }

  return {
    slides,
    totalSlides: slides.length,
    introduction,
    conclusion,
    hashtags: foundHashtags,
    imageTheme,
    brandingGuidelines,
    metadata: {
      originalLength,
      carouselLength: totalCarouselLength,
      averageSlideLength,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, language, tone, targetSlideCount } = body;

    if (!postContent || !language || !tone) {
      return NextResponse.json(
        { error: "Missing required parameters: postContent, language, tone" },
        { status: 400 }
      );
    }

    if (!postContent.trim()) {
      return NextResponse.json(
        { error: "Post content cannot be empty" },
        { status: 400 }
      );
    }

    const plainTextContent = htmlToPlainText(postContent);
    const originalLength = plainTextContent.length;

    const prompt = await buildCarouselPrompt({
      postContent: plainTextContent,
      language: language as Language,
      tone: tone as Tone,
      targetSlideCount: targetSlideCount as number | undefined,
    });

    const content = await callOpenRouterForCarousel([
      { role: "user", content: prompt }
    ]);

    if (!content) {
      throw new Error("No carousel generated");
    }

    const carousel = parseCarousel(content, language as Language, originalLength);

    // Validate we have slides
    if (carousel.slides.length === 0) {
      throw new Error("Failed to parse carousel slides from response");
    }

    return NextResponse.json({ carousel });
  } catch (error) {
    logger.error("Error generating carousel:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate carousel";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
