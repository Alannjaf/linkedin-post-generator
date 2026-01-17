'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DraftManager from '@/components/DraftManager';
import TrendingPostsPanel from '@/components/TrendingPostsPanel';
import SavedPostsPanel from '@/components/SavedPostsPanel';
import WorkflowStepper from '@/components/WorkflowStepper';
import FloatingActionMenu from '@/components/FloatingActionMenu';
import Toast from '@/components/Toast';
import LinkedInPreview from '@/components/LinkedInPreview';
import PostContentSection from '@/components/PostContentSection';
import EnhancementSection from '@/components/EnhancementSection';
import ExportSection from '@/components/ExportSection';
import PreviewStats from '@/components/PreviewStats';
import { saveDraft, getAllDrafts } from '@/lib/storage';
import { savePost, getAllSavedPosts, deleteSavedPost } from '@/lib/saved-posts';
import { convertHtmlToLinkedInFormat, htmlToPlainText, plainTextToHtml } from '@/lib/linkedin-formatter';
import { Language, Tone, PostLength, Draft, TrendingPost } from '@/types';
import { usePostState } from '@/hooks/usePostState';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useDraftsAndSaved } from '@/hooks/useDraftsAndSaved';

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inspirationContext, setInspirationContext] = useState<string>('');
  const [useUnicodeFormatting, setUseUnicodeFormatting] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Custom hooks for state management
  const postState = usePostState();
  const imageGeneration = useImageGeneration();
  const draftsAndSaved = useDraftsAndSaved();

  // Initialize saved posts and drafts (handled in hooks)

  // Show toast for success messages
  useEffect(() => {
    if (success) {
      setToast({ message: success, type: 'success' });
      setSuccess(null);
    }
  }, [success]);

  // Show toast for non-critical errors
  useEffect(() => {
    if (error && !error.includes('Failed to generate') && !error.includes('API error')) {
      setToast({ message: error, type: 'error' });
    }
  }, [error]);

  const handlePostGenerated = useCallback((content: string, generatedHashtags: string[], language: Language, tone: Tone, length: PostLength, context: string) => {
    postState.handlePostGenerated(content, generatedHashtags, language, tone, length, context);
    setInspirationContext(''); // Clear inspiration context after generating
    imageGeneration.clearImageState();
    setError(null);
  }, [postState, imageGeneration]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  }, []);

  const handleAddHashtag = useCallback((hashtag: string) => {
    postState.handleAddHashtag(hashtag);
  }, [postState]);

  const handleRemoveHashtag = useCallback((hashtag: string) => {
    postState.handleRemoveHashtag(hashtag);
  }, [postState]);

  const getFinalPost = useCallback((): string => {
    let final = convertHtmlToLinkedInFormat(postState.postContent, useUnicodeFormatting);
    if (postState.selectedHashtags.length > 0) {
      final += '\n\n' + postState.selectedHashtags.map((h) => `#${h}`).join(' ');
    }
    return final;
  }, [postState.postContent, postState.selectedHashtags, useUnicodeFormatting]);

  const handleCopyToClipboard = useCallback(async () => {
    const finalPost = getFinalPost();
    try {
      await navigator.clipboard.writeText(finalPost);
      setToast({ message: 'Copied to clipboard! Paste into LinkedIn to see formatting.', type: 'success' });
      setError(null);
    } catch (err) {
      setToast({ message: 'Failed to copy to clipboard', type: 'error' });
    }
  }, [getFinalPost]);

  const handleExport = useCallback(() => {
    const finalPost = getFinalPost();
    const blob = new Blob([finalPost], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-post-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ message: 'Post exported!', type: 'success' });
    setError(null);
  }, [getFinalPost]);

  const handleLoadDraft = useCallback((draft: Draft) => {
    // Handle backward compatibility: convert plain text to HTML if needed
    let content = draft.content;
    
    // Check if content is plain text (doesn't contain HTML tags)
    if (content && !content.includes('<') && !content.includes('>')) {
      content = plainTextToHtml(content);
    }
    
    postState.setPostContent(content);
    postState.setHashtags(draft.hashtags);
    postState.setSelectedHashtags(draft.hashtags);
    postState.setCurrentLanguage(draft.language);
    postState.setCurrentTone(draft.tone);
    postState.setCurrentLength(draft.length);
    postState.setOriginalContext(draft.originalContext || '');
    imageGeneration.setGeneratedImage(draft.generatedImage || null);
    imageGeneration.setImagePrompt(draft.imagePrompt || '');
    imageGeneration.setEditedImagePrompt(draft.editedImagePrompt || draft.imagePrompt || '');
    setError(null);
    setToast({ message: 'Draft loaded!', type: 'success' });
  }, [postState, imageGeneration]);

  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all content?')) {
      postState.handleClear();
      imageGeneration.clearImageState();
      setError(null);
      setSuccess(null);
    }
  }, [postState, imageGeneration]);

  const handleUseAsInspiration = useCallback((post: TrendingPost) => {
    const inspirationText = `Inspired by this trending post:\n\n${post.content}\n\nCreate a similar but original post on this topic.`;
    setInspirationContext(inspirationText);
    postState.setOriginalContext(inspirationText);
    setSuccess('Post loaded as inspiration! Review and edit the context, then click Generate Post.');
    setError(null);
    setTimeout(() => {
      const textarea = document.querySelector('#context') as HTMLTextAreaElement;
      if (textarea) {
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        textarea.focus();
      }
    }, 100);
  }, [postState]);

  const handleSavePost = useCallback(async (post: TrendingPost) => {
    await draftsAndSaved.handleSavePost(
      post,
      () => setToast({ message: 'Post saved! You can find it in Saved Posts.', type: 'success' }),
      (err) => setToast({ message: 'Failed to save post. Please try again.', type: 'error' })
    );
  }, [draftsAndSaved]);

  const handleDeleteSavedPost = useCallback(async (postId: string) => {
    await draftsAndSaved.handleDeleteSavedPost(postId);
  }, [draftsAndSaved]);


  const getCurrentStep = useCallback((): 'generate' | 'edit' | 'enhance' | 'export' => {
    if (!postState.postContent) return 'generate';
    if (postState.postContent && !postState.hashtags.length) return 'edit';
    if (postState.postContent && postState.hashtags.length && postState.selectedHashtags.length === 0) return 'enhance';
    return 'export';
  }, [postState]);

  const handleStepClick = useCallback((step: 'generate' | 'edit' | 'enhance' | 'export') => {
    const elementId = step === 'generate' ? 'generate-section' : 
                     step === 'edit' ? 'edit-section' :
                     step === 'enhance' ? 'enhance-section' : 'export-section';
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const currentStep = useMemo(() => getCurrentStep(), [getCurrentStep]);
  
  // Memoize character count calculation
  const characterCount = useMemo(() => htmlToPlainText(postState.postContent).length, [postState.postContent]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
            LinkedIn Post Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mb-6">
            Generate professional LinkedIn posts from your draft ideas using AI
          </p>
          
          {/* Workflow Stepper */}
          <WorkflowStepper currentStep={currentStep} onStepClick={handleStepClick} />
        </header>

        {/* Critical Error Messages (stay at top) */}
        {error && (error.includes('Failed to generate') || error.includes('API error')) && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}

        <PostContentSection
          postContent={postState.postContent}
          hashtags={postState.hashtags}
          selectedHashtags={postState.selectedHashtags}
          currentLanguage={postState.currentLanguage}
          currentTone={postState.currentTone}
          currentLength={postState.currentLength}
          inspirationContext={inspirationContext}
          onPostGenerated={handlePostGenerated}
          onPostContentChange={postState.setPostContent}
          onHashtagAdd={handleAddHashtag}
          onHashtagRemove={handleRemoveHashtag}
          onError={handleError}
          onClear={handleClear}
          onLoadDraft={handleLoadDraft}
          onToast={(msg, type) => setToast({ message: msg, type })}
          onDraftsCountUpdate={draftsAndSaved.setDraftsCount}
          generatedImage={imageGeneration.generatedImage}
          imagePrompt={imageGeneration.imagePrompt}
          editedImagePrompt={imageGeneration.editedImagePrompt}
          originalContext={postState.originalContext}
        />

        {/* Enhance & Export Sections */}
        {postState.postContent && (
          <>
            <ExportSection
              postContent={postState.postContent}
              selectedHashtags={postState.selectedHashtags}
              useUnicodeFormatting={useUnicodeFormatting}
              setUseUnicodeFormatting={setUseUnicodeFormatting}
              imageGeneration={imageGeneration}
              currentLanguage={postState.currentLanguage}
              currentTone={postState.currentTone}
              originalContext={postState.originalContext}
              setSuccess={(msg) => setSuccess(msg)}
              setError={(msg) => setError(msg)}
            />

            <EnhancementSection
              postContent={postState.postContent}
              currentLanguage={postState.currentLanguage}
              currentTone={postState.currentTone}
              imageGeneration={imageGeneration}
              onPostContentChange={postState.setPostContent}
              onToast={(msg, type) => setToast({ message: msg, type })}
            />
          </>
        )}

        {/* Trending Posts Section - Full Width */}
        <div className="mt-6 lg:mt-8">
          <TrendingPostsPanel 
            onUseAsInspiration={handleUseAsInspiration}
            onSavePost={handleSavePost}
            savedPostIds={draftsAndSaved.savedPostIds}
          />
        </div>

        {/* Enhanced Preview Section */}
        {postState.postContent && (
          <div className="mt-8 lg:mt-10">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  LinkedIn Preview
                </h3>
                <PreviewStats 
                  content={postState.postContent}
                  selectedHashtags={postState.selectedHashtags}
                />
              </div>
              <LinkedInPreview
                content={postState.postContent}
                hashtags={postState.selectedHashtags}
                language={postState.currentLanguage}
                characterCount={characterCount}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Menu (Mobile) */}
      <FloatingActionMenu
        onDraftsClick={() => draftsAndSaved.setIsDraftManagerOpen(true)}
        onSavedPostsClick={() => draftsAndSaved.setIsSavedPostsOpen(true)}
        onCopyClick={postState.postContent ? handleCopyToClipboard : undefined}
        onExportClick={postState.postContent ? handleExport : undefined}
        draftsCount={draftsAndSaved.draftsCount}
        savedPostsCount={draftsAndSaved.savedPostsCount}
        canCopy={!!postState.postContent}
        canExport={!!postState.postContent}
      />

      {/* Draft Manager */}
      <DraftManager 
        onLoadDraft={(draft) => {
          handleLoadDraft(draft);
          draftsAndSaved.setIsDraftManagerOpen(false);
        }}
        isOpen={draftsAndSaved.isDraftManagerOpen}
        onClose={() => draftsAndSaved.setIsDraftManagerOpen(false)}
      />

      {/* Saved Posts Panel */}
      <SavedPostsPanel 
        onUseAsInspiration={handleUseAsInspiration}
        onPostDeleted={() => {
          draftsAndSaved.refreshSavedPostIds();
        }}
        isOpen={draftsAndSaved.isSavedPostsOpen}
        onClose={() => draftsAndSaved.setIsSavedPostsOpen(false)}
      />
    </main>
  );
}

