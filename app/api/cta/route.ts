import { NextRequest, NextResponse } from "next/server";
import { Language, Tone, GeneratedCTA, CTAPlacement } from "@/types";
import { buildCTAPrompt } from "@/lib/prompts";
import { callOpenRouterForCTA } from "@/lib/api/openrouter-client";
import { logger } from "@/lib/utils/logger";

function parseCTAs(content: string, language: Language): GeneratedCTA[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const ctas: GeneratedCTA[] = [];
  const placementOptions: Array<'start' | 'middle' | 'end' | 'embedded'> = ['end', 'middle', 'embedded', 'start', 'end'];

  // Patterns to skip (introductory/meta text)
  const skipPatternsEnglish = /^(here|sure|certainly|of course|based on|these are|i've|i have|let me|below|following|great|absolutely|happy to)/i;
  const skipPatternsKurdish = /^(CTA|پێشنیار|نموونە|ئەمانە|لێرەدا)/i;
  const numberedPrefix = /^\d+[\.\)\-:]\s*/;
  const bulletPrefix = /^[\-\*•]\s*/;

  for (let i = 0; i < lines.length && ctas.length < 5; i++) {
    let line = lines[i];

    // Skip meta-commentary
    if (language === 'kurdish') {
      if (skipPatternsKurdish.test(line)) continue;
    } else {
      if (skipPatternsEnglish.test(line)) continue;
      if (line.match(/^CTA|^option|^suggestion|^example/i)) continue;
    }

    // Skip very short lines (likely headers or labels)
    if (line.length < 10) continue;

    // Remove numbered prefixes (1., 2), 3-, etc.)
    line = line.replace(numberedPrefix, '').trim();
    // Remove bullet prefixes
    line = line.replace(bulletPrefix, '').trim();

    // Skip if too short after cleanup
    if (line.length < 5) continue;

    // Parse format: "CTA_TEXT | placement" or just "CTA_TEXT"
    let ctaText = line;
    let placement: CTAPlacement['position'] = 'end';

    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      ctaText = parts[0];
      const placementStr = parts[1]?.toLowerCase();

      if (placementStr === 'start' || placementStr === 'دەستپێک') {
        placement = 'start';
      } else if (placementStr === 'middle' || placementStr === 'ناوەڕاست') {
        placement = 'middle';
      } else if (placementStr === 'embedded' || placementStr === 'تێکەڵ') {
        placement = 'embedded';
      } else {
        placement = 'end';
      }
    } else {
      // Default placement rotation
      placement = placementOptions[ctas.length % placementOptions.length];
    }

    // Clean up CTA text
    ctaText = ctaText.replace(/^["']|["']$/g, '').trim();

    if (ctaText.length > 0) {
      ctas.push({
        text: ctaText,
        placement: {
          position: placement,
          suggestion: language === 'kurdish'
            ? placement === 'start' ? 'دەستپێکی پۆست' : placement === 'middle' ? 'ناوەڕاستی پۆست' : placement === 'embedded' ? 'تێکەڵ لە ناوەڕۆکدا' : 'کۆتایی پۆست'
            : placement === 'start' ? 'Start of post' : placement === 'middle' ? 'Middle of post' : placement === 'embedded' ? 'Embedded in content' : 'End of post',
        },
        effectivenessScore: Math.min(85 + Math.random() * 15, 100), // Simulated score
      });
    }
  }

  return ctas.length > 0 ? ctas : [{
    text: content.trim(),
    placement: { position: 'end', suggestion: 'End of post' }
  }];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, language, tone, postType } = body;

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

    const prompt = await buildCTAPrompt({
      postContent: postContent.trim(),
      language: language as Language,
      tone: tone as Tone,
      postType: postType as 'engagement' | 'showcase' | 'educational' | 'story' | 'building' | 'announcement' | undefined,
    });

    const content = await callOpenRouterForCTA([
      { role: "user", content: prompt }
    ]);

    if (!content) {
      throw new Error("No CTAs generated");
    }

    const ctas = parseCTAs(content, language as Language);

    return NextResponse.json({ ctas });
  } catch (error) {
    logger.error("Error generating CTAs:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate CTAs";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
