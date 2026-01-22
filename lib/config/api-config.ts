/**
 * Centralized API configuration
 * All API URLs, timeouts, and model configurations
 */

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_RESPONSES_API_URL = "https://openrouter.ai/api/v1/responses";

// Try gemini-3-pro-preview first, fallback to gemini-3-flash-preview if needed
export const DEFAULT_MODEL = "google/gemini-3-pro-preview";
export const FALLBACK_MODEL = "google/gemini-3-flash-preview";

// Timeout for OpenRouter API calls (120 seconds - AI generation can take time for long content)
export const OPENROUTER_TIMEOUT = 120000;

// Default temperature for OpenRouter API calls
export const DEFAULT_TEMPERATURE = 0.7;

// Max tokens for different generation types
export const MAX_TOKENS = {
  default: undefined, // No limit
  cta: 500, // Short CTAs
  hook: 500, // Short opening lines
  carousel: 4000, // Carousel generation needs more tokens
  adaptation: 2000, // Content adaptation
} as const;

// Web search configuration
export const WEB_SEARCH_MAX_RESULTS = 3; // Default number of search results to retrieve (1-10)
export const WEB_SEARCH_POLL_INTERVAL = 1000; // Milliseconds between polling attempts (1 second)
export const WEB_SEARCH_MAX_POLL_ATTEMPTS = 10; // Maximum number of polling attempts (max 10 seconds wait)
