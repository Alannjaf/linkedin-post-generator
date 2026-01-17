import { NextRequest, NextResponse } from "next/server";
import { PostGenerationParams, GeneratedPost, PostLength } from "@/types";
import { buildPostPrompt, buildHashtagPrompt } from "@/lib/prompts";
import { callOpenRouterSimple } from "@/lib/api/openrouter-client";
import { cleanPostContent } from "@/lib/utils/content-cleaner";
import { logger } from "@/lib/utils/logger";

// Character count targets based on post length (used in prompts, not as hard limits)
const CHARACTER_TARGETS: Record<PostLength, number> = {
  short: 300,
  medium: 800,
  long: 1500,
};

export async function POST(request: NextRequest) {
  try {
    const body: PostGenerationParams = await request.json();
    const { context, language, tone, length, trendingHashtags } = body;

    if (!context || !language || !tone || !length) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const prompt = await buildPostPrompt({ context, language, tone, length });
    const content = await callOpenRouterSimple(
      [{ role: "user", content: prompt }]
    );

    if (!content) {
      throw new Error("No content generated");
    }

    // Clean up content: remove meta-commentary and asterisks
    const cleanedContent = cleanPostContent(content, language);

    // Extract hashtags from the cleaned content using matchAll (more efficient)
    const hashtagRegex = /#([\w\u0600-\u06FF]+)/g; // Supports Unicode for Kurdish
    const hashtagMatches = Array.from(cleanedContent.matchAll(hashtagRegex));
    let foundHashtags = hashtagMatches
      .map((match) => match[1])
      .filter((tag) => tag.length > 0)
      .slice(0, 5);

    // Remove hashtags from content
    const cleanContent = cleanedContent.replace(hashtagRegex, "").trim();

    // Fallback: If no hashtags found, generate them separately as a safety mechanism
    // This handles cases where AI doesn't follow instructions or regex fails to match
    if (foundHashtags.length === 0) {
      try {
        const hashtagPrompt = buildHashtagPrompt({
          postContent: cleanContent,
          language,
          trendingHashtags: trendingHashtags,
        });
        // Generate hashtags separately
        const hashtagContent = await callOpenRouterSimple(
          [{ role: "user", content: hashtagPrompt }]
        );

        foundHashtags = hashtagContent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.replace(/^#/, ""))
          .slice(0, 5);
      } catch (error) {
        // If hashtag generation fails, log but don't fail the entire request
        logger.warn("Failed to generate hashtags as fallback:", error);
        // Continue with empty hashtags array
      }
    }

    const result: GeneratedPost = {
      content: cleanContent,
      hashtags: foundHashtags,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error generating post:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate post";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
