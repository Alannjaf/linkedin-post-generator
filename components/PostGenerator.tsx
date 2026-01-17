'use client';

import { useState, useEffect, useRef } from 'react';
import { Language, Tone, PostLength, BuiltInTone } from '@/types';
import { generatePost } from '@/lib/openrouter';
import { useVoiceInput } from '@/lib/useVoiceInput';
import CustomToneManager from './CustomToneManager';
import ToneMixer from './ToneMixer';
import IndustryPresets from './IndustryPresets';

interface PostGeneratorProps {
  onPostGenerated: (content: string, hashtags: string[], language: Language, tone: Tone, length: PostLength, context: string) => void;
  onError: (error: string) => void;
  initialContext?: string;
}

type ToneTab = 'built-in' | 'custom' | 'mix' | 'industry';

const BUILT_IN_TONES: { value: BuiltInTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'informative', label: 'Informative' },
  { value: 'comedy', label: 'Comedy' },
];

export default function PostGenerator({ onPostGenerated, onError, initialContext }: PostGeneratorProps) {
  const [context, setContext] = useState('');

  // Update context when initialContext prop changes
  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
    }
  }, [initialContext]);
  const [language, setLanguage] = useState<Language>('english');
  const [tone, setTone] = useState<Tone>('professional');
  const [length, setLength] = useState<PostLength>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toneTab, setToneTab] = useState<ToneTab>('built-in');
  const [showToneSelector, setShowToneSelector] = useState(false);

  // Voice input integration
  const {
    transcript: voiceTranscript,
    isListening,
    error: voiceError,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    clearTranscript: clearVoiceTranscript,
  } = useVoiceInput(language);

  // Track the last processed transcript to avoid duplicate appends
  const lastProcessedTranscriptRef = useRef('');

  // Update context when voice transcript changes
  useEffect(() => {
    if (!voiceTranscript) {
      // Transcript was cleared (new session started)
      lastProcessedTranscriptRef.current = '';
      return;
    }

    if (voiceTranscript !== lastProcessedTranscriptRef.current) {
      // Check if this is a continuation or a new session
      const lastProcessed = lastProcessedTranscriptRef.current;
      
      if (voiceTranscript.startsWith(lastProcessed)) {
        // Continuation: extract only the new part
        const newText = voiceTranscript.slice(lastProcessed.length).trim();
        if (newText) {
          setContext((prev) => {
            // Append only the new text
            return prev.trim() === '' ? newText : `${prev} ${newText}`.trim();
          });
        }
      } else {
        // New session or transcript reset: use the full transcript
        // This handles the case where transcript is cleared and restarted
        const newText = voiceTranscript.trim();
        if (newText) {
          setContext((prev) => {
            // If context is empty or was from previous voice session, replace it
            // Otherwise append
            return prev.trim() === '' ? newText : `${prev} ${newText}`.trim();
          });
        }
      }
      
      lastProcessedTranscriptRef.current = voiceTranscript;
    }
  }, [voiceTranscript]);

  // Show voice errors through the main error handler
  useEffect(() => {
    if (voiceError) {
      onError(voiceError);
    }
  }, [voiceError, onError]);

  // Keyboard shortcut: Ctrl+Shift+V to toggle voice input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, startListening, stopListening]);

  // Cleanup: stop listening when component unmounts
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening, stopListening]);

  const handleGenerate = async () => {
    if (!context.trim()) {
      onError('Please provide some context or draft idea');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePost({
        context: context.trim(),
        language,
        tone,
        length,
      });
      onPostGenerated(result.content, result.hashtags, language, tone, length, context.trim());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate post';
      onError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="context" className="block text-sm font-semibold text-gray-900">
            Draft Idea / Context
          </label>
          {isVoiceSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              onMouseDown={(e) => e.preventDefault()} // Prevent textarea focus loss
              disabled={isGenerating}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={isListening}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isListening
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? (
                <>
                  <svg
                    className="w-4 h-4 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline">Listening...</span>
                  <span className="sm:hidden">Stop</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Voice Input</span>
                  <span className="sm:hidden">Voice</span>
                </>
              )}
            </button>
          )}
        </div>
        <div className="relative">
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Enter your draft idea, context, or key points for the LinkedIn post..."
            className="w-full min-h-[140px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y bg-white input-focus transition-all duration-200"
            aria-describedby={isListening ? 'voice-status' : undefined}
          />
          {isListening && (
            <div
              id="voice-status"
              className="absolute bottom-2 left-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200"
              role="status"
              aria-live="polite"
            >
              <svg
                className="w-3 h-3 animate-pulse"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Recording... Speak now</span>
            </div>
          )}
        </div>
        {isVoiceSupported && (
          <p className="mt-2 text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl+Shift+V</kbd> to toggle voice input
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-semibold text-gray-900 mb-2">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white input-focus transition-all duration-200 font-medium"
          >
            <option value="english">English</option>
            <option value="kurdish">Kurdish (کوردی)</option>
          </select>
        </div>

        <div>
          <label htmlFor="tone" className="block text-sm font-semibold text-gray-900 mb-2">
            Tone
          </label>
          <div className="space-y-3">
            {/* Built-in Tones - Inline Pills */}
            <div className="flex flex-wrap gap-2">
              {BUILT_IN_TONES.map((toneOption) => (
                <button
                  key={toneOption.value}
                  type="button"
                  onClick={() => setTone(toneOption.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    tone === toneOption.value
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={`Use ${toneOption.label.toLowerCase()} tone`}
                >
                  {toneOption.label}
                </button>
              ))}
            </div>

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setShowToneSelector(!showToneSelector)}
                className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <span>Advanced Options</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showToneSelector ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showToneSelector && (
                <div className="mt-2 border border-gray-300 rounded-lg bg-white p-4 shadow-lg">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setToneTab('custom')}
                      className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${
                        toneTab === 'custom'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Custom
                    </button>
                    <button
                      type="button"
                      onClick={() => setToneTab('mix')}
                      className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${
                        toneTab === 'mix'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Mix
                    </button>
                    <button
                      type="button"
                      onClick={() => setToneTab('industry')}
                      className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${
                        toneTab === 'industry'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Industry
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="max-h-64 overflow-y-auto">
                    {toneTab === 'custom' && (
                      <CustomToneManager
                        onToneSelected={(toneId) => {
                          setTone(toneId);
                          setShowToneSelector(false);
                        }}
                        onClose={() => setShowToneSelector(false)}
                      />
                    )}

                    {toneTab === 'mix' && (
                      <ToneMixer
                        onToneMixCreated={(toneMix, toneId) => {
                          setTone(toneId);
                          setShowToneSelector(false);
                        }}
                        onClose={() => setShowToneSelector(false)}
                        language={language}
                      />
                    )}

                    {toneTab === 'industry' && (
                      <IndustryPresets
                        onPresetSelected={(toneId) => {
                          setTone(toneId);
                          setShowToneSelector(false);
                        }}
                        onClose={() => setShowToneSelector(false)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="length" className="block text-sm font-semibold text-gray-900 mb-2">
            Length
          </label>
          <select
            id="length"
            value={length}
            onChange={(e) => setLength(e.target.value as PostLength)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white input-focus transition-all duration-200 font-medium"
          >
            <option value="short">Short (~300 chars)</option>
            <option value="medium">Medium (~800 chars)</option>
            <option value="long">Long (~1500+ chars)</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !context.trim()}
        className="w-full bg-blue-600 text-white px-6 py-3.5 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Post
          </>
        )}
      </button>
    </div>
  );
}

