'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCounter from './CharacterCounter';
import { Language } from '@/types';
import { htmlToPlainText } from '@/lib/linkedin-formatter';

interface PostEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  language?: Language;
}

export default function PostEditor({ 
  content, 
  onChange, 
  placeholder = 'Generated post will appear here...', 
  language = 'english' 
}: PostEditorProps) {
  const isRTL = language === 'kurdish';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading and code block for LinkedIn posts
        heading: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[320px] px-4 py-3',
        dir: isRTL ? 'rtl' : 'ltr',
        style: `direction: ${isRTL ? 'rtl' : 'ltr'}; text-align: ${isRTL ? 'right' : 'left'};`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

  // Update direction when language changes
  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom as HTMLElement;
      editorElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
      editorElement.style.direction = isRTL ? 'rtl' : 'ltr';
      editorElement.style.textAlign = isRTL ? 'right' : 'left';
    }
  }, [editor, isRTL]);

  if (!editor) {
    return null;
  }

  const plainTextContent = htmlToPlainText(content);
  const characterCount = plainTextContent.length;

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <label htmlFor="post-editor" className="text-sm font-semibold text-gray-900">
          Post Content
        </label>
        <CharacterCounter count={characterCount} />
      </div>

      {/* Formatting Toolbar */}
      <div className={`flex items-center gap-1 p-2 bg-gray-50 rounded-t-lg border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Bold (Ctrl+B)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4v8a4 4 0 01-4 4H6a4 4 0 01-4-4V8a4 4 0 014-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Italic (Ctrl+I)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z"/>
          </svg>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          title="Bullet List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          title="Numbered List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div className="border border-gray-300 rounded-b-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 320px;
          padding: 1rem;
          font-family: inherit;
          font-size: 1rem;
          line-height: 1.75;
        }

        .ProseMirror p {
          margin: 0.5rem 0;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }

        .ProseMirror[dir="rtl"] p.is-editor-empty:first-child::before {
          float: right;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .ProseMirror ul[dir="rtl"],
        .ProseMirror ol[dir="rtl"] {
          padding-left: 0;
          padding-right: 1.5rem;
        }

        .ProseMirror li {
          margin: 0.25rem 0;
        }

        .ProseMirror strong {
          font-weight: 600;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
