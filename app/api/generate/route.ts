import { NextRequest, NextResponse } from "next/server";
import { PostGenerationParams, GeneratedPost, PostLength, Language } from "@/types";
import { buildPostPrompt, buildHashtagPrompt } from "@/lib/prompts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Try gemini-3-pro-preview first, fallback to gemini-3-flash-preview if needed
const DEFAULT_MODEL = "google/gemini-3-pro-preview";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";
// Timeout for OpenRouter API calls (90 seconds - AI generation can take time)
const OPENROUTER_TIMEOUT = 90000;

// Character count targets based on post length (used in prompts, not as hard limits)
const CHARACTER_TARGETS: Record<PostLength, number> = {
  short: 300,
  medium: 800,
  long: 1500,
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

// Clean up generated content: remove meta-commentary and asterisks
function cleanPostContent(content: string, language: Language): string {
  let cleaned = content;

  // Remove asterisks
  cleaned = cleaned.replace(/\*/g, '');

  // Remove meta-commentary patterns
  const lines = cleaned.split('\n');
  const cleanedLines: string[] = [];
  
  // Patterns to identify and remove meta-commentary lines
  const metaPatterns = language === 'kurdish' 
    ? [
        /^فەرموو[،,]/i,
        /^ئەمەش پۆستێکی/i,
        /^بەپێی داواکارییەکانت/i,
        /^بەپێی داواکاریەکانت/i,
        /^لەبەرگرتنەوەی/i,
        /^پۆستێکی LinkedIn/i,
        /نزیکەی \d+ پیت/i,
        /تێکەڵەیەکە لە/i,
      ]
    : [
        /^here'?s a linkedin post/i,
        /^based on your requirements/i,
        /^this is a linkedin post/i,
        /^here is a post/i,
        /^based on the context/i,
        /^following is a linkedin post/i,
        /approximately \d+ characters/i,
        /around \d+ words/i,
      ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip empty lines at the start
    if (cleanedLines.length === 0 && !trimmedLine) {
      continue;
    }
    
    // Check if line matches meta-commentary patterns
    const isMetaCommentary = metaPatterns.some(pattern => pattern.test(trimmedLine));
    
    // Also check if line contains colons followed by explanatory text (common in meta-commentary)
    const hasExplanatoryColon = trimmedLine.includes(':') && 
      (trimmedLine.toLowerCase().includes('post') || 
       trimmedLine.includes('پۆست') ||
       trimmedLine.includes('داواکاری') ||
       trimmedLine.includes('requirements'));
    
    if (!isMetaCommentary && !hasExplanatoryColon) {
      cleanedLines.push(line);
    }
  }

  cleaned = cleanedLines.join('\n').trim();

  // Remove any remaining asterisks (in case they were in the middle of lines)
  cleaned = cleaned.replace(/\*/g, '');

  return cleaned;
}

/**
 * Fetch with timeout support using AbortController (server-side)
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = OPENROUTER_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request to OpenRouter API timed out. The service took too long to respond. Please try again.');
    }
    throw error;
  }
}

async function callOpenRouter(
  messages: OpenRouterMessage[],
  useFallback: boolean = false
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const modelToUse = useFallback ? FALLBACK_MODEL : DEFAULT_MODEL;
  console.log(`Using model: ${modelToUse}`);

  try {
    const response = await fetchWithTimeout(OPENROUTER_API_URL, {
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
      }),
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
        return callOpenRouter(messages, true);
      }
      
      throw new Error(`API returned empty content. Model "${modelToUse}" might not be available or the response format is unexpected. Please check the model name.`);
    }

    return trimmedContent;
  } catch (error) {
    console.error("callOpenRouter error:", error);
    if (error instanceof Error) {
      // Log the actual error message for debugging
      console.error("OpenRouter API error details:", error.message);
      
      // Check if it's a timeout error
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        throw error; // Re-throw timeout errors as-is (already user-friendly)
      }
      
      // Check if it's a network error
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new Error('Connection error. Unable to reach the AI service. Please check your connection and try again.');
      }
      
      // Re-throw API errors as-is
      throw error;
    }
    throw new Error("Failed to generate post");
  }
}

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

    const prompt = buildPostPrompt({ context, language, tone, length });
    const content = await callOpenRouter(
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
        const hashtagContent = await callOpenRouter(
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
