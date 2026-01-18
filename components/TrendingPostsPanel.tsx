'use client';

import { useState } from 'react';
import { TrendingPost, TrendingPostsSearchParams } from '@/types';
import TrendingPostCard from './TrendingPostCard';

interface TrendingPostsPanelProps {
  onUseAsInspiration?: (post: TrendingPost) => void;
  onSavePost?: (post: TrendingPost) => void;
  savedPostIds?: Set<string>;
}

export default function TrendingPostsPanel({ onUseAsInspiration, onSavePost, savedPostIds }: TrendingPostsPanelProps) {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [cached, setCached] = useState(false);
  const [cacheExpiresAt, setCacheExpiresAt] = useState<string | null>(null);
  const [apiUsageCount, setApiUsageCount] = useState(0);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: TrendingPostsSearchParams = {
        query: query.trim(),
        limit: 10,
        offsite: 0,
      };

      const response = await fetch('/api/trending-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setPosts(data.posts || []);
      setTotalResults(data.totalResults || 0);
      setCached(data.cached || false);
      setCacheExpiresAt(data.cacheExpiresAt || null);

      if (!data.cached) {
        setApiUsageCount(prev => prev + 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search trending posts';
      setError(errorMessage);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  return (
    <div className="glass-card gradient-border p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          Trending Posts Discovery
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Discover popular LinkedIn posts by topic to get inspiration for your content
        </p>
      </div>

      {/* API Usage Counter */}
      <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-400 font-medium">API Usage: {apiUsageCount}/150 requests this month</span>
          {cached && (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cached
            </span>
          )}
        </div>
        {cacheExpiresAt && (
          <p className="text-xs text-amber-400/70 mt-1">
            Cache expires: {new Date(cacheExpiresAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for trending posts (e.g., 'artificial intelligence', 'startup tips')"
            className="input-field flex-1"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="btn-primary px-6"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading && posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-[var(--text-secondary)] font-medium">Searching trending posts...</p>
        </div>
      ) : posts.length === 0 && !error ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-[var(--text-secondary)] font-medium">Search for trending posts above</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Enter keywords to discover popular LinkedIn content</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''}
            </p>
            {cached && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Using cached results
              </span>
            )}
          </div>
          {posts.map((post) => (
            <TrendingPostCard
              key={post.id}
              post={post}
              onUseAsInspiration={onUseAsInspiration}
              onSavePost={onSavePost}
              isSaved={savedPostIds?.has(post.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
