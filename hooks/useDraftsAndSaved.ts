'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllDrafts } from '@/lib/storage';
import { getAllSavedPosts } from '@/lib/saved-posts';
import { Draft } from '@/types';

export interface UseDraftsAndSavedReturn {
  // State
  savedPostIds: Set<string>;
  draftsCount: number;
  savedPostsCount: number;
  isDraftManagerOpen: boolean;
  isSavedPostsOpen: boolean;
  
  // Setters
  setSavedPostIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setDraftsCount: (count: number) => void;
  setSavedPostsCount: (count: number) => void;
  setIsDraftManagerOpen: (open: boolean) => void;
  setIsSavedPostsOpen: (open: boolean) => void;
  
  // Actions
  refreshSavedPostIds: () => Promise<void>;
  refreshDraftsCount: () => Promise<void>;
  refreshSavedPostsCount: () => Promise<void>;
  handleLoadDraft: (draft: Draft, onLoadDraft: (draft: Draft) => void) => void;
  handleSavePost: (post: any, onSaveSuccess: () => void, onSaveError: (err: Error) => void) => Promise<void>;
  handleDeleteSavedPost: (postId: string) => Promise<void>;
}

export function useDraftsAndSaved(): UseDraftsAndSavedReturn {
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [draftsCount, setDraftsCount] = useState(0);
  const [savedPostsCount, setSavedPostsCount] = useState(0);
  const [isDraftManagerOpen, setIsDraftManagerOpen] = useState(false);
  const [isSavedPostsOpen, setIsSavedPostsOpen] = useState(false);

  // Load saved post IDs and counts on mount
  useEffect(() => {
    const loadSavedPostIds = async () => {
      try {
        const savedPosts = await getAllSavedPosts();
        const ids = new Set(savedPosts.map(sp => sp.postId));
        setSavedPostIds(ids);
        setSavedPostsCount(savedPosts.length);
      } catch (error) {
        console.error('Failed to load saved post IDs:', error);
      }
    };
    loadSavedPostIds();
  }, []);

  // Load drafts count
  useEffect(() => {
    const loadDraftsCount = async () => {
      try {
        const result = await getAllDrafts(1, 1);
        setDraftsCount(result.pagination.total);
      } catch (error) {
        console.error('Failed to load drafts count:', error);
      }
    };
    loadDraftsCount();
  }, []);

  const refreshSavedPostIds = useCallback(async () => {
    try {
      const savedPosts = await getAllSavedPosts();
      const ids = new Set(savedPosts.map(sp => sp.postId));
      setSavedPostIds(ids);
      setSavedPostsCount(savedPosts.length);
    } catch (error) {
      console.error('Failed to refresh saved post IDs:', error);
    }
  }, []);

  const refreshDraftsCount = useCallback(async () => {
    try {
      const result = await getAllDrafts(1, 1);
      setDraftsCount(result.pagination.total);
    } catch (error) {
      console.error('Failed to refresh drafts count:', error);
    }
  }, []);

  const refreshSavedPostsCount = useCallback(async () => {
    try {
      const savedPosts = await getAllSavedPosts();
      setSavedPostsCount(savedPosts.length);
    } catch (error) {
      console.error('Failed to refresh saved posts count:', error);
    }
  }, []);

  const handleLoadDraft = useCallback((draft: Draft, onLoadDraft: (draft: Draft) => void) => {
    onLoadDraft(draft);
    setIsDraftManagerOpen(false);
  }, []);

  const handleSavePost = useCallback(async (
    post: any,
    onSaveSuccess: () => void,
    onSaveError: (err: Error) => void
  ) => {
    // Optimistic update: add to saved posts immediately
    const wasAlreadySaved = savedPostIds.has(post.id);
    
    if (!wasAlreadySaved) {
      setSavedPostIds(prev => new Set([...prev, post.id]));
    }

    try {
      const { savePost } = await import('@/lib/saved-posts');
      await savePost(post);
      if (!wasAlreadySaved) {
        await refreshSavedPostsCount();
        onSaveSuccess();
      }
    } catch (err) {
      // Rollback on failure
      if (!wasAlreadySaved) {
        setSavedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(post.id);
          return newSet;
        });
      }
      onSaveError(err instanceof Error ? err : new Error('Failed to save post'));
    }
  }, [savedPostIds, refreshSavedPostsCount]);

  const handleDeleteSavedPost = useCallback(async (postId: string) => {
    try {
      const { deleteSavedPost } = await import('@/lib/saved-posts');
      const success = await deleteSavedPost(postId);
      if (success) {
        setSavedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        await refreshSavedPostsCount();
      }
    } catch (err) {
      console.error('Failed to delete saved post:', err);
    }
  }, [refreshSavedPostsCount]);

  return {
    // State
    savedPostIds,
    draftsCount,
    savedPostsCount,
    isDraftManagerOpen,
    isSavedPostsOpen,
    
    // Setters
    setSavedPostIds,
    setDraftsCount,
    setSavedPostsCount,
    setIsDraftManagerOpen,
    setIsSavedPostsOpen,
    
    // Actions
    refreshSavedPostIds,
    refreshDraftsCount,
    refreshSavedPostsCount,
    handleLoadDraft,
    handleSavePost,
    handleDeleteSavedPost,
  };
}
