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

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* LinkedIn Header Mock */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            U
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4">
        <div
          className="text-gray-900 whitespace-pre-wrap leading-relaxed"
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {finalContent}
        </div>
      </div>

      {/* LinkedIn Footer Mock */}
      <div className="border-t border-gray-200 p-3 flex items-center justify-between text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">Like</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">Comment</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-xs">Share</span>
          </div>
        </div>
      </div>

      {/* Character Count Badge */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Character Count: {characterCount}</span>
        </div>
        {hashtags.length > 0 && (
          <div className="text-xs text-gray-600">
            {hashtags.length} hashtag{hashtags.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
