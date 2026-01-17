'use client';

import { useState, useEffect, useRef } from 'react';

interface FloatingActionMenuProps {
  onDraftsClick: () => void;
  onSavedPostsClick: () => void;
  onCopyClick?: () => void;
  onExportClick?: () => void;
  draftsCount?: number;
  savedPostsCount?: number;
  canCopy?: boolean;
  canExport?: boolean;
}

export default function FloatingActionMenu({
  onDraftsClick,
  onSavedPostsClick,
  onCopyClick,
  onExportClick,
  draftsCount = 0,
  savedPostsCount = 0,
  canCopy = false,
  canExport = false,
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={menuRef}>
      {/* Menu Items */}
      <div
        className={`
          absolute bottom-20 right-0 mb-2 flex flex-col gap-2
          transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
      >
        {canCopy && onCopyClick && (
          <button
            type="button"
            onClick={() => {
              onCopyClick();
              setIsOpen(false);
            }}
            className="bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-3 font-semibold hover:scale-105 active:scale-95 min-w-[160px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy to Clipboard
          </button>
        )}

        {canExport && onExportClick && (
          <button
            type="button"
            onClick={() => {
              onExportClick();
              setIsOpen(false);
            }}
            className="bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-3 font-semibold hover:scale-105 active:scale-95 min-w-[160px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export as Text
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onDraftsClick();
            setIsOpen(false);
          }}
          className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-gray-800 transition-all duration-200 flex items-center gap-3 font-semibold hover:scale-105 active:scale-95 min-w-[160px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Drafts
          {draftsCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-auto">
              {draftsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onSavedPostsClick();
            setIsOpen(false);
          }}
          className="bg-purple-600 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-purple-700 transition-all duration-200 flex items-center gap-3 font-semibold hover:scale-105 active:scale-95 min-w-[160px]"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          Saved Posts
          {savedPostsCount > 0 && (
            <span className="bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold ml-auto">
              {savedPostsCount}
            </span>
          )}
        </button>
      </div>

      {/* Main FAB Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full shadow-2xl
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen ? 'bg-red-600 rotate-45' : 'bg-blue-600 hover:bg-blue-700'}
          hover:scale-110 active:scale-95
          z-50
        `}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </button>
    </div>
  );
}
