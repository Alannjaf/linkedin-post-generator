import { 
  OPENROUTER_API_URL, 
  DEFAULT_MODEL, 
  FALLBACK_MODEL, 
  OPENROUTER_TIMEOUT,
  DEFAULT_TEMPERATURE,
  MAX_TOKENS
} from '@/lib/config/api-config';
import { logger } from '@/lib/utils/logger';

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

interface CallOpenRouterOptions {
  messages: OpenRouterMessage[];
  useFallback?: boolean;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Fetch with timeout support using AbortController (server-side)
 */
export async function fetchWithTimeout(
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

/**
 * Call OpenRouter API with standardized error handling and fallback support
 */
export async function callOpenRouter({
  messages,
  useFallback = false,
  maxTokens,
  temperature = DEFAULT_TEMPERATURE,
}: CallOpenRouterOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const modelToUse = useFallback ? FALLBACK_MODEL : DEFAULT_MODEL;
  logger.log(`Using model: ${modelToUse}`);

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
        temperature,
        ...(maxTokens && { max_tokens: maxTokens }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.statusText}`;
      logger.error("OpenRouter API error response:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(errorMessage);
    }

    const data: OpenRouterResponse = await response.json();

    // Log response structure only in development
    logger.debug("OpenRouter API response structure:", JSON.stringify(data, null, 2));
    logger.debug("Response details:", {
      hasError: !!data.error,
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoice: data.choices?.[0],
      firstChoiceKeys: data.choices?.[0] ? Object.keys(data.choices[0]) : [],
    });

    if (data.error) {
      logger.error("OpenRouter API error:", data.error);
      throw new Error(data.error.message || "API returned an error");
    }

    if (!data.choices || data.choices.length === 0) {
      logger.error("No choices in OpenRouter response. Full response:", JSON.stringify(data, null, 2));
      
      // Try fallback model if we haven't already
      if (!useFallback) {
        logger.log(`Retrying with fallback model: ${FALLBACK_MODEL}`);
        return callOpenRouter({ messages, useFallback: true, maxTokens, temperature });
      }
      
      throw new Error("No response choices from API. The model might not be available or the response format is unexpected.");
    }

    // Handle different possible response structures
    const firstChoice = data.choices[0];
    logger.debug("First choice structure:", JSON.stringify(firstChoice, null, 2));
    
    // Try multiple possible content locations
    const content = firstChoice?.message?.content || 
                   (firstChoice as any)?.message?.text ||
                   (firstChoice as any)?.text || 
                   (firstChoice as any)?.content ||
                   (firstChoice as any)?.delta?.content ||
                   "";

    const trimmedContent = typeof content === 'string' ? content.trim() : "";
    
    if (!trimmedContent) {
      logger.error("Empty content in response. Full response:", JSON.stringify(data, null, 2));
      logger.error("First choice keys:", firstChoice ? Object.keys(firstChoice) : "no first choice");
      logger.error("First choice message keys:", firstChoice?.message ? Object.keys(firstChoice.message) : "no message");
      
      // Try fallback model if we haven't already
      if (!useFallback) {
        logger.log(`Retrying with fallback model: ${FALLBACK_MODEL}`);
        return callOpenRouter({ messages, useFallback: true, maxTokens, temperature });
      }
      
      throw new Error(`API returned empty content. Model "${modelToUse}" might not be available or the response format is unexpected. Please check the model name.`);
    }

    return trimmedContent;
  } catch (error) {
    logger.error("callOpenRouter error:", error);
    if (error instanceof Error) {
      // Log the actual error message for debugging
      logger.error("OpenRouter API error details:", error.message);
      
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
    throw new Error("Failed to call OpenRouter API");
  }
}

/**
 * Helper function to call OpenRouter with a simple message
 * Maintains backward compatibility with existing code
 */
export async function callOpenRouterSimple(
  messages: OpenRouterMessage[],
  useFallback: boolean = false
): Promise<string> {
  return callOpenRouter({ messages, useFallback });
}

/**
 * Helper for CTA generation with token limit
 */
export async function callOpenRouterForCTA(messages: OpenRouterMessage[]): Promise<string> {
  return callOpenRouter({ 
    messages, 
    maxTokens: MAX_TOKENS.cta 
  });
}

/**
 * Helper for hook generation with token limit
 */
export async function callOpenRouterForHook(messages: OpenRouterMessage[]): Promise<string> {
  return callOpenRouter({ 
    messages, 
    maxTokens: MAX_TOKENS.hook 
  });
}

/**
 * Helper for carousel generation with token limit
 */
export async function callOpenRouterForCarousel(messages: OpenRouterMessage[]): Promise<string> {
  return callOpenRouter({ 
    messages, 
    maxTokens: MAX_TOKENS.carousel 
  });
}

/**
 * Helper for content adaptation with token limit
 */
export async function callOpenRouterForAdaptation(messages: OpenRouterMessage[]): Promise<string> {
  return callOpenRouter({ 
    messages, 
    maxTokens: MAX_TOKENS.adaptation 
  });
}
