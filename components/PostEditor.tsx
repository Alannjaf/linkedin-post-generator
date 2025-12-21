'use client';

import { useState, useEffect } from 'react';
import CharacterCounter from './CharacterCounter';
import { Language } from '@/types';

interface PostEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  language?: Language;
}

export default function PostEditor({ content, onChange, placeholder = 'Generated post will appear here...', language = 'english' }: PostEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const isRTL = language === 'kurdish';

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onChange(newContent);
  };

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <label htmlFor="post-editor" className="text-sm font-semibold text-gray-900">
          Post Content
        </label>
        <CharacterCounter count={localContent.length} />
      </div>
      <textarea
        id="post-editor"
        value={localContent}
        onChange={handleChange}
        placeholder={placeholder}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full min-h-[320px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-sans text-base leading-relaxed bg-white input-focus transition-all duration-200"
        style={{ 
          fontFamily: 'inherit', 
          direction: isRTL ? 'rtl' : 'ltr', 
          textAlign: isRTL ? 'right' : 'left',
          fontVariantNumeric: 'normal',
          fontFeatureSettings: '"lnum"'
        }}
      />
    </div>
  );
}

