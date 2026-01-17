'use client';

import { useState, useEffect } from 'react';
import { SavedTrendingPost, TrendingPost } from '@/types';
import { getAllSavedPosts, deleteSavedPost } from '@/lib/saved-posts';
import TrendingPostCard from './TrendingPostCard';

interface SavedPostsPanelProps {
  onUseAsInspiration?: (post: TrendingPost) => void;
  onPostDeleted?: () => void;
}

export default function SavedPostsPanel({ onUseAsInspiration, onPostDeleted }: SavedPostsPanelProps) {
  const [savedPosts, setSavedPosts] = useState<SavedTrendingPost[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadSavedPosts = async () => {
    setIsLoading(true);
    try {
      const allPosts = await getAllSavedPosts();
      setSavedPosts(allPosts);
    } catch (error) {
      console.error('Failed to load saved posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedPosts();
    }
  }, [isOpen]);

  const handleDelete = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this saved post?')) {
      const success = await deleteSavedPost(postId);
      if (success) {
        loadSavedPosts();
        if (onPostDeleted) {
          onPostDeleted();
        }
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-32 bg-purple-600 text-white px-5 py-3 rounded-xl shadow-2xl hover:bg-purple-700 transition-all duration-200 font-semibold flex items-center gap-2 hover:scale-105 active:scale-95 z-40"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
        </svg>
        Saved Posts
        {savedPosts.length > 0 && (
          <span className="bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">
            {savedPosts.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          Saved Posts
        </h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
        {isLoading ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500 font-medium">Loading saved posts...</p>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            <p className="text-gray-500 font-medium">No saved posts yet</p>
            <p className="text-gray-400 text-sm mt-1">Save trending posts to reference them later</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedPosts.map((savedPost) => (
              <div key={savedPost.id} className="relative">
                <div className="absolute top-2 right-2 z-10">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(savedPost.postId, e)}
                    className="bg-red-500 text-white hover:bg-red-600 rounded-full p-1.5 shadow-lg transition-all duration-200"
                    title="Remove from saved"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {savedPost.notes && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-medium">Note:</p>
                    <p className="text-xs text-yellow-700 mt-1">{savedPost.notes}</p>
                  </div>
                )}
                <TrendingPostCard
                  post={savedPost.post}
                  onUseAsInspiration={onUseAsInspiration}
                  isSaved={true}
                />
                <p className="text-xs text-gray-400 mt-2 ml-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Saved {formatDate(savedPost.savedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}