/**
 * Prompt caching utility with LRU eviction and TTL
 */

interface CachedPrompt {
  prompt: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface PromptCacheKey {
  context: string;
  language: string;
  tone: string;
  length: string;
  type: 'post' | 'hashtag';
}

class PromptCache {
  private cache: Map<string, CachedPrompt>;
  private maxSize: number;
  private ttl: number; // Time-to-live in milliseconds

  constructor(maxSize: number = 100, ttlMs: number = 60 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMs; // Default: 1 hour
  }

  /**
   * Creates a cache key from prompt parameters
   */
  private createKey(params: PromptCacheKey): string {
    const keyString = JSON.stringify({
      context: params.context.trim(),
      language: params.language,
      tone: params.tone,
      length: params.length,
      type: params.type,
    });
    
    // Simple hash function for consistent keys
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Gets a cached prompt if it exists and is still valid
   */
  get(params: PromptCacheKey): string | null {
    const key = this.createKey(params);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access information
    cached.accessCount++;
    cached.lastAccessed = now;

    return cached.prompt;
  }

  /**
   * Stores a prompt in the cache
   */
  set(params: PromptCacheKey, prompt: string): void {
    const key = this.createKey(params);
    const now = Date.now();

    // If cache is full, evict least recently used entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      prompt,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
    });
  }

  /**
   * Evicts the least recently used entry from the cache
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < lruTime) {
        lruTime = value.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clears expired entries from the cache
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }
}

// Singleton instance for the application
export const promptCache = new PromptCache();
