'use client';

import { useState } from 'react';
import { BuiltInTone, ToneMix, Language } from '@/types';
import { validateToneMix, generateMixedToneDescription, createToneMixHash } from '@/lib/tone-mixer';

interface ToneMixerProps {
  onToneMixCreated?: (toneMix: ToneMix[], toneId: string) => void;
  onClose?: () => void;
  language?: Language;
}

const BUILT_IN_TONES: BuiltInTone[] = ['professional', 'casual', 'friendly', 'inspirational', 'informative', 'comedy'];

export default function ToneMixer({ onToneMixCreated, onClose, language = 'english' }: ToneMixerProps) {
  const [toneMix, setToneMix] = useState<Record<BuiltInTone, number>>({
    professional: 0,
    casual: 0,
    friendly: 0,
    inspirational: 0,
    informative: 0,
    comedy: 0,
  });
  const [toneName, setToneName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const totalPercentage = Object.values(toneMix).reduce((sum, val) => sum + val, 0);
  const remainingPercentage = 100 - totalPercentage;

  const handlePercentageChange = (tone: BuiltInTone, value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    setToneMix({ ...toneMix, [tone]: newValue });
  };

  const handleUse = () => {
    const activeMix: ToneMix[] = Object.entries(toneMix)
      .filter(([_, percentage]) => percentage > 0)
      .map(([tone, percentage]) => ({ tone: tone as BuiltInTone, percentage }));

    const validation = validateToneMix(activeMix);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    if (onToneMixCreated) {
      const hash = createToneMixHash(activeMix);
      onToneMixCreated(activeMix, `mixed:${hash}`);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleSaveAsCustom = async () => {
    const activeMix: ToneMix[] = Object.entries(toneMix)
      .filter(([_, percentage]) => percentage > 0)
      .map(([tone, percentage]) => ({ tone: tone as BuiltInTone, percentage }));

    const validation = validateToneMix(activeMix);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    if (!toneName.trim()) {
      alert('Please enter a name for this tone mix');
      return;
    }

    try {
      setIsSaving(true);
      const descriptionEnglish = generateMixedToneDescription(activeMix, 'english');
      const descriptionKurdish = generateMixedToneDescription(activeMix, 'kurdish');

      const response = await fetch('/api/custom-tones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: toneName,
          descriptionEnglish,
          descriptionKurdish,
          toneMix: activeMix,
        }),
      });

      if (response.ok) {
        const customTone = await response.json();
        if (onToneMixCreated) {
          onToneMixCreated(activeMix, `custom:${customTone.id}`);
        }
        if (onClose) {
          onClose();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save tone mix');
      }
    } catch (error) {
      console.error('Error saving tone mix:', error);
      alert('Failed to save tone mix');
    } finally {
      setIsSaving(false);
    }
  };

  const previewDescription = generateMixedToneDescription(
    Object.entries(toneMix)
      .filter(([_, percentage]) => percentage > 0)
      .map(([tone, percentage]) => ({ tone: tone as BuiltInTone, percentage })),
    language
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Mix Tones</h3>
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

      <div className="space-y-3">
        {BUILT_IN_TONES.map((tone) => (
          <div key={tone} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 capitalize">
                {tone}
              </label>
              <span className="text-sm text-gray-600">{toneMix[tone]}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={toneMix[tone]}
              onChange={(e) => handlePercentageChange(tone, parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePercentageChange(tone, Math.max(0, toneMix[tone] - 5))}
                className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
              >
                -5%
              </button>
              <button
                type="button"
                onClick={() => handlePercentageChange(tone, Math.min(100, toneMix[tone] + 5))}
                className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
              >
                +5%
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-blue-50 rounded-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Total:</span>
          <span className={`text-sm font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPercentage}%
          </span>
        </div>
        {totalPercentage !== 100 && (
          <div className="text-xs text-gray-600">
            {remainingPercentage > 0 
              ? `${remainingPercentage}% remaining`
              : `${Math.abs(remainingPercentage)}% over limit`}
          </div>
        )}
      </div>

      {previewDescription && (
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="text-xs font-medium text-gray-600 mb-1">Preview:</div>
          <div className="text-sm text-gray-800">{previewDescription}</div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleUse}
          disabled={totalPercentage !== 100}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Use Mix
        </button>
        <button
          onClick={handleSaveAsCustom}
          disabled={totalPercentage !== 100 || isSaving}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save as Custom'}
        </button>
      </div>

      {totalPercentage === 100 && (
        <div className="mt-2">
          <input
            type="text"
            value={toneName}
            onChange={(e) => setToneName(e.target.value)}
            placeholder="Name for custom tone (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          />
        </div>
      )}
    </div>
  );
}
