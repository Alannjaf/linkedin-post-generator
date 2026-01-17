'use client';

import { useState, useEffect } from 'react';
import { Draft } from '@/types';
import { getAllDrafts, deleteDraft } from '@/lib/storage';

interface DraftManagerProps {
  onLoadDraft: (draft: Draft) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DraftManager({ onLoadDraft, isOpen: externalIsOpen, onClose }: DraftManagerProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalIsOpen !== undefined ? (onClose || (() => {})) : setInternalIsOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadDrafts = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const result = await getAllDrafts(page, pageSize);
      if (append) {
        setDrafts(prev => [...prev, ...result.drafts]);
      } else {
        setDrafts(result.drafts);
      }
      setCurrentPage(result.pagination.page);
      setHasMore(result.pagination.hasMore);
      setTotal(result.pagination.total);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadDrafts(currentPage + 1, true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrafts(1, false);
    }
  }, [isOpen]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this draft?')) {
      // Optimistic update: remove from UI immediately
      const deletedDraft = drafts.find(d => d.id === id);
      setDrafts(prev => prev.filter(d => d.id !== id));
      setTotal(prev => Math.max(0, prev - 1));

      try {
        const success = await deleteDraft(id);
        if (!success) {
          // Rollback on failure
          if (deletedDraft) {
            setDrafts(prev => {
              const newDrafts = [deletedDraft, ...prev].sort((a, b) => 
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
              return newDrafts;
            });
            setTotal(prev => prev + 1);
          }
          alert('Failed to delete draft. Please try again.');
        }
      } catch (error) {
        // Rollback on error
        if (deletedDraft) {
          setDrafts(prev => {
            const newDrafts = [deletedDraft, ...prev].sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            return newDrafts;
          });
          setTotal(prev => prev + 1);
        }
        alert('Failed to delete draft. Please try again.');
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    // Hide button on mobile - will be shown in FAB menu instead
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Draft History
          </h2>
          {total > 0 && (
            <span className="text-sm text-gray-500 font-medium">
              ({total} {total === 1 ? 'draft' : 'drafts'})
            </span>
          )}
        </div>
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
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500 font-medium">Loading drafts...</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 font-medium">No drafts saved yet</p>
            <p className="text-gray-400 text-sm mt-1">Your saved drafts will appear here</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="border border-gray-200 rounded-xl p-4 hover:bg-white hover:shadow-md cursor-pointer transition-all duration-200 bg-white"
                  onClick={() => {
                    onLoadDraft(draft);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">
                      {draft.title || 'Untitled Draft'}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(draft.id, e)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 text-xs px-2 py-1 rounded-lg transition-all duration-200 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                    {draft.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center flex-wrap gap-2 text-xs mb-2">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium capitalize">{draft.language}</span>
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-medium capitalize">{draft.tone}</span>
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium capitalize">{draft.length}</span>
                    {draft.generatedImage && (
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Has Image
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(draft.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Load More
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

