import { NextRequest, NextResponse } from "next/server";
import { Language, Platform, AdaptedContent } from "@/types";
import { buildAdaptationPrompt } from "@/lib/prompts";
import { formatForPlatform } from "@/lib/platform-formatters";
import { htmlToPlainText } from "@/lib/linkedin-formatter";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-pro-preview";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";
const OPENROUTER_TIMEOUT = 90000;

interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

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
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const modelToUse = useFallback ? FALLBACK_MODEL : DEFAULT_MODEL;

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
        max_tokens: 2000, // Limit tokens for content adaptation (platform-specific limits apply)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data: any = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "API returned an error");
    }

    if (!data.choices || data.choices.length === 0) {
      if (!useFallback) {
        return callOpenRouter(messages, true);
      }
      throw new Error("No response choices from API");
    }

    const firstChoice = data.choices[0];
    const content = firstChoice?.message?.content || 
                   firstChoice?.message?.text ||
                   firstChoice?.text || 
                   firstChoice?.content ||
                   "";

    const trimmedContent = typeof content === 'string' ? content.trim() : "";
    
    if (!trimmedContent) {
      if (!useFallback) {
        return callOpenRouter(messages, true);
      }
      throw new Error(`API returned empty content`);
    }

    return trimmedContent;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        throw error;
      }
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new Error('Connection error. Unable to reach the AI service. Please check your connection and try again.');
      }
      throw error;
    }
    throw new Error("Failed to adapt content");
  }
}

function cleanAdaptedContent(content: string, language: Language): string {
  let cleaned = content;

  // Remove meta-commentary patterns
  const lines = cleaned.split('\n');
  const cleanedLines: string[] = [];
  
  const metaPatterns = language === 'kurdish' 
    ? [
        /^پۆستێکی|^نموونە|^ئەمەش|^بەپێی/i,
      ]
    : [
        /^here'?s a|^this is a|^based on|^example/i,
      ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (cleanedLines.length === 0 && !trimmedLine) {
      continue;
    }
    
    const isMetaCommentary = metaPatterns.some(pattern => pattern.test(trimmedLine));
    
    if (!isMetaCommentary) {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n').trim();
}

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

    const adaptedContent = await callOpenRouter([
      { role: "user", content: prompt }
    ]);

    if (!adaptedContent) {
      throw new Error("No adapted content generated");
    }

    const cleanedContent = cleanAdaptedContent(adaptedContent, sourceLanguage as Language);
    const formatted = formatForPlatform(cleanedContent, targetPlatform as Platform, originalLength);

    return NextResponse.json({ adaptedContent: formatted });
  } catch (error) {
    console.error("Error adapting content:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to adapt content";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
