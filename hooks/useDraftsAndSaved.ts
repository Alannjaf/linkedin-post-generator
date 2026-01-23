'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllDrafts } from '@/lib/storage';
import { Draft } from '@/types';

export interface UseDraftsAndSavedReturn {
  // State
  draftsCount: number;
  isDraftManagerOpen: boolean;
  isSavedContentOpen: boolean;

  // Setters
  setDraftsCount: (count: number) => void;
  setIsDraftManagerOpen: (open: boolean) => void;
  setIsSavedContentOpen: (open: boolean) => void;

  // Actions
  refreshDraftsCount: () => Promise<void>;
  handleLoadDraft: (draft: Draft, onLoadDraft: (draft: Draft) => void) => void;
}

export function useDraftsAndSaved(): UseDraftsAndSavedReturn {
  const [draftsCount, setDraftsCount] = useState(0);
  const [isDraftManagerOpen, setIsDraftManagerOpen] = useState(false);
  const [isSavedContentOpen, setIsSavedContentOpen] = useState(false);

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

  const refreshDraftsCount = useCallback(async () => {
    try {
      const result = await getAllDrafts(1, 1);
      setDraftsCount(result.pagination.total);
    } catch (error) {
      console.error('Failed to refresh drafts count:', error);
    }
  }, []);

  const handleLoadDraft = useCallback((draft: Draft, onLoadDraft: (draft: Draft) => void) => {
    onLoadDraft(draft);
    setIsDraftManagerOpen(false);
  }, []);

  return {
    // State
    draftsCount,
    isDraftManagerOpen,
    isSavedContentOpen,

    // Setters
    setDraftsCount,
    setIsDraftManagerOpen,
    setIsSavedContentOpen,

    // Actions
    refreshDraftsCount,
    handleLoadDraft,
  };
}
