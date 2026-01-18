'use client';

import { Language } from '@/types';
import { htmlToPlainText } from '@/lib/linkedin-formatter';

interface LinkedInPreviewProps {
  content: string;
  hashtags: string[];
  language: Language;
  characterCount: number;
}

export default function LinkedInPreview({
  content,
  hashtags,
  language,
  characterCount,
}: LinkedInPreviewProps) {
  const plainText = htmlToPlainText(content);
  const finalContent = plainText + (hashtags.length > 0 ? '\n\n' + hashtags.map((h) => `#${h}`).join(' ') : '');
  const isRTL = language === 'kurdish';

  // Character count color based on LinkedIn recommendations
  const getCharCountColor = () => {
    if (characterCount <= 800) return 'text-emerald-400';
    if (characterCount <= 1300) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* LinkedIn Header Mock */}
      <div className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)] p-4">
        <div className="flex items-center gap-3">
          {/* Profile Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
            U
          </div>
          <div className="flex-1">
            {/* Name placeholder */}
            <div className="h-4 bg-[var(--bg-card-hover)] rounded-full w-32 mb-2"></div>
            {/* Title placeholder */}
            <div className="flex items-center gap-2">
              <div className="h-3 bg-[var(--bg-card)] rounded-full w-24"></div>
              <span className="text-xs text-[var(--text-muted)]">• 1h</span>
              <svg className="w-3 h-3 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
          </div>
          {/* More button */}
          <button className="p-2 rounded-full hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4">
        <div
          className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed text-[15px]"
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {finalContent}
        </div>
      </div>

      {/* Engagement Stats (Mock) */}
      <div className="px-4 py-2 flex items-center gap-2 text-[var(--text-muted)] text-xs">
        <div className="flex -space-x-1">
          <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">👍</span>
          <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px]">❤️</span>
          <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px]">👏</span>
        </div>
        <span>42 • 8 comments</span>
      </div>

      {/* LinkedIn Action Bar */}
      <div className="border-t border-[var(--border-default)] p-2 flex items-center justify-around">
        {[
          { icon: '👍', label: 'Like' },
          { icon: '💬', label: 'Comment' },
          { icon: '🔄', label: 'Repost' },
          { icon: '📤', label: 'Send' },
        ].map((action) => (
          <button
            key={action.label}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] transition-colors text-sm font-medium"
          >
            <span>{action.icon}</span>
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Character Count & Stats */}
      <div className="border-t border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-sm font-medium ${getCharCountColor()}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {characterCount} characters
          </div>
          {hashtags.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full"></span>
              {hashtags.length} hashtag{hashtags.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        {/* Optimal range indicator */}
        <div className="text-xs text-[var(--text-muted)]">
          {characterCount <= 800 ? '✓ Optimal length' : characterCount <= 1300 ? '⚠ Moderate length' : '⚠ Long post'}
        </div>
      </div>
    </div>
  );
}
