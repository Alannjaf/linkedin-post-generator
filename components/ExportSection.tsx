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
    // Convert HTML to LinkedIn-compatible format
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
    <div id="export-section" className="mt-8 lg:mt-10">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/50 card-hover">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Export & Actions
        </h3>
        
        <div className="space-y-4">
          {/* Primary Actions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Primary Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="btn-primary bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50 flex items-center justify-center gap-2 w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="whitespace-nowrap">Copy to Clipboard</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="btn-primary bg-green-600 text-white hover:bg-green-700 shadow-green-200/50 flex items-center justify-center gap-2 w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="whitespace-nowrap">Export as Text</span>
              </button>
            </div>
          </div>

          {/* Image Generation */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Image Generation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGenerateImagePrompt}
                disabled={!postContent.trim() || imageGeneration.isGeneratingImagePrompt}
                className="btn-primary bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/50 disabled:bg-gray-400 flex items-center justify-center gap-2 w-full"
              >
                {imageGeneration.isGeneratingImagePrompt ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="whitespace-nowrap">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                    </svg>
                    <span className="whitespace-nowrap">Generate Image Prompt</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={imageGeneration.isGeneratingImage || imageGeneration.isGeneratingImagePrompt || !imageGeneration.editedImagePrompt.trim()}
                className="btn-primary bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200/50 disabled:bg-gray-400 flex items-center justify-center gap-2 w-full"
              >
                {imageGeneration.isGeneratingImage ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="whitespace-nowrap">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="whitespace-nowrap">Generate Image</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Settings</h4>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useUnicodeFormatting}
                  onChange={(e) => setUseUnicodeFormatting(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Use Unicode Formatting</span>
                  <p className="text-xs text-gray-600 mt-0.5">
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
        <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden h-fit mt-6">
          <button
            type="button"
            onClick={() => imageGeneration.setIsImagePromptExpanded(!imageGeneration.isImagePromptExpanded)}
            className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
              </svg>
              Image Generation Prompt
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${imageGeneration.isImagePromptExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              imageGeneration.isImagePromptExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-gray-200">
              <label htmlFor="image-prompt" className="block text-sm font-semibold text-gray-900 mb-3">
                Edit the prompt to customize the image generation:
              </label>
              <textarea
                id="image-prompt"
                value={imageGeneration.editedImagePrompt}
                onChange={(e) => imageGeneration.setEditedImagePrompt(e.target.value)}
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
      {(imageGeneration.isGeneratingImage || imageGeneration.generatedImage) && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden h-fit mt-6">
          <button
            type="button"
            onClick={() => imageGeneration.setIsGeneratedImageExpanded(!imageGeneration.isGeneratedImageExpanded)}
            className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Generated Image
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${imageGeneration.isGeneratedImageExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              imageGeneration.isGeneratedImageExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-gray-200">
              {imageGeneration.isGeneratingImage && !imageGeneration.generatedImage ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 mt-4">
                  <svg className="animate-spin h-8 w-8 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm font-medium text-gray-700">Generating your image...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
                </div>
              ) : imageGeneration.generatedImage ? (
                <>
                  <div className="relative group mt-4">
                    <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-50">
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
                          if (imgUrl.startsWith('data:')) {
                            const link = document.createElement('a');
                            link.href = imgUrl;
                            link.download = 'linkedin-post-image.png';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else {
                            const link = document.createElement('a');
                            link.href = imgUrl;
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
                          navigator.clipboard.writeText(imageGeneration.generatedImage!);
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
  );
}
