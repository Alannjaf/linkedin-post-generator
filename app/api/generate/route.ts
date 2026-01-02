import { NextRequest, NextResponse } from "next/server";
import { PostGenerationParams, GeneratedPost, PostLength } from "@/types";
import { buildPostPrompt, buildHashtagPrompt } from "@/lib/prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Try gemini-3-pro-preview first, fallback to gemini-3-flash-preview if needed
const DEFAULT_MODEL = "google/gemini-3-pro-preview";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";
const REQUEST_TIMEOUT = 60000; // 60 seconds (Pro models are slower)

// Character count targets based on post length (used in prompts, not as hard limits)
const CHARACTER_TARGETS: Record<PostLength, number> = {
  short: 300,
  medium: 800,
  long: 1500,
};

// High token limits to allow model to generate freely based on character instructions
// Pro models use reasoning tokens, so we set high limits and rely on prompt instructions
const MAX_TOKENS: Record<PostLength, number> = {
  short: 2000,
  medium: 4000,
  long: 6000,
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
  maxTokens: number,
  useFallback: boolean = false
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const modelToUse = useFallback ? FALLBACK_MODEL : DEFAULT_MODEL;
  console.log(`Using model: ${modelToUse}`);

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
        model: modelToUse,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.statusText}`;
      console.error("OpenRouter API error response:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(errorMessage);
    }

    const data: any = await response.json();

    // Log the full response for debugging
    console.log("OpenRouter API response structure:", JSON.stringify(data, null, 2));
    console.log("Response details:", {
      hasError: !!data.error,
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoice: data.choices?.[0],
      firstChoiceKeys: data.choices?.[0] ? Object.keys(data.choices[0]) : [],
    });

    if (data.error) {
      console.error("OpenRouter API error:", data.error);
      throw new Error(data.error.message || "API returned an error");
    }

    if (!data.choices || data.choices.length === 0) {
      console.error("No choices in OpenRouter response. Full response:", JSON.stringify(data, null, 2));
      throw new Error("No response choices from API. The model might not be available or the response format is unexpected.");
    }

    // Handle different possible response structures
    const firstChoice = data.choices[0];
    console.log("First choice structure:", JSON.stringify(firstChoice, null, 2));
    
    // Try multiple possible content locations
    const content = firstChoice?.message?.content || 
                   firstChoice?.message?.text ||
                   firstChoice?.text || 
                   firstChoice?.content ||
                   firstChoice?.delta?.content ||
                   "";

    const trimmedContent = typeof content === 'string' ? content.trim() : "";
    
    if (!trimmedContent) {
      console.error("Empty content in response. Full response:", JSON.stringify(data, null, 2));
      console.error("First choice keys:", firstChoice ? Object.keys(firstChoice) : "no first choice");
      console.error("First choice message keys:", firstChoice?.message ? Object.keys(firstChoice.message) : "no message");
      
      // Try fallback model if we haven't already
      if (!useFallback) {
        console.log(`Retrying with fallback model: ${FALLBACK_MODEL}`);
        return callOpenRouter(messages, maxTokens, true);
      }
      
      throw new Error(`API returned empty content. Model "${modelToUse}" might not be available or the response format is unexpected. Please check the model name.`);
    }

    return trimmedContent;
  } catch (error) {
    console.error("callOpenRouter error:", error);
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.message.includes("timeout")) {
        throw new Error("Request timed out. Please try again.");
      }
      // Log the actual error message for debugging
      console.error("OpenRouter API error details:", error.message);
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
    const maxTokens = MAX_TOKENS[length];
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
    let foundHashtags = hashtagMatches
      .map((match) => match[1])
      .filter((tag) => tag.length > 0)
      .slice(0, 5);

    // Remove hashtags from content
    const cleanContent = content.replace(hashtagRegex, "").trim();

    // Fallback: If no hashtags found, generate them separately as a safety mechanism
    // This handles cases where AI doesn't follow instructions or regex fails to match
    if (foundHashtags.length === 0) {
      try {
        const hashtagPrompt = buildHashtagPrompt({
          postContent: cleanContent,
          language,
        });
        // Use smaller token limit for hashtag generation (just hashtags, not full post)
        const hashtagContent = await callOpenRouter(
          [{ role: "user", content: hashtagPrompt }],
          200 // Small token limit for hashtags only
        );

        foundHashtags = hashtagContent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.replace(/^#/, ""))
          .slice(0, 5);
      } catch (error) {
        // If hashtag generation fails, log but don't fail the entire request
        console.warn("Failed to generate hashtags as fallback:", error);
        // Continue with empty hashtags array
      }
    }

    const result: GeneratedPost = {
      content: cleanContent,
      hashtags: foundHashtags,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating post:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate post";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
