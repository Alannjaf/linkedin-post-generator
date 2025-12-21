import { NextRequest, NextResponse } from "next/server";
import { PostGenerationParams, GeneratedPost, PostLength } from "@/types";
import { buildPostPrompt } from "@/lib/prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Token limits based on post length
const TOKEN_LIMITS: Record<PostLength, number> = {
  short: 400,
  medium: 1000,
  long: 2000,
};

interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

async function callOpenRouter(
  messages: OpenRouterMessage[],
  maxTokens: number
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "LinkedIn Post Generator",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API error: ${response.statusText}`
      );
    }

    const data: OpenRouterResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.message.includes("timeout")) {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    }
    throw new Error("Failed to generate post");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PostGenerationParams = await request.json();
    const { context, language, tone, length } = body;

    if (!context || !language || !tone || !length) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const prompt = buildPostPrompt({ context, language, tone, length });
    const maxTokens = TOKEN_LIMITS[length];
    const content = await callOpenRouter(
      [{ role: "user", content: prompt }],
      maxTokens
    );

    if (!content) {
      throw new Error("No content generated");
    }

    // Extract hashtags from the content using matchAll (more efficient)
    const hashtagRegex = /#([\w\u0600-\u06FF]+)/g; // Supports Unicode for Kurdish
    const hashtagMatches = Array.from(content.matchAll(hashtagRegex));
    const foundHashtags = hashtagMatches
      .map((match) => match[1])
      .filter((tag) => tag.length > 0)
      .slice(0, 5);

    // Remove hashtags from content
    const cleanContent = content.replace(hashtagRegex, "").trim();

    const result: GeneratedPost = {
      content: cleanContent,
      hashtags: foundHashtags.length > 0 ? foundHashtags : [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating post:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate post";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
