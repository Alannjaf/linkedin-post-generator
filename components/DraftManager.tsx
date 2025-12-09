'use client';

import { useState, useEffect } from 'react';
import { Draft } from '@/types';
import { getAllDrafts, deleteDraft } from '@/lib/storage';

interface DraftManagerProps {
  onLoadDraft: (draft: Draft) => void;
}

export default function DraftManager({ onLoadDraft }: DraftManagerProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadDrafts = () => {
    const allDrafts = getAllDrafts();
    setDrafts(allDrafts);
  };

  useEffect(() => {
    loadDrafts();
    // Reload drafts when storage changes (from other tabs/windows)
    const handleStorageChange = () => {
      loadDrafts();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this draft?')) {
      deleteDraft(id);
      loadDrafts();
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
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
      >
        Drafts ({drafts.length})
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Draft History</h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {drafts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No drafts saved yet</p>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  onLoadDraft(draft);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-800 text-sm truncate flex-1">
                    {draft.title || 'Untitled Draft'}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(draft.id, e)}
                    className="text-red-500 hover:text-red-700 ml-2 text-xs"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {draft.content.substring(0, 100)}...
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="capitalize">{draft.language}</span>
                  <span>•</span>
                  <span className="capitalize">{draft.tone}</span>
                  <span>•</span>
                  <span className="capitalize">{draft.length}</span>
                  {draft.generatedImage && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">Has Image</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(draft.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

