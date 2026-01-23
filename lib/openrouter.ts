import { PostGenerationParams, GeneratedPost } from '@/types';

// Timeout for AI generation requests (60 seconds)
const REQUEST_TIMEOUT = 60000;

// Longer timeout for streaming requests (120 seconds)
const STREAM_TIMEOUT = 120000;

/**
 * Fetch with timeout support using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
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
      throw new Error('Request timed out. The server took too long to respond. Please try again.');
    }
    throw error;
  }
}

export async function generatePost(
  params: PostGenerationParams
): Promise<GeneratedPost> {
  try {
    const response = await fetchWithTimeout('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API error: ${response.statusText}`
      );
    }

    const data: GeneratedPost = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a network error (not an API error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Connection error. Please check your internet connection and try again.');
      }
      // If error message already contains user-friendly message (like timeout), use it
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        throw error;
      }
      // Otherwise, rethrow the error as-is (API errors)
      throw error;
    }
    throw new Error('Failed to generate post');
  }
}

export interface StreamingCallbacks {
  onChunk: (chunk: string, fullContent: string) => void;
  onComplete: (result: GeneratedPost) => void;
  onError: (error: Error) => void;
  onSearchStatus?: (status: 'searching' | 'completed' | 'failed', sourceCount: number, message: string) => void;
}

/**
 * Generate a post with streaming support
 * Shows text as it's being generated for better UX
 */
export async function generatePostStreaming(
  params: PostGenerationParams,
  callbacks: StreamingCallbacks
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT);

  try {
    const response = await fetch('/api/generate/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API error: ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    let chunkCount = 0;
    let citations: GeneratedPost['citations'] = undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunkCount++;
        const decodedChunk = decoder.decode(value, { stream: true });
        buffer += decodedChunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
            continue;
          }

          const data = trimmedLine.slice(6);

          if (data === '[DONE]') {
            // Stream complete, process the final content
            const result = processCompletedContent(fullContent, params.language, citations);
            callbacks.onComplete(result);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              callbacks.onChunk(parsed.content, fullContent);
            }
            if (parsed.status && callbacks.onSearchStatus) {
              callbacks.onSearchStatus(parsed.status, parsed.sourceCount || 0, parsed.message || '');
            }
            if (parsed.citations) {
              citations = parsed.citations;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (parseErr) {
            // Skip malformed JSON
          }
        }
      }

      // If we reach here without [DONE], still process what we have
      if (fullContent) {
        const result = processCompletedContent(fullContent, params.language, citations);
        callbacks.onComplete(result);
      } else {
        throw new Error('No content received from stream');
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        callbacks.onError(new Error('Request timed out. The server took too long to respond. Please try again.'));
        return;
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        callbacks.onError(new Error('Connection error. Please check your internet connection and try again.'));
        return;
      }
      callbacks.onError(error);
      return;
    }

    callbacks.onError(new Error('Failed to generate post'));
  }
}

/**
 * Process completed streaming content to extract hashtags and clean up
 */
function processCompletedContent(content: string, language: string, citations?: GeneratedPost['citations']): GeneratedPost {
  // Clean up content: remove meta-commentary and asterisks
  let cleanedContent = cleanStreamContent(content, language);

  // Extract hashtags from the cleaned content
  const hashtagRegex = /#([\w\u0600-\u06FF]+)/g;
  const hashtagMatches = Array.from(cleanedContent.matchAll(hashtagRegex));
  const foundHashtags = hashtagMatches
    .map((match) => match[1])
    .filter((tag) => tag.length > 0)
    .slice(0, 5);

  // Remove hashtags from content
  const finalContent = cleanedContent.replace(hashtagRegex, '').trim();

  return {
    content: finalContent,
    hashtags: foundHashtags,
    citations,
  };
}

/**
 * Clean streaming content - simplified version of content-cleaner for client-side use
 */
function cleanStreamContent(content: string, language: string): string {
  let cleaned = content;

  // Remove common AI meta-commentary patterns
  const metaPatterns = [
    /^(Here'?s?|This is|I'?ve created|I created|Below is|Here you go|As requested|Sure!?|Certainly!?|Of course!?)[^\n]*\n+/gi,
    /^(LinkedIn Post|Post|Draft|Content)[:\s]*\n+/gi,
    /\n+(Let me know|Feel free|I hope|Would you like|Is there anything)[^\n]*/gi,
    /\n+---+\n+.*$/gs,
  ];

  for (const pattern of metaPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove asterisks used for emphasis (convert to plain text)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

  // Remove leading/trailing whitespace and normalize line breaks
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

/**
 * Create an AbortController for cancelling streaming requests
 */
export function createStreamAbortController(): AbortController {
  return new AbortController();
}

/**
 * Generate post with streaming and abort support
 */
export async function generatePostStreamingWithAbort(
  params: PostGenerationParams,
  callbacks: StreamingCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const timeoutId = setTimeout(() => {
    // Timeout will be handled by abort
  }, STREAM_TIMEOUT);

  try {
    const response = await fetch('/api/generate/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: abortSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API error: ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        // Check if aborted
        if (abortSignal?.aborted) {
          throw new Error('Generation cancelled');
        }

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
            const result = processCompletedContent(fullContent, params.language, undefined);
            callbacks.onComplete(result);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              callbacks.onChunk(parsed.content, fullContent);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      if (fullContent) {
        const result = processCompletedContent(fullContent, params.language, undefined);
        callbacks.onComplete(result);
      } else {
        throw new Error('No content received from stream');
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message === 'Generation cancelled') {
        callbacks.onError(new Error('Generation cancelled'));
        return;
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        callbacks.onError(new Error('Connection error. Please check your internet connection and try again.'));
        return;
      }
      callbacks.onError(error);
      return;
    }

    callbacks.onError(new Error('Failed to generate post'));
  }
}

