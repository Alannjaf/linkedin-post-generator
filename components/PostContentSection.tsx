'use client';

import PostGenerator from '@/components/PostGenerator';
import PostEditor from '@/components/PostEditor';
import HashtagSuggestions from '@/components/HashtagSuggestions';
import { Language, Tone, PostLength } from '@/types';
import { saveDraft, getAllDrafts } from '@/lib/storage';
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
}: PostContentSectionProps) {
  const handleSaveDraft = async () => {
    if (!postContent.trim()) {
      onToast('No content to save', 'error');
      return;
    }

    try {
      const plainTextContent = htmlToPlainText(postContent);
      const title = plainTextContent.substring(0, 50) || 'Untitled Draft';
      await saveDraft({
        title,
        content: postContent,
        language: currentLanguage,
        tone: currentTone,
        length: currentLength,
        hashtags: selectedHashtags,
        generatedImage: generatedImage || null,
        imagePrompt: imagePrompt || undefined,
        editedImagePrompt: editedImagePrompt || undefined,
        originalContext: originalContext || undefined,
      });
      onToast('Draft saved!', 'success');
      const result = await getAllDrafts(1, 1);
      onDraftsCountUpdate(result.pagination.total);
    } catch (err) {
      onToast('Failed to save draft. Please try again.', 'error');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="space-y-6" id="generate-section">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Generate Post
            </h2>
            <PostGenerator
              onPostGenerated={onPostGenerated}
              onError={onError}
              initialContext={inspirationContext}
            />
          </div>

          {hashtags.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
              <HashtagSuggestions
                hashtags={hashtags}
                onAddHashtag={onHashtagAdd}
                onRemoveHashtag={onHashtagRemove}
                selectedHashtags={selectedHashtags}
              />
            </div>
          )}
        </div>

        <div className="space-y-6" id="edit-section">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generated Post
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={!postContent.trim()}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                >
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
