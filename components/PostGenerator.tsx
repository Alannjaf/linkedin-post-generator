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

  const {
    transcript: voiceTranscript,
    isListening,
    error: voiceError,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    clearTranscript: clearVoiceTranscript,
  } = useVoiceInput(language);

  const lastProcessedTranscriptRef = useRef('');

  useEffect(() => {
    if (!voiceTranscript) {
      lastProcessedTranscriptRef.current = '';
      return;
    }

    if (voiceTranscript !== lastProcessedTranscriptRef.current) {
      const lastProcessed = lastProcessedTranscriptRef.current;

      if (voiceTranscript.startsWith(lastProcessed)) {
        const newText = voiceTranscript.slice(lastProcessed.length).trim();
        if (newText) {
          setContext((prev) => {
            return prev.trim() === '' ? newText : `${prev} ${newText}`.trim();
          });
        }
      } else {
        const newText = voiceTranscript.trim();
        if (newText) {
          setContext((prev) => {
            return prev.trim() === '' ? newText : `${prev} ${newText}`.trim();
          });
        }
      }

      lastProcessedTranscriptRef.current = voiceTranscript;
    }
  }, [voiceTranscript]);

  useEffect(() => {
    if (voiceError) {
      onError(voiceError);
    }
  }, [voiceError, onError]);

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
      {/* Context Input */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="context" className="floating-label">
            Draft Idea / Context
          </label>
          {isVoiceSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              onMouseDown={(e) => e.preventDefault()}
              disabled={isGenerating}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={isListening}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${isListening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse-glow'
                  : 'btn-secondary'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden sm:inline">Listening...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Voice Input</span>
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
            className="input-field min-h-[140px] resize-y"
            aria-describedby={isListening ? 'voice-status' : undefined}
          />
          {isListening && (
            <div
              id="voice-status"
              className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30"
              role="status"
              aria-live="polite"
            >
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Recording... Speak now</span>
            </div>
          )}
        </div>
        {isVoiceSupported && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded text-xs font-mono">Ctrl+Shift+V</kbd> to toggle voice input
          </p>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Language */}
        <div>
          <label htmlFor="language" className="floating-label">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="select-field"
          >
            <option value="english">English</option>
            <option value="kurdish">Kurdish (کوردی)</option>
          </select>
        </div>

        {/* Tone */}
        <div>
          <label htmlFor="tone" className="floating-label">
            Tone
          </label>
          <div className="space-y-3">
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="select-field"
            >
              {BUILT_IN_TONES.map((toneOption) => (
                <option key={toneOption.value} value={toneOption.value}>
                  {toneOption.label}
                </option>
              ))}
            </select>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowToneSelector(!showToneSelector)}
              className="w-full btn-ghost text-xs justify-center"
            >
              <span>Advanced Options</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showToneSelector ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showToneSelector && (
              <div className="glass-card p-4 mt-2 animate-fade-in">
                {/* Tabs */}
                <div className="flex border-b border-[var(--border-default)] mb-4 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setToneTab('custom')}
                    className={`tab-button ${toneTab === 'custom' ? 'active' : ''}`}
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => setToneTab('mix')}
                    className={`tab-button ${toneTab === 'mix' ? 'active' : ''}`}
                  >
                    Mix
                  </button>
                  <button
                    type="button"
                    onClick={() => setToneTab('industry')}
                    className={`tab-button ${toneTab === 'industry' ? 'active' : ''}`}
                  >
                    Industry
                  </button>
                </div>

                {/* Tab Content */}
                <div className="max-h-64 overflow-y-auto scrollbar-hide">
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

        {/* Length */}
        <div>
          <label htmlFor="length" className="floating-label">
            Length
          </label>
          <select
            id="length"
            value={length}
            onChange={(e) => setLength(e.target.value as PostLength)}
            className="select-field"
          >
            <option value="short">Short (~300 chars)</option>
            <option value="medium">Medium (~800 chars)</option>
            <option value="long">Long (~1500+ chars)</option>
          </select>
        </div>
      </div>

      {/* Generate Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !context.trim()}
        className="w-full btn-primary py-4 text-lg"
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
