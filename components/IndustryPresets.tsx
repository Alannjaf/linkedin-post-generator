'use client';

import { useState, useEffect } from 'react';
import { CustomTone } from '@/types';

interface IndustryPresetsProps {
  onPresetSelected?: (toneId: string) => void;
  onClose?: () => void;
}

const INDUSTRIES = [
  { id: 'technology', name: 'Technology' },
  { id: 'finance', name: 'Finance' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'education', name: 'Education' },
  { id: 'startup', name: 'Startup/Entrepreneurship' },
];

export default function IndustryPresets({ onPresetSelected, onClose }: IndustryPresetsProps) {
  const [presets, setPresets] = useState<CustomTone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/custom-tones?includePresets=true');
      if (response.ok) {
        const tones = await response.json();
        const industryPresets = tones.filter((tone: CustomTone) => tone.isPreset);
        setPresets(industryPresets);
      }
    } catch (error) {
      console.error('Error fetching industry presets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (preset: CustomTone) => {
    if (onPresetSelected) {
      onPresetSelected(`custom:${preset.id}`);
    }
    if (onClose) {
      onClose();
    }
  };

  const filteredPresets = selectedIndustry
    ? presets.filter((p) => p.industry === selectedIndustry)
    : presets;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Industry Presets</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Industry Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedIndustry(null)}
          className={`px-3 py-1 text-sm rounded-md ${
            selectedIndustry === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {INDUSTRIES.map((industry) => (
          <button
            key={industry.id}
            onClick={() => setSelectedIndustry(industry.id)}
            className={`px-3 py-1 text-sm rounded-md ${
              selectedIndustry === industry.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {industry.name}
          </button>
        ))}
      </div>

      {/* Presets List */}
      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Loading presets...</div>
      ) : filteredPresets.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No presets found. Presets will be available after seeding.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              className="p-4 bg-white border border-gray-200 rounded-md hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{preset.name}</h4>
                    {preset.industry && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        {preset.industry}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{preset.descriptionEnglish}</p>
                  {preset.toneMix && preset.toneMix.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Mix: {preset.toneMix.map((m) => `${m.tone} ${m.percentage}%`).join(', ')}
                    </div>
                  )}
                </div>
                {onPresetSelected && (
                  <button
                    onClick={() => handleSelect(preset)}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Use
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
