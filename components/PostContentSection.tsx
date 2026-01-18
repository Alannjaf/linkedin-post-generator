'use client';

import PostGenerator from '@/components/PostGenerator';
import PostEditor from '@/components/PostEditor';
import HashtagSuggestions from '@/components/HashtagSuggestions';
import { Language, Tone, PostLength } from '@/types';
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
  onPostGenerated: (content: string, generatedHashtags: string[], language: Language, tone: Tone, length: PostLength, context: string) => void;
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
}: PostContentSectionProps) {
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
              onPostGenerated={onPostGenerated}
              onError={onError}
              initialContext={inspirationContext}
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Generated Post
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
        </div>
      </div>
    </>
  );
}
