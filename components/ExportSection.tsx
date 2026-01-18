'use client';

import { useCallback } from 'react';
import { convertHtmlToLinkedInFormat } from '@/lib/linkedin-formatter';
import { UseImageGenerationReturn } from '@/hooks/useImageGeneration';
import { Language, Tone } from '@/types';

interface ExportSectionProps {
  postContent: string;
  selectedHashtags: string[];
  useUnicodeFormatting: boolean;
  setUseUnicodeFormatting: (value: boolean) => void;
  imageGeneration: UseImageGenerationReturn;
  currentLanguage: Language;
  currentTone: Tone;
  originalContext: string;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
}

export default function ExportSection({
  postContent,
  selectedHashtags,
  useUnicodeFormatting,
  setUseUnicodeFormatting,
  imageGeneration,
  currentLanguage,
  currentTone,
  originalContext,
  setSuccess,
  setError,
}: ExportSectionProps) {
  const getFinalPost = useCallback((): string => {
    let final = convertHtmlToLinkedInFormat(postContent, useUnicodeFormatting);
    if (selectedHashtags.length > 0) {
      final += '\n\n' + selectedHashtags.map((h) => `#${h}`).join(' ');
    }
    return final;
  }, [postContent, selectedHashtags, useUnicodeFormatting]);

  const handleCopyToClipboard = useCallback(async () => {
    const finalPost = getFinalPost();
    try {
      await navigator.clipboard.writeText(finalPost);
      setSuccess('Copied to clipboard! Paste into LinkedIn to see formatting.');
      setError('');
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  }, [getFinalPost, setSuccess, setError]);

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
    setSuccess('Post exported!');
    setError('');
  }, [getFinalPost, setSuccess, setError]);

  const handleGenerateImagePrompt = useCallback(() => {
    return imageGeneration.handleGenerateImagePrompt(
      postContent,
      currentLanguage,
      currentTone,
      originalContext,
      setSuccess,
      setError
    );
  }, [postContent, currentLanguage, currentTone, originalContext, imageGeneration, setSuccess, setError]);

  const handleGenerateImage = useCallback(() => {
    return imageGeneration.handleGenerateImage(
      postContent,
      currentLanguage,
      currentTone,
      originalContext,
      setSuccess,
      setError
    );
  }, [postContent, currentLanguage, currentTone, originalContext, imageGeneration, setSuccess, setError]);

  return (
    <div id="export-section" className="mt-8 lg:mt-12">
      <div className="glass-card gradient-border p-6 sm:p-8">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          Export & Actions
        </h3>

        <div className="space-y-6">
          {/* Primary Actions */}
          <div>
            <h4 className="floating-label mb-3">Primary Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="btn-primary py-3 justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="btn-secondary py-3 justify-center border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export as Text
              </button>
            </div>
          </div>

          {/* Image Generation */}
          <div className="pt-4 border-t border-[var(--border-default)]">
            <h4 className="floating-label mb-3">Image Generation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGenerateImagePrompt}
                disabled={!postContent.trim() || imageGeneration.isGeneratingImagePrompt}
                className="btn-secondary py-3 justify-center border-blue-500/30 hover:border-blue-500/50 text-blue-400"
              >
                {imageGeneration.isGeneratingImagePrompt ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                    </svg>
                    Generate Image Prompt
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={imageGeneration.isGeneratingImage || imageGeneration.isGeneratingImagePrompt || !imageGeneration.editedImagePrompt.trim()}
                className="btn-secondary py-3 justify-center border-purple-500/30 hover:border-purple-500/50 text-purple-400"
              >
                {imageGeneration.isGeneratingImage ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="pt-4 border-t border-[var(--border-default)]">
            <h4 className="floating-label mb-3">Settings</h4>
            <div className="glass-card p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                {/* Custom Toggle Switch */}
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={useUnicodeFormatting}
                    onChange={(e) => setUseUnicodeFormatting(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${useUnicodeFormatting ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-[var(--bg-input)]'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${useUnicodeFormatting ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-purple)] transition-colors">
                    Use Unicode Formatting
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {useUnicodeFormatting
                      ? 'Bold/italic will use Unicode characters. Note: Arabic/Kurdish bold may not render correctly in LinkedIn.'
                      : 'Plain text only (better for accessibility and search)'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Image Prompt Section */}
      {imageGeneration.editedImagePrompt && (
        <div className="glass-card mt-6 overflow-hidden">
          <button
            type="button"
            onClick={() => imageGeneration.setIsImagePromptExpanded(!imageGeneration.isImagePromptExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors duration-200"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                </svg>
              </span>
              Image Generation Prompt
            </h3>
            <svg
              className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-300 ${imageGeneration.isImagePromptExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${imageGeneration.isImagePromptExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="px-6 pb-6 border-t border-[var(--border-default)]">
              <label htmlFor="image-prompt" className="floating-label mt-4 mb-3 block">
                Edit the prompt to customize the image generation:
              </label>
              <textarea
                id="image-prompt"
                value={imageGeneration.editedImagePrompt}
                onChange={(e) => imageGeneration.setEditedImagePrompt(e.target.value)}
                className="input-field min-h-[150px] resize-y font-mono text-sm"
                placeholder="Image prompt will appear here..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Generated Image Section */}
      {(imageGeneration.isGeneratingImage || imageGeneration.generatedImage) && (
        <div className="glass-card mt-6 overflow-hidden">
          <button
            type="button"
            onClick={() => imageGeneration.setIsGeneratedImageExpanded(!imageGeneration.isGeneratedImageExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors duration-200"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              Generated Image
            </h3>
            <svg
              className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-300 ${imageGeneration.isGeneratedImageExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${imageGeneration.isGeneratedImageExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="px-6 pb-6 border-t border-[var(--border-default)]">
              {imageGeneration.isGeneratingImage && !imageGeneration.generatedImage ? (
                <div className="flex flex-col items-center justify-center py-12 mt-4 glass-card border-2 border-dashed border-[var(--border-default)]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Generating your image...</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">This may take a few moments</p>
                </div>
              ) : imageGeneration.generatedImage ? (
                <div className="mt-4">
                  <div className="rounded-xl overflow-hidden shadow-lg border border-[var(--border-default)]">
                    <img
                      src={imageGeneration.generatedImage}
                      alt="Generated LinkedIn post image"
                      className="w-full h-auto"
                      onError={() => {
                        setError('Failed to load image. The image URL might be invalid.');
                        imageGeneration.setGeneratedImage(null);
                      }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const imgUrl = imageGeneration.generatedImage!;
                        const link = document.createElement('a');
                        link.href = imgUrl;
                        link.download = 'linkedin-post-image.png';
                        if (!imgUrl.startsWith('data:')) {
                          link.target = '_blank';
                        }
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setSuccess('Image download started!');
                      }}
                      className="btn-secondary text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(imageGeneration.generatedImage!);
                        setSuccess('Image URL copied to clipboard!');
                      }}
                      className="btn-secondary text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Image URL
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
