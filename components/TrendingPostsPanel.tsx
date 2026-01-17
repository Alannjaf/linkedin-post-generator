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
  const [apiUsageCount, setApiUsageCount] = useState(0); // This would be tracked server-side in production

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
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Trending Posts Discovery
        </h2>
        <p className="text-sm text-gray-600">
          Discover popular LinkedIn posts by topic to get inspiration for your content
        </p>
      </div>

      {/* API Usage Counter */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-yellow-800 font-medium">API Usage: {apiUsageCount}/150 requests this month</span>
          {cached && (
            <span className="text-green-700 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cached
            </span>
          )}
        </div>
        {cacheExpiresAt && (
          <p className="text-xs text-yellow-700 mt-1">
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
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white input-focus transition-all duration-200"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading && posts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500 font-medium">Searching trending posts...</p>
        </div>
      ) : posts.length === 0 && !error ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 font-medium">Search for trending posts above</p>
          <p className="text-gray-400 text-sm mt-1">Enter keywords to discover popular LinkedIn content</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''}
            </p>
            {cached && (
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md">
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
