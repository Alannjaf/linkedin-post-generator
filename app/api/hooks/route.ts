import { NextRequest, NextResponse } from "next/server";
import { Language, Tone, HookStyle, GeneratedHook } from "@/types";
import { buildHookPrompt } from "@/lib/prompts";

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
        max_tokens: 500, // Limit tokens for hook generation (short opening lines)
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
    throw new Error("Failed to generate hooks");
  }
}

function parseHooks(content: string, language: Language): GeneratedHook[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const hooks: GeneratedHook[] = [];
  const hookStyles: HookStyle[] = ['question', 'statement', 'story', 'statistic'];

  for (let i = 0; i < lines.length && hooks.length < 5; i++) {
    const line = lines[i];
    
    // Skip meta-commentary
    if (language === 'kurdish') {
      if (line.match(/^هۆک|^پێشنیار|^نموونە/i)) continue;
    } else {
      if (line.match(/^hook|^option|^suggestion|^example/i)) continue;
    }

    // Try to detect hook style
    let detectedStyle: HookStyle = 'statement';
    if (line.includes('?') || line.match(/^(what|how|why|when|where|who|which|do|does|did|can|could|will|would|should|is|are|was|were)/i)) {
      detectedStyle = 'question';
    } else if (line.match(/^\d+[%]|^\d+ out of|\d+ percent|statistics?|data shows|research shows/i)) {
      detectedStyle = 'statistic';
    } else if (line.match(/^(once|when|years? ago|last|recently|story|tale)/i)) {
      detectedStyle = 'story';
    }

    // Rotate through styles if we have multiple hooks
    if (hooks.length < hookStyles.length) {
      detectedStyle = hookStyles[hooks.length];
    }

    hooks.push({
      text: line,
      style: detectedStyle,
    });
  }

  return hooks.length > 0 ? hooks : [{ text: content.trim(), style: 'statement' }];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, language, tone, hookStyle } = body;

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

    const prompt = buildHookPrompt({
      postContent: postContent.trim(),
      language: language as Language,
      tone: tone as Tone,
      hookStyle: hookStyle as HookStyle | undefined,
    });

    const content = await callOpenRouter([
      { role: "user", content: prompt }
    ]);

    if (!content) {
      throw new Error("No hooks generated");
    }

    const hooks = parseHooks(content, language as Language);

    return NextResponse.json({ hooks });
  } catch (error) {
    console.error("Error generating hooks:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate hooks";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
