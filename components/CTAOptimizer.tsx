'use client';

import { useState } from 'react';
import { Language, Tone, GeneratedCTA } from '@/types';
import { htmlToPlainText, plainTextToHtml } from '@/lib/linkedin-formatter';

interface CTAOptimizerProps {
  postContent: string;
  language: Language;
  tone: Tone;
  onCTASelected: (cta: string, position: 'start' | 'middle' | 'end' | 'embedded') => void;
}

const PLACEMENT_LABELS: Record<'start' | 'middle' | 'end' | 'embedded', { en: string; ku: string }> = {
  start: { en: 'Start', ku: 'دەستپێک' },
  middle: { en: 'Middle', ku: 'ناوەڕاست' },
  end: { en: 'End', ku: 'کۆتایی' },
  embedded: { en: 'Embedded', ku: 'تێکەڵ' },
};

export default function CTAOptimizer({
  postContent,
  language,
  tone,
  onCTASelected,
}: CTAOptimizerProps) {
  const [ctas, setCTAs] = useState<GeneratedCTA[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerateCTAs = async () => {
    if (!postContent.trim()) {
      setError(language === 'kurdish' ? 'پۆستەکە بەتاڵە' : 'Post content is empty');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const plainTextContent = htmlToPlainText(postContent);
      const response = await fetch('/api/cta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent: plainTextContent,
          language,
          tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setCTAs(data.ctas || []);
      setIsExpanded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate CTAs';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertCTA = (cta: GeneratedCTA) => {
    const plainTextContent = htmlToPlainText(postContent);
    const lines = plainTextContent.split('\n').filter(line => line.trim());
    
    let newContent = '';
    
    switch (cta.placement.position) {
      case 'start':
        newContent = `${cta.text}\n\n${plainTextContent}`;
        break;
      case 'middle':
        const middleIndex = Math.floor(lines.length / 2);
        const beforeMiddle = lines.slice(0, middleIndex).join('\n');
        const afterMiddle = lines.slice(middleIndex).join('\n');
        newContent = `${beforeMiddle}\n\n${cta.text}\n\n${afterMiddle}`;
        break;
      case 'embedded':
        // Insert after first paragraph
        if (lines.length > 0) {
          newContent = `${lines[0]}\n\n${cta.text}\n\n${lines.slice(1).join('\n')}`;
        } else {
          newContent = cta.text;
        }
        break;
      case 'end':
      default:
        newContent = `${plainTextContent}\n\n${cta.text}`;
        break;
    }
    
    const htmlContent = plainTextToHtml(newContent);
    onCTASelected(htmlContent, cta.placement.position);
  };

  const getPlacementLabel = (position: 'start' | 'middle' | 'end' | 'embedded'): string => {
    return language === 'kurdish' ? PLACEMENT_LABELS[position].ku : PLACEMENT_LABELS[position].en;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200/50 card-hover overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {language === 'kurdish' ? 'باشکردنی CTA' : 'CTA Optimizer'}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 border-t border-gray-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateCTAs}
            disabled={isGenerating || !postContent.trim()}
            className="w-full mb-4 bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{language === 'kurdish' ? 'دروستکردن...' : 'Generating...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>{language === 'kurdish' ? 'بەرهەمهێنانی CTA' : 'Generate CTAs'}</span>
              </>
            )}
          </button>

          {ctas.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {language === 'kurdish' ? 'CTA-ی دروستکراو:' : 'Generated CTAs:'}
              </h4>
              {ctas.map((cta, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          {getPlacementLabel(cta.placement.position)}
                        </span>
                        {cta.effectivenessScore && (
                          <span className="text-xs text-gray-500">
                            {Math.round(cta.effectivenessScore)}% {language === 'kurdish' ? 'کاریگەری' : 'effective'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{cta.text}</p>
                      {cta.placement.suggestion && (
                        <p className="text-xs text-gray-500 mt-1">
                          {language === 'kurdish' ? 'پێشنیار:' : 'Suggestion:'} {cta.placement.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInsertCTA(cta)}
                    className="mt-2 w-full px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {language === 'kurdish' ? 'دانانی CTA' : 'Insert CTA'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
