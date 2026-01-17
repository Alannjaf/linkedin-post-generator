import { NextRequest, NextResponse } from "next/server";
import { Language, Platform, AdaptedContent } from "@/types";
import { buildAdaptationPrompt } from "@/lib/prompts";
import { formatForPlatform } from "@/lib/platform-formatters";
import { htmlToPlainText } from "@/lib/linkedin-formatter";
import { callOpenRouterForAdaptation } from "@/lib/api/openrouter-client";
import { cleanAdaptedContent } from "@/lib/utils/content-cleaner";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, sourceLanguage, targetPlatform, preserveTone } = body;

    if (!postContent || !sourceLanguage || !targetPlatform) {
      return NextResponse.json(
        { error: "Missing required parameters: postContent, sourceLanguage, targetPlatform" },
        { status: 400 }
      );
    }

    if (!postContent.trim()) {
      return NextResponse.json(
        { error: "Post content cannot be empty" },
        { status: 400 }
      );
    }

    const validPlatforms: Platform[] = ['twitter', 'facebook', 'medium', 'instagram'];
    if (!validPlatforms.includes(targetPlatform as Platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    const plainTextContent = htmlToPlainText(postContent);
    const originalLength = plainTextContent.length;

    const prompt = await buildAdaptationPrompt({
      postContent: plainTextContent,
      sourceLanguage: sourceLanguage as Language,
      targetPlatform: targetPlatform as Platform,
      preserveTone: preserveTone !== false,
    });

    const adaptedContent = await callOpenRouterForAdaptation([
      { role: "user", content: prompt }
    ]);

    if (!adaptedContent) {
      throw new Error("No adapted content generated");
    }

    const cleanedContent = cleanAdaptedContent(adaptedContent, sourceLanguage as Language);
    const formatted = formatForPlatform(cleanedContent, targetPlatform as Platform, originalLength);

    return NextResponse.json({ adaptedContent: formatted });
  } catch (error) {
    logger.error("Error adapting content:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to adapt content";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
