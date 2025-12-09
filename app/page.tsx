'use client';

import { useState, useEffect } from 'react';
import PostGenerator from '@/components/PostGenerator';
import PostEditor from '@/components/PostEditor';
import HashtagSuggestions from '@/components/HashtagSuggestions';
import DraftManager from '@/components/DraftManager';
import { saveDraft } from '@/lib/storage';
import { Language, Tone, PostLength, Draft } from '@/types';

export default function Home() {
  const [postContent, setPostContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [currentTone, setCurrentTone] = useState<Tone>('professional');
  const [currentLength, setCurrentLength] = useState<PostLength>('medium');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [editedImagePrompt, setEditedImagePrompt] = useState<string>('');

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

  const handlePostGenerated = (content: string, generatedHashtags: string[], language: Language, tone: Tone, length: PostLength) => {
    setPostContent(content);
    setHashtags(generatedHashtags);
    setSelectedHashtags([]);
    setCurrentLanguage(language);
    setCurrentTone(tone);
    setCurrentLength(length);
    setImagePrompt('');
    setEditedImagePrompt('');
    setGeneratedImage(null);
    setError(null);
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

  const handleSaveDraft = () => {
    if (!postContent.trim()) {
      setError('No content to save');
      return;
    }

    try {
      const title = postContent.substring(0, 50) || 'Untitled Draft';
      saveDraft({
        title,
        content: postContent,
        language: currentLanguage,
        tone: currentTone,
        length: currentLength,
        hashtags: selectedHashtags,
        generatedImage: generatedImage || null,
        imagePrompt: imagePrompt || undefined,
        editedImagePrompt: editedImagePrompt || undefined,
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
      setGeneratedImage(null);
      setImagePrompt('');
      setEditedImagePrompt('');
      setError(null);
      setSuccess(null);
    }
  };

  const handleGenerateImagePrompt = async () => {
    if (!postContent.trim()) {
      setError('Please generate a post first');
      return;
    }

    setIsGeneratingImage(true);
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
      setSuccess('Image prompt generated! Review and edit if needed, then click Generate Image.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate prompt';
      setError(errorMessage);
    } finally {
      setIsGeneratingImage(false);
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
      } catch (error) {
        setError('Failed to generate image prompt');
        return;
      }
    }

    setIsGeneratingImage(true);
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LinkedIn Post Generator
          </h1>
          <p className="text-gray-600">
            Generate professional LinkedIn posts from your draft ideas using AI
          </p>
        </header>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Generate Post
              </h2>
              <PostGenerator
                onPostGenerated={handlePostGenerated}
                onError={handleError}
              />
            </div>

            {hashtags.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Generated Post
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={!postContent.trim()}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
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

            {postContent && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Export as Text
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateImagePrompt}
                    disabled={!postContent.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Generate Image Prompt
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !editedImagePrompt.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGeneratingImage ? 'Generating Image...' : 'Generate Image'}
                  </button>
                </div>
                {editedImagePrompt && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label htmlFor="image-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                      Image Generation Prompt (you can edit this):
                    </label>
                    <textarea
                      id="image-prompt"
                      value={editedImagePrompt}
                      onChange={(e) => setEditedImagePrompt(e.target.value)}
                      className="w-full min-h-[150px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y text-sm font-mono"
                      placeholder="Image prompt will appear here..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Edit the prompt above to customize the image generation, then click "Generate Image"
                    </p>
                  </div>
                )}
                {generatedImage && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">
                      Generated Image:
                    </p>
                    <div className="relative">
                      <img
                        src={generatedImage}
                        alt="Generated LinkedIn post image"
                        className="w-full rounded-lg border border-gray-200"
                        onError={() => {
                          setError('Failed to load image. The image URL might be invalid.');
                          setGeneratedImage(null);
                        }}
                      />
                      <div className="mt-2 flex gap-2">
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
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Download Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedImage);
                            setSuccess('Image URL copied to clipboard!');
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Copy Image URL
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {selectedHashtags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">
                      Preview (with hashtags):
                    </p>
                    <div 
                      className="p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap"
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
            )}
          </div>
        </div>
      </div>

      <DraftManager onLoadDraft={handleLoadDraft} />
    </main>
  );
}

