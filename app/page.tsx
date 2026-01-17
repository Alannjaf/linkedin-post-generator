'use client';

import { useState, useEffect } from 'react';
import PostGenerator from '@/components/PostGenerator';
import PostEditor from '@/components/PostEditor';
import HashtagSuggestions from '@/components/HashtagSuggestions';
import DraftManager from '@/components/DraftManager';
import TrendingPostsPanel from '@/components/TrendingPostsPanel';
import { saveDraft } from '@/lib/storage';
import { Language, Tone, PostLength, Draft, TrendingPost } from '@/types';

export default function Home() {
  const [postContent, setPostContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [currentTone, setCurrentTone] = useState<Tone>('professional');
  const [currentLength, setCurrentLength] = useState<PostLength>('medium');
  const [originalContext, setOriginalContext] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [editedImagePrompt, setEditedImagePrompt] = useState<string>('');
  const [isImagePromptExpanded, setIsImagePromptExpanded] = useState(false);
  const [isGeneratedImageExpanded, setIsGeneratedImageExpanded] = useState(false);
  const [inspirationContext, setInspirationContext] = useState<string>('');

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handlePostGenerated = (content: string, generatedHashtags: string[], language: Language, tone: Tone, length: PostLength, context: string) => {
    setPostContent(content);
    setHashtags(generatedHashtags);
    setSelectedHashtags([]);
    setCurrentLanguage(language);
    setCurrentTone(tone);
    setCurrentLength(length);
    setOriginalContext(context);
    setInspirationContext(''); // Clear inspiration context after generating
    setImagePrompt('');
    setEditedImagePrompt('');
    setGeneratedImage(null);
    setError(null);
    setIsImagePromptExpanded(false);
    setIsGeneratedImageExpanded(false);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  };

  const handleAddHashtag = (hashtag: string) => {
    if (!selectedHashtags.includes(hashtag)) {
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };

  const handleRemoveHashtag = (hashtag: string) => {
    setSelectedHashtags(selectedHashtags.filter((h) => h !== hashtag));
  };

  const handleCopyToClipboard = async () => {
    const finalPost = getFinalPost();
    try {
      await navigator.clipboard.writeText(finalPost);
      setSuccess('Copied to clipboard!');
      setError(null);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleExport = () => {
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
    setSuccess('Post exported!');
    setError(null);
  };

  const handleSaveDraft = async () => {
    if (!postContent.trim()) {
      setError('No content to save');
      return;
    }

    try {
      const title = postContent.substring(0, 50) || 'Untitled Draft';
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
      setSuccess('Draft saved!');
      setError(null);
    } catch (err) {
      setError('Failed to save draft');
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    setPostContent(draft.content);
    setHashtags(draft.hashtags);
    setSelectedHashtags(draft.hashtags);
    setCurrentLanguage(draft.language);
    setCurrentTone(draft.tone);
    setCurrentLength(draft.length);
    setOriginalContext(draft.originalContext || '');
    setGeneratedImage(draft.generatedImage || null);
    setImagePrompt(draft.imagePrompt || '');
    setEditedImagePrompt(draft.editedImagePrompt || draft.imagePrompt || '');
    setError(null);
    setSuccess('Draft loaded!');
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all content?')) {
      setPostContent('');
      setHashtags([]);
      setSelectedHashtags([]);
      setOriginalContext('');
      setGeneratedImage(null);
      setImagePrompt('');
      setEditedImagePrompt('');
      setError(null);
      setSuccess(null);
    }
  };

  const handleUseAsInspiration = (post: TrendingPost) => {
    // Use the trending post content as context for generating a new post
    const inspirationText = `Inspired by this trending post:\n\n${post.content}\n\nCreate a similar but original post on this topic.`;
    setInspirationContext(inspirationText);
    setOriginalContext(inspirationText);
    setSuccess('Post loaded as inspiration! Review and edit the context, then click Generate Post.');
    setError(null);
    // Scroll to the post generator
    setTimeout(() => {
      const textarea = document.querySelector('#context') as HTMLTextAreaElement;
      if (textarea) {
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        textarea.focus();
      }
    }, 100);
  };

  const handleGenerateImagePrompt = async () => {
    if (!postContent.trim()) {
      setError('Please generate a post first');
      return;
    }

    setIsGeneratingImagePrompt(true);
    setError(null);
    setSuccess('Analyzing post content and generating image prompt...');

    try {
      // Get API key from environment (we'll need to pass it from the server)
      const response = await fetch('/api/generate-image-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent,
          language: currentLanguage,
          tone: currentTone,
          context: originalContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedPrompt = data.prompt;

      if (!generatedPrompt) {
        throw new Error('No prompt generated');
      }

      setImagePrompt(generatedPrompt);
      setEditedImagePrompt(generatedPrompt);
      setIsImagePromptExpanded(true);
      setSuccess('Image prompt generated! Review and edit if needed, then click Generate Image.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate prompt';
      setError(errorMessage);
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!postContent.trim()) {
      setError('Please generate a post first');
      return;
    }

    // Use edited prompt if available, otherwise generate a new one using AI
    let promptToUse = editedImagePrompt.trim();
    
    if (!promptToUse) {
      // If no edited prompt, generate one using AI
      setSuccess('Generating image prompt with AI...');
      try {
        const promptResponse = await fetch('/api/generate-image-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postContent,
            language: currentLanguage,
            tone: currentTone,
            context: originalContext,
          }),
        });

        if (!promptResponse.ok) {
          const errorData = await promptResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate prompt');
        }

        const promptData = await promptResponse.json();
        promptToUse = promptData.prompt;
        setImagePrompt(promptToUse);
        setEditedImagePrompt(promptToUse);
        setIsImagePromptExpanded(true);
      } catch (error) {
        setError('Failed to generate image prompt');
        return;
      }
    }

    setIsGeneratingImage(true);
    setIsGeneratedImageExpanded(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imagePrompt: promptToUse }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setIsGeneratedImageExpanded(true);
        setSuccess('Image generated successfully!');
      } else {
        throw new Error('No image URL received');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      setError(errorMessage);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const getFinalPost = (): string => {
    let final = postContent;
    if (selectedHashtags.length > 0) {
      final += '\n\n' + selectedHashtags.map((h) => `#${h}`).join(' ');
    }
    return final;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
            LinkedIn Post Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Generate professional LinkedIn posts from your draft ideas using AI
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg text-green-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Generate Post
              </h2>
              <PostGenerator
                onPostGenerated={handlePostGenerated}
                onError={handleError}
                initialContext={inspirationContext}
              />
            </div>

            {hashtags.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
                <HashtagSuggestions
                  hashtags={hashtags}
                  onAddHashtag={handleAddHashtag}
                  onRemoveHashtag={handleRemoveHashtag}
                  selectedHashtags={selectedHashtags}
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
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
                    onClick={handleClear}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <PostEditor
                content={postContent}
                onChange={setPostContent}
                placeholder="Generated post will appear here..."
                language={currentLanguage}
              />
            </div>
          </div>
        </div>

        {/* Full Width Sections - Actions, Image Prompt, Generated Image */}
        {postContent && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 auto-rows-fr mt-6 lg:mt-8">
                {/* Actions Section - Always Visible */}
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover h-fit">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleCopyToClipboard}
                      className="btn-primary bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="hidden sm:inline">Copy to Clipboard</span>
                        <span className="sm:hidden">Copy</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      className="btn-primary bg-green-600 text-white hover:bg-green-700 shadow-green-200/50"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="hidden sm:inline">Export as Text</span>
                        <span className="sm:hidden">Export</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateImagePrompt}
                      disabled={!postContent.trim() || isGeneratingImagePrompt}
                      className="btn-primary bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/50 disabled:bg-gray-400"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {isGeneratingImagePrompt ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="hidden sm:inline">Generating...</span>
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                            </svg>
                            <span className="hidden lg:inline">Generate Image Prompt</span>
                            <span className="hidden sm:inline lg:hidden">Image Prompt</span>
                            <span className="sm:hidden">Prompt</span>
                          </>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || isGeneratingImagePrompt || !editedImagePrompt.trim()}
                      className="btn-primary bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200/50 disabled:bg-gray-400"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {isGeneratingImage ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="hidden sm:inline">Generating...</span>
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="hidden lg:inline">Generate Image</span>
                            <span className="hidden sm:inline lg:hidden">Image</span>
                            <span className="sm:hidden">Image</span>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Image Prompt Section */}
                {editedImagePrompt && (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden h-fit">
                    <button
                      type="button"
                      onClick={() => setIsImagePromptExpanded(!isImagePromptExpanded)}
                      className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                        </svg>
                        Image Generation Prompt
                      </h3>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isImagePromptExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isImagePromptExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-gray-200">
                        <label htmlFor="image-prompt" className="block text-sm font-semibold text-gray-900 mb-3">
                          Edit the prompt to customize the image generation:
                        </label>
                        <textarea
                          id="image-prompt"
                          value={editedImagePrompt}
                          onChange={(e) => setEditedImagePrompt(e.target.value)}
                          className="w-full min-h-[150px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y text-sm font-mono bg-gray-50 input-focus"
                          placeholder="Image prompt will appear here..."
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Edit the prompt above to customize the image generation, then click "Generate Image"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Generated Image Section */}
                {(isGeneratingImage || generatedImage) && (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden h-fit">
                    <button
                      type="button"
                      onClick={() => setIsGeneratedImageExpanded(!isGeneratedImageExpanded)}
                      className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Generated Image
                      </h3>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isGeneratedImageExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isGeneratedImageExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-gray-200">
                        {isGeneratingImage && !generatedImage ? (
                          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 mt-4">
                            <svg className="animate-spin h-8 w-8 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-sm font-medium text-gray-700">Generating your image...</p>
                            <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
                          </div>
                        ) : generatedImage ? (
                          <>
                            <div className="relative group mt-4">
                              <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-50">
                                <img
                                  src={generatedImage}
                                  alt="Generated LinkedIn post image"
                                  className="w-full h-auto"
                                  onError={() => {
                                    setError('Failed to load image. The image URL might be invalid.');
                                    setGeneratedImage(null);
                                  }}
                                />
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (generatedImage.startsWith('data:')) {
                                      // Handle base64 data URL
                                      const link = document.createElement('a');
                                      link.href = generatedImage;
                                      link.download = 'linkedin-post-image.png';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    } else {
                                      // Handle regular URL
                                      const link = document.createElement('a');
                                      link.href = generatedImage;
                                      link.download = 'linkedin-post-image.png';
                                      link.target = '_blank';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }
                                    setSuccess('Image download started!');
                                  }}
                                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Download Image
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedImage);
                                    setSuccess('Image URL copied to clipboard!');
                                  }}
                                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy Image URL
                                </button>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

        {/* Trending Posts Section - Full Width */}
        <div className="mt-6 lg:mt-8">
          <TrendingPostsPanel onUseAsInspiration={handleUseAsInspiration} />
        </div>

        {/* Preview Section - Full Width */}
        {postContent && selectedHashtags.length > 0 && (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover mt-6 lg:mt-8">
            <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview (with hashtags):
            </p>
            <div 
              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap shadow-inner"
              dir={currentLanguage === 'kurdish' ? 'rtl' : 'ltr'}
              style={{ 
                direction: currentLanguage === 'kurdish' ? 'rtl' : 'ltr',
                textAlign: currentLanguage === 'kurdish' ? 'right' : 'left',
                fontVariantNumeric: 'normal',
                fontFeatureSettings: '"lnum"'
              }}
            >
              {getFinalPost()}
            </div>
          </div>
        )}
      </div>

      <DraftManager onLoadDraft={handleLoadDraft} />
    </main>
  );
}

