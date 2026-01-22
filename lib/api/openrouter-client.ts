import { 
  OPENROUTER_API_URL,
  OPENROUTER_RESPONSES_API_URL,
  DEFAULT_MODEL, 
  FALLBACK_MODEL, 
  OPENROUTER_TIMEOUT,
  DEFAULT_TEMPERATURE,
  MAX_TOKENS,
  WEB_SEARCH_MAX_RESULTS
} from '@/lib/config/api-config';
import { logger } from '@/lib/utils/logger';
import { WebSearchCitation } from '@/types';

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

// Responses API types for web search
export interface ResponseInputText {
  type: 'input_text';
  text: string;
}

export interface ResponseMessage {
  type: 'message';
  role: 'user' | 'assistant' | 'system';
  content: Array<ResponseInputText>;
}

export interface UrlCitation {
  type: 'url_citation';
  url: string;
  start_index: number;
  end_index: number;
}

export interface OutputText {
  type: 'output_text';
  text: string;
  annotations?: UrlCitation[];
}

export interface ResponseOutputMessage {
  type: 'message';
  id?: string;
  status?: string;
  role: 'assistant';
  content: OutputText[];
}

export interface ReasoningText {
  type: 'reasoning_text';
  text: string;
}

export interface ReasoningOutput {
  type: 'reasoning';
  id?: string;
  summary?: any[];
  content: ReasoningText[];
  format?: string;
}

// Union type for different output types
export type ResponseOutput = ResponseOutputMessage | ReasoningOutput | { type: string; [key: string]: any };

export interface OpenRouterWebSearchResponse {
  id: string;
  object: 'response';
  created_at: number;
  model: string;
  output_text?: string; // Root-level output text
  output: ResponseOutput[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  status: 'completed' | 'in_progress';
  error?: {
    message: string;
  };
  completed_at?: number;
  incomplete_details?: any;
  tools?: any[];
  tool_choice?: any;
  parallel_tool_calls?: boolean;
  max_output_tokens?: number;
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_logprobs?: number;
  max_tool_calls?: number | null;
  metadata?: any;
  background?: boolean;
  previous_response_id?: string | null;
  service_tier?: string;
  truncation?: string;
  store?: boolean;
  instructions?: string | null;
  text?: any;
  reasoning?: any;
  safety_identifier?: any;
  prompt_cache_key?: string | null;
  user?: any;
}

export interface WebSearchResult {
  content: string;
  citations: WebSearchCitation[];
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

/**
 * Call OpenRouter Responses API with web search enabled using streaming
 * Uses streaming to receive response.output_item.added events when message output appears
 */
async function callOpenRouterWithWebSearchStream({
  context,
  useFallback = false,
  maxTokens,
  temperature = DEFAULT_TEMPERATURE,
  maxResults = WEB_SEARCH_MAX_RESULTS,
}: {
  context: string;
  useFallback?: boolean;
  maxTokens?: number;
  temperature?: number;
  maxResults?: number;
}): Promise<WebSearchResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured");
  }

  const modelToUse = useFallback ? FALLBACK_MODEL : DEFAULT_MODEL;
  logger.log(`[Web Search Stream] Using model: ${modelToUse}`);

