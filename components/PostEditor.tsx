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
        <label htmlFor="post-editor" className="floating-label">
          Post Content
        </label>
        <CharacterCounter count={characterCount} />
      </div>

      {/* Formatting Toolbar */}
      <div className={`flex items-center gap-1 p-2 bg-[var(--bg-input)] rounded-t-xl border border-[var(--border-default)] ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg transition-all duration-200 ${editor.isActive('bold')
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Bold (Ctrl+B)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg transition-all duration-200 ${editor.isActive('italic')
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Italic (Ctrl+I)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z" />
          </svg>
        </button>

        <div className="w-px h-6 bg-[var(--border-default)] mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg transition-all duration-200 ${editor.isActive('bulletList')
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
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
          className={`p-2 rounded-lg transition-all duration-200 ${editor.isActive('orderedList')
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
            }`}
          title="Numbered List"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setContent('').run()}
          className="ml-auto p-2 rounded-lg text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
          title="Clear Content"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Editor */}
      <div className="border border-[var(--border-default)] rounded-b-xl bg-[var(--bg-input)] focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-[var(--accent-purple)] transition-all duration-200">
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
          color: var(--text-primary);
          background: transparent;
        }

        .ProseMirror p {
          margin: 0.5rem 0;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
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
          color: var(--text-primary);
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
