import { PostGenerationParams, GeneratedPost } from '@/types';

// Timeout for AI generation requests (60 seconds)
const REQUEST_TIMEOUT = 60000;

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

