'use client';

import { useState } from 'react';

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

  const menuItems = [
    {
      id: 'drafts',
      label: 'Drafts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: onDraftsClick,
      count: draftsCount,
      gradient: 'from-purple-500 to-violet-500',
      shadowColor: 'shadow-purple-500/25',
    },
    {
      id: 'saved',
      label: 'Saved Posts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      onClick: onSavedPostsClick,
      count: savedPostsCount,
      gradient: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/25',
    },
    ...(canCopy && onCopyClick
      ? [
        {
          id: 'copy',
          label: 'Copy',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          ),
          onClick: onCopyClick,
          count: 0,
          gradient: 'from-emerald-500 to-teal-500',
          shadowColor: 'shadow-emerald-500/25',
        },
      ]
      : []),
    ...(canExport && onExportClick
      ? [
        {
          id: 'export',
          label: 'Export',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
          onClick: onExportClick,
          count: 0,
          gradient: 'from-orange-500 to-amber-500',
          shadowColor: 'shadow-orange-500/25',
        },
      ]
      : []),
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Menu Items */}
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              item.onClick();
              setIsOpen(false);
            }}
            className={`
              flex items-center gap-3 pr-4 pl-3 py-2.5 rounded-full
              bg-gradient-to-r ${item.gradient} text-white font-medium
              shadow-lg ${item.shadowColor}
              transition-all duration-300 ease-out
              hover:scale-105 hover:shadow-xl
              ${isOpen
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4 pointer-events-none'
              }
            `}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
            }}
          >
            {item.icon}
            <span className="text-sm whitespace-nowrap">{item.label}</span>
            {item.count > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                {item.count}
              </span>
            )}
          </button>
        ))}

        {/* Main FAB Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-xl flex items-center justify-center
            bg-gradient-to-br from-purple-500 to-blue-500 text-white
            shadow-lg shadow-purple-500/30
            transition-all duration-300 ease-out
            hover:shadow-xl hover:scale-105
            ${isOpen ? 'rotate-45' : 'rotate-0'}
          `}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Notification Badge */}
        {!isOpen && (draftsCount > 0 || savedPostsCount > 0) && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
            {draftsCount + savedPostsCount > 9 ? '9+' : draftsCount + savedPostsCount}
          </div>
        )}
      </div>
    </>
  );
}
