import { NextRequest, NextResponse } from "next/server";
import { Language, Tone, GeneratedCTA, CTAPlacement } from "@/types";
import { buildCTAPrompt } from "@/lib/prompts";

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
        max_tokens: 500, // Limit tokens for CTA generation (short CTAs)
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
    throw new Error("Failed to generate CTAs");
  }
}

function parseCTAs(content: string, language: Language): GeneratedCTA[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const ctas: GeneratedCTA[] = [];
  const placementOptions: Array<'start' | 'middle' | 'end' | 'embedded'> = ['end', 'middle', 'embedded', 'start', 'end'];

  for (let i = 0; i < lines.length && ctas.length < 5; i++) {
    const line = lines[i];
    
    // Skip meta-commentary
    if (language === 'kurdish') {
      if (line.match(/^CTA|^پێشنیار|^نموونە/i)) continue;
    } else {
      if (line.match(/^CTA|^option|^suggestion|^example/i)) continue;
    }

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

    const content = await callOpenRouter([
      { role: "user", content: prompt }
    ]);

    if (!content) {
      throw new Error("No CTAs generated");
    }

    const ctas = parseCTAs(content, language as Language);

    return NextResponse.json({ ctas });
  } catch (error) {
    console.error("Error generating CTAs:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate CTAs";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
