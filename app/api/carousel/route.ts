import { NextRequest, NextResponse } from "next/server";
import { Language, Tone, GeneratedCarousel, CarouselSlide } from "@/types";
import { buildCarouselPrompt } from "@/lib/prompts";
import { htmlToPlainText } from "@/lib/linkedin-formatter";
import { callOpenRouterForCarousel } from "@/lib/api/openrouter-client";
import { logger } from "@/lib/utils/logger";

function parseCarousel(content: string, language: Language, originalLength: number): GeneratedCarousel {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const slides: CarouselSlide[] = [];
  let currentSlide: Partial<CarouselSlide> | null = null;
  let imageTheme: string | undefined;
  let brandingGuidelines: string | undefined;
  let introduction: string | undefined;
  let conclusion: string | undefined;
  const hashtags: string[] = [];

  // Patterns to detect slide structure
  const slidePattern = language === 'kurdish'
    ? /^SLIDE\s*(\d+):?|^سلاید\s*(\d+):?/i
    : /^SLIDE\s*(\d+):?/i;
  
  const titlePattern = language === 'kurdish'
    ? /^TITLE:|^سەردێڕ:/i
    : /^TITLE:/i;
  
  const contentPattern = language === 'kurdish'
    ? /^CONTENT:|^ناوەڕۆک:/i
    : /^CONTENT:/i;
  
  const imagePattern = language === 'kurdish'
    ? /^IMAGE:|^وێنە:/i
    : /^IMAGE:/i;
  
  const themePattern = language === 'kurdish'
    ? /(?:تێم|theme|master.*theme|branding)/i
    : /(?:master.*theme|theme|branding|image.*theme)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for slide start
    const slideMatch = line.match(slidePattern);
    if (slideMatch) {
      // Save previous slide if exists
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
      
      // Start new slide
      const slideNum = parseInt(slideMatch[1] || slideMatch[2] || '1', 10);
      currentSlide = { slideNumber: slideNum };
      continue;
    }

    // Check for title
    if (titlePattern.test(line)) {
      if (currentSlide) {
        currentSlide.title = line.replace(titlePattern, '').trim();
      }
      continue;
    }

    // Check for content
    if (contentPattern.test(line)) {
      if (currentSlide) {
        currentSlide.content = line.replace(contentPattern, '').trim();
      }
      continue;
    }

    // Check for image
    if (imagePattern.test(line)) {
      if (currentSlide) {
        currentSlide.imageSuggestion = line.replace(imagePattern, '').trim();
      }
      continue;
    }

    // Check for theme/branding
    if (themePattern.test(line) || (i > lines.length - 5 && line.length > 50)) {
      // Likely theme description at the end
      if (!imageTheme) {
        imageTheme = line;
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
