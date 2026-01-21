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

export interface OpenRouterStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string | null;
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

interface CallOpenRouterStreamOptions extends CallOpenRouterOptions {
  onChunk?: (chunk: string) => void;
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

/**
 * Call OpenRouter API with streaming support
 * Returns a ReadableStream that yields text chunks as they arrive
 */
export async function callOpenRouterStream({
  messages,
  useFallback = false,
  maxTokens,
  temperature = DEFAULT_TEMPERATURE,
}: CallOpenRouterOptions): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const modelToUse = useFallback ? FALLBACK_MODEL : DEFAULT_MODEL;
  logger.log(`[Streaming] Using model: ${modelToUse}`);

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
      stream: true, // Enable streaming
      ...(maxTokens && { max_tokens: maxTokens }),
    }),
  }, OPENROUTER_TIMEOUT * 2); // Longer timeout for streaming

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.statusText}`;
    logger.error("[Streaming] OpenRouter API error response:", {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("No response body received from streaming API");
  }

  return response.body;
}

/**
 * Parse Server-Sent Events (SSE) stream from OpenRouter
 * Yields content chunks as they arrive
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine === '') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          
          // Check for stream end
          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed: OpenRouterStreamChunk = JSON.parse(data);
            
            if (parsed.error) {
              throw new Error(parsed.error.message || 'Stream error');
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }

            // Check if stream is complete
            if (parsed.choices?.[0]?.finish_reason) {
              return;
            }
          } catch (parseError) {
            // Skip malformed JSON chunks (can happen with partial data)
            logger.debug('[Streaming] Skipping malformed chunk:', data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Create a TransformStream that converts SSE data to text chunks
 * For use in API route streaming responses
 * 
 * Note: The streaming route now uses a direct ReadableStream approach instead,
 * but this is kept for potential future use.
 */
export function createSSETransformStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  let streamEnded = false;

  return new TransformStream({
    transform(chunk, controller) {
      if (streamEnded) return;
      
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (streamEnded) break;
        
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine === '') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          
          if (data === '[DONE]') {
            // Send end signal and mark stream as ended
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            streamEnded = true;
            break; // Use break instead of return to allow flush to run
          }

          try {
            const parsed: OpenRouterStreamChunk = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              // Forward the content as SSE
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }

            if (parsed.choices?.[0]?.finish_reason) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              streamEnded = true;
              break;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    },
    flush(controller) {
      if (streamEnded) return;
      
      // Handle any remaining buffer content
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed: OpenRouterStreamChunk = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
      
      // Always send [DONE] at the end if not already sent
      if (!streamEnded) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      }
    }
  });
}
