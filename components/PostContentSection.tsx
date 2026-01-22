'use client';

import { useState } from 'react';
import PostGenerator from '@/components/PostGenerator';
import PostEditor from '@/components/PostEditor';
import HashtagSuggestions from '@/components/HashtagSuggestions';
import { Language, Tone, PostLength, WebSearchCitation } from '@/types';
import { saveDraft, updateDraft, getAllDrafts } from '@/lib/storage';
import { htmlToPlainText, plainTextToHtml } from '@/lib/linkedin-formatter';
import { Draft } from '@/types';

interface PostContentSectionProps {
  postContent: string;
  hashtags: string[];
  selectedHashtags: string[];
  currentLanguage: Language;
  currentTone: Tone;
  currentLength: PostLength;
  inspirationContext: string;
  onPostGenerated: (content: string, generatedHashtags: string[], language: Language, tone: Tone, length: PostLength, context: string, citations?: WebSearchCitation[]) => void;
  onPostContentChange: (content: string) => void;
  onHashtagAdd: (hashtag: string) => void;
  onHashtagRemove: (hashtag: string) => void;
  onError: (errorMessage: string) => void;
  onClear: () => void;
  onLoadDraft: (draft: Draft) => void;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onDraftsCountUpdate: (count: number) => void;
  generatedImage: string | null;
  imagePrompt?: string;
  editedImagePrompt?: string;
  originalContext: string;
  currentDraftId: string | null;
  onDraftIdUpdate: (id: string | null) => void;
  onStreamingUpdate?: (content: string) => void;
}

export default function PostContentSection({
  postContent,
  hashtags,
  selectedHashtags,
  currentLanguage,
  currentTone,
  currentLength,
  inspirationContext,
  onPostGenerated,
  onPostContentChange,
  onHashtagAdd,
  onHashtagRemove,
  onError,
  onClear,
  onLoadDraft,
  onToast,
  onDraftsCountUpdate,
  generatedImage,
  imagePrompt,
  editedImagePrompt,
  originalContext,
  currentDraftId,
  onDraftIdUpdate,
  onStreamingUpdate,
}: PostContentSectionProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [citations, setCitations] = useState<WebSearchCitation[] | undefined>(undefined);

  const handleStreamingUpdate = (content: string) => {
    setIsStreaming(true);
    onStreamingUpdate?.(content);
  };

  const handlePostGeneratedWrapper = (
    content: string,
    generatedHashtags: string[],
    language: Language,
    tone: Tone,
    length: PostLength,
    context: string,
    citations?: WebSearchCitation[]
  ) => {
    setIsStreaming(false);
    setCitations(citations);
    onPostGenerated(content, generatedHashtags, language, tone, length, context, citations);
  };

  const handleSaveDraft = async () => {
    if (!postContent.trim()) {
      onToast('No content to save', 'error');
      return;
    }

    try {
      const plainTextContent = htmlToPlainText(postContent);
      const title = plainTextContent.substring(0, 50) || 'Untitled Draft';

      const draftData = {
        title,
        content: postContent,
        language: currentLanguage,
        tone: currentTone,
        length: currentLength,
        hashtags: [...new Set([...selectedHashtags, ...hashtags])], // Save both selected and suggested hashtags
        generatedImage: generatedImage || null,
        imagePrompt: imagePrompt || undefined,
        editedImagePrompt: editedImagePrompt || undefined,
        originalContext: originalContext || undefined,
      };

      let savedDraft: Draft | null = null;

      if (currentDraftId) {
        // Update existing draft
        savedDraft = await updateDraft(currentDraftId, draftData);
        onToast('Draft updated!', 'success');
      } else {
        // Create new draft
        savedDraft = await saveDraft(draftData);
        if (savedDraft) {
          onDraftIdUpdate(savedDraft.id); // Track the new draft ID
        }
        onToast('Draft saved!', 'success');
      }

      const result = await getAllDrafts(1, 1);
      onDraftsCountUpdate(result.pagination.total);
    } catch (err) {
      onToast('Failed to save draft. Please try again.', 'error');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Generate Section */}
        <div className="space-y-6" id="generate-section">
          <div className="glass-card gradient-border p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              Generate Post
            </h2>
            <PostGenerator
              onPostGenerated={handlePostGeneratedWrapper}
              onError={(error) => {
                setIsStreaming(false);
                onError(error);
              }}
              initialContext={inspirationContext}
              onStreamingUpdate={handleStreamingUpdate}
            />
          </div>

          {/* Hashtag Suggestions */}
          {hashtags.length > 0 && (
            <div className="glass-card p-6 sm:p-8 animate-fade-in">
              <HashtagSuggestions
                hashtags={hashtags}
                onAddHashtag={onHashtagAdd}
                onRemoveHashtag={onHashtagRemove}
                selectedHashtags={selectedHashtags}
              />
            </div>
          )}
        </div>

        {/* Edit Section */}
        <div className="space-y-6" id="edit-section">
          <div className="glass-card gradient-border p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                  isStreaming 
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse shadow-purple-500/25' 
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/25'
                }`}>
                  {isStreaming ? (
                    <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <span className="flex items-center gap-2">
                  Generated Post
                  {isStreaming && (
                    <span className="text-sm font-normal text-purple-400 animate-pulse">
                      Writing...
                    </span>
                  )}
                </span>
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={!postContent.trim()}
                  className="btn-secondary text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="btn-ghost text-sm text-[var(--text-muted)] hover:text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
                </button>
              </div>
            </div>
            <PostEditor
              content={postContent}
              onChange={onPostContentChange}
              placeholder="Generated post will appear here..."
              language={currentLanguage}
            />
          </div>

          {/* Citations Section */}
          {citations && citations.length > 0 && (
            <div className="glass-card p-6 sm:p-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Sources ({citations.length})
                </h3>
              </div>
              <div className="space-y-2">
                {citations.map((citation, index) => (
                  <a
                    key={index}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-[var(--border-default)] hover:border-blue-400 hover:bg-blue-500/10 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {citation.url}
                        </p>
                        {citation.text && (
                          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                            "{citation.text}"
                          </p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