  try {
    const response = await fetchWithTimeout(OPENROUTER_RESPONSES_API_URL, {
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
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: context,
              },
            ],
          },
        ],
        plugins: [{ id: 'web', max_results: maxResults }],
        stream: true,
        temperature,
        max_output_tokens: maxTokens || 9000,
      }),
    }, OPENROUTER_TIMEOUT * 2); // Longer timeout for streaming

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.statusText}`;
      logger.error("[Web Search Stream] OpenRouter API error response:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error("No response body received from streaming API");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let citations: WebSearchCitation[] = [];
    let messageFound = false;
    const receivedEvents: string[] = [];
    let completedEventLogged = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
            continue;
          }

          const data = trimmedLine.slice(6);
          
          if (data === '[DONE]') {
            logger.log("[Web Search Stream] Stream completed");
            break;
          }

          try {
            const parsed = JSON.parse(data);
            
            // Log all event types for debugging
            if (parsed.type) {
              receivedEvents.push(parsed.type);
              logger.debug(`[Web Search Stream] Received event: ${parsed.type}`);
            }
            
            // Handle response.output_item.added event
            if (parsed.type === 'response.output_item.added') {
              logger.log(`[Web Search Stream] Output item added: ${parsed.item?.type || 'unknown'}`);
              
              if (parsed.item?.type === 'message') {
                messageFound = true;
                logger.log("[Web Search Stream] Message output item added");
                
                const messageItem = parsed.item;
                const textContent = messageItem.content?.find((c: any) => c.type === 'output_text');
                
                if (textContent?.text) {
                  content = textContent.text.trim();
                  logger.log(`[Web Search Stream] Extracted message content (${content.length} chars)`);
                  
                  // Extract citations from annotations
                  if (textContent.annotations) {
                    for (const annotation of textContent.annotations) {
                      if (annotation.type === 'url_citation') {
                        const citedText = content.slice(annotation.start_index, annotation.end_index);
                        citations.push({
                          url: annotation.url,
                          text: citedText,
                          startIndex: annotation.start_index,
                          endIndex: annotation.end_index,
                        });
                      }
                    }
                    logger.log(`[Web Search Stream] Extracted ${citations.length} citations from added event`);
                  }
                } else {
                  logger.debug("[Web Search Stream] Message item added but no text content found", JSON.stringify(messageItem, null, 2));
                }
              } else if (parsed.item?.type === 'reasoning') {
                logger.debug("[Web Search Stream] Reasoning item added (will wait for message)");
              }
            }
            
            // Handle response.output_item.delta event - incremental content updates
            if (parsed.type === 'response.output_item.delta') {
              logger.debug("[Web Search Stream] Output item delta received");
              
              if (parsed.delta) {
                // Check for text deltas in content
                if (parsed.delta.content) {
                  for (const deltaContent of parsed.delta.content) {
                    if (deltaContent.type === 'output_text' && deltaContent.text) {
                      content += deltaContent.text;
                      logger.debug(`[Web Search Stream] Accumulated delta content (total: ${content.length} chars)`);
                    }
                  }
                }
              }
            }
            
            // Handle response.output_item.done event
            if (parsed.type === 'response.output_item.done') {
              logger.debug(`[Web Search Stream] Output item done: ${parsed.item?.type || 'unknown'}`);
              
              if (parsed.item?.type === 'message') {
                const messageItem = parsed.item;
                const textContent = messageItem.content?.find((c: any) => c.type === 'output_text');
                
                if (textContent?.text && !content) {
                  content = textContent.text.trim();
                  logger.log(`[Web Search Stream] Extracted content from done event (${content.length} chars)`);
                }
                
                // Extract citations from done event
                if (textContent?.annotations) {
                  citations = [];
                  for (const annotation of textContent.annotations) {
                    if (annotation.type === 'url_citation') {
                      const citedText = content.slice(annotation.start_index, annotation.end_index);
                      citations.push({
                        url: annotation.url,
                        text: citedText,
                        startIndex: annotation.start_index,
                        endIndex: annotation.end_index,
                      });
                    }
                  }
                  logger.log(`[Web Search Stream] Extracted ${citations.length} citations from done event`);
                }
              }
            }
            
            // Handle response.completed event - extract final citations
            if (parsed.type === 'response.completed' && parsed.response) {
              logger.log("[Web Search Stream] Response completed event received");
              
              // Log full structure first time for debugging
              if (!completedEventLogged) {
                logger.debug("[Web Search Stream] Completed event structure:", JSON.stringify(parsed.response, null, 2));
                completedEventLogged = true;
              }
              
              const completedResponse = parsed.response;
              
              // Check for root-level output_text
              if (completedResponse.output_text && completedResponse.output_text.trim()) {
                content = completedResponse.output_text.trim();
                logger.log(`[Web Search Stream] Using root-level output_text (${content.length} chars)`);
              }
              
              // Check output array for message
              const messageOutput = completedResponse.output?.find((o: any) => o.type === 'message');
              
              if (messageOutput) {
                logger.debug("[Web Search Stream] Found message output in completed event");
                const textContent = messageOutput.content?.find((c: any) => c.type === 'output_text');
                
                if (textContent?.text) {
                  if (!content) {
                    content = textContent.text.trim();
                    logger.log(`[Web Search Stream] Extracted content from completed event (${content.length} chars)`);
                  } else {
                    logger.debug("[Web Search Stream] Content already exists, keeping existing");
                  }
                  
                  // Extract all citations from completed response (overwrite if we have better data)
                  if (textContent.annotations && textContent.annotations.length > 0) {
                    citations = [];
                    for (const annotation of textContent.annotations) {
                      if (annotation.type === 'url_citation') {
                        const citedText = content.slice(annotation.start_index, annotation.end_index);
                        citations.push({
                          url: annotation.url,
                          text: citedText,
                          startIndex: annotation.start_index,
                          endIndex: annotation.end_index,
                        });
                      }
                    }
                    logger.log(`[Web Search Stream] Extracted ${citations.length} citations from completed event`);
                  }
                } else {
                  logger.debug("[Web Search Stream] Message output found but no text content", JSON.stringify(messageOutput, null, 2));
                }
              } else {
                logger.debug("[Web Search Stream] No message output in completed event. Output types:", 
                  completedResponse.output?.map((o: any) => o.type).join(', ') || 'none');
              }
            }
            
            // Handle errors
            if (parsed.type === 'error' || parsed.error) {
              const errorMessage = parsed.error?.message || parsed.message || 'Stream error';
              logger.error("[Web Search Stream] Stream error:", errorMessage);
              throw new Error(errorMessage);
            }
          } catch (parseError) {
            // Skip malformed JSON chunks
            if (data && data.length > 0 && data !== '[DONE]') {
              logger.debug("[Web Search Stream] Failed to parse chunk:", data.substring(0, 100));
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!content) {
      logger.error("[Web Search Stream] No content extracted from stream");
      logger.error("[Web Search Stream] Events received:", receivedEvents.join(', '));
      logger.error("[Web Search Stream] Message found:", messageFound);
      throw new Error(`No text content found in streaming response. Events received: ${receivedEvents.join(', ') || 'none'}`);
    }

    logger.log(`[Web Search Stream] Extracted content (${content.length} chars) and ${citations.length} citations`);

    return {
      content,
      citations,
    };
  } catch (error) {
    logger.error("[Web Search Stream] callOpenRouterWithWebSearchStream error:", error);
    if (error instanceof Error) {
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        throw error;
      }
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new Error('Connection error. Unable to reach the AI service. Please check your connection and try again.');
      }
      throw error;
    }
    throw new Error("Failed to call OpenRouter API with web search streaming");
  }
}


/**
 * Call OpenRouter Responses API with web search enabled
 * Uses the Responses API Beta endpoint with web search plugin
 * Uses streaming to receive complete responses with message output
 */
export async function callOpenRouterWithWebSearch({
  context,
  useFallback = false,
  maxTokens,
  temperature = DEFAULT_TEMPERATURE,
  maxResults = WEB_SEARCH_MAX_RESULTS,
}: {
  context: string;
  useFallback?: boolean;
  maxTokens?: number;
  temperature?: number;
  maxResults?: number;
}): Promise<WebSearchResult> {
  // Try streaming first (recommended approach)
  try {
    logger.log("[Web Search] Attempting streaming web search...");
    return await callOpenRouterWithWebSearchStream({
      context,
      useFallback,
      maxTokens,
      temperature,
      maxResults,
    });
  } catch (streamError) {
    logger.warn("[Web Search] Streaming failed, falling back to non-streaming:", streamError);
    
    // Fallback to non-streaming request
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured");
    }

    const modelToUse = useFallback ? FALLBACK_MODEL : DEFAULT_MODEL;
    logger.log(`[Web Search] Using non-streaming fallback with model: ${modelToUse}`);

    try {
      const response = await fetchWithTimeout(OPENROUTER_RESPONSES_API_URL, {
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
          input: [
            {
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: context,
                },
              ],
            },
          ],
          plugins: [{ id: 'web', max_results: maxResults }],
          temperature,
          max_output_tokens: maxTokens || 9000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.statusText}`;
        logger.error("[Web Search] OpenRouter API error response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(errorMessage);
      }

      const data: OpenRouterWebSearchResponse = await response.json();

      logger.debug("[Web Search] OpenRouter API response structure:", JSON.stringify(data, null, 2));

      if (data.error) {
        logger.error("[Web Search] OpenRouter API error:", data.error);
        throw new Error(data.error.message || "API returned an error");
      }

      let content = '';
      let citations: WebSearchCitation[] = [];

    // Priority 1: Check for root-level output_text
    if (data.output_text && data.output_text.trim()) {
      content = data.output_text.trim();
      logger.log("[Web Search] Using root-level output_text");
    } else if (data.output && data.output.length > 0) {
      // Priority 2: Look for message type output
      const messageOutput = data.output.find((o): o is ResponseOutputMessage => o.type === 'message');
      if (messageOutput) {
        const textContent = messageOutput.content?.find((c) => c.type === 'output_text');
        if (textContent && textContent.text) {
          content = textContent.text.trim();
          logger.log("[Web Search] Using message output_text");
          
          // Extract citations from message annotations
          if (textContent.annotations) {
            for (const annotation of textContent.annotations) {
              if (annotation.type === 'url_citation') {
                const citedText = content.slice(annotation.start_index, annotation.end_index);
                citations.push({
                  url: annotation.url,
                  text: citedText,
                  startIndex: annotation.start_index,
                  endIndex: annotation.end_index,
                });
              }
            }
          }
        }
      }
      
      // Priority 3: Look for reasoning type output if no message found
      if (!content) {
        const reasoningOutput = data.output.find((o): o is ReasoningOutput => o.type === 'reasoning');
        if (reasoningOutput && reasoningOutput.content) {
          // Extract text from all reasoning_text items
          const reasoningTexts = reasoningOutput.content
            .filter((c): c is ReasoningText => c.type === 'reasoning_text')
            .map(c => c.text)
            .join('\n');
          
          if (reasoningTexts.trim()) {
            content = reasoningTexts.trim();
            logger.log("[Web Search] Using reasoning output");
          }
        }
      }
      
      // Priority 4: Try to extract text from any output type
      if (!content) {
        for (const outputItem of data.output) {
          if (outputItem.type === 'message' && 'content' in outputItem) {
            const msgContent = (outputItem as any).content;
            if (Array.isArray(msgContent)) {
              for (const item of msgContent) {
                if (item.text && typeof item.text === 'string') {
                  content = item.text.trim();
                  if (content) {
                    logger.log("[Web Search] Extracted text from message content");
                    break;
                  }
                }
              }
            }
          }
          if (content) break;
        }
      }
    }

      if (!content) {
        logger.error("[Web Search] No text content found in response. Full response:", JSON.stringify(data, null, 2));
        throw new Error("No text content found in API response. The response format may be unexpected.");
      }

      logger.log(`[Web Search] Extracted content (${content.length} chars) and ${citations.length} citations`);

      return {
        content,
        citations,
      };
    } catch (fallbackError) {
      // If fallback also fails, throw the original streaming error
      logger.error("[Web Search] Non-streaming fallback also failed:", fallbackError);
      throw streamError;
    }
  }
}
