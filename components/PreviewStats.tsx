'use client';

import { useMemo } from 'react';
import { htmlToPlainText } from '@/lib/linkedin-formatter';

interface PreviewStatsProps {
  content: string;
  selectedHashtags: string[];
}

export default function PreviewStats({ content, selectedHashtags }: PreviewStatsProps) {
  const characterCount = useMemo(() => htmlToPlainText(content).length, [content]);
  
  return (
    <div className="text-sm text-gray-600">
      {characterCount} characters
      {selectedHashtags.length > 0 && ` • ${selectedHashtags.length} hashtag${selectedHashtags.length !== 1 ? 's' : ''}`}
    </div>
  );
}
