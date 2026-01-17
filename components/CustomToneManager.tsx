'use client';

import { useState, useEffect } from 'react';
import { CustomTone, CreateCustomToneRequest } from '@/types';

interface CustomToneManagerProps {
  onToneSelected?: (toneId: string) => void;
  onClose?: () => void;
}

export default function CustomToneManager({ onToneSelected, onClose }: CustomToneManagerProps) {
  const [customTones, setCustomTones] = useState<CustomTone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTone, setEditingTone] = useState<CustomTone | null>(null);
  const [formData, setFormData] = useState<CreateCustomToneRequest>({
    name: '',
    descriptionEnglish: '',
    descriptionKurdish: '',
    industry: '',
  });

  useEffect(() => {
    fetchCustomTones();
  }, []);

  const fetchCustomTones = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/custom-tones?includePresets=false');
      if (response.ok) {
        const tones = await response.json();
        setCustomTones(tones);
      }
    } catch (error) {
      console.error('Error fetching custom tones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);
      const url = editingTone 
        ? `/api/custom-tones/${editingTone.id}`
        : '/api/custom-tones';
      
      const method = editingTone ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCustomTones();
        setFormData({ name: '', descriptionEnglish: '', descriptionKurdish: '', industry: '' });
        setEditingTone(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save tone');
      }
    } catch (error) {
      console.error('Error saving custom tone:', error);
      alert('Failed to save custom tone');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom tone?')) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-tones/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCustomTones();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete tone');
      }
    } catch (error) {
      console.error('Error deleting custom tone:', error);
      alert('Failed to delete custom tone');
    }
  };

  const handleEdit = (tone: CustomTone) => {
    setEditingTone(tone);
    setFormData({
      name: tone.name,
      descriptionEnglish: tone.descriptionEnglish,
      descriptionKurdish: tone.descriptionKurdish,
      industry: tone.industry || '',
    });
  };

  const handleSelect = (tone: CustomTone) => {
    if (onToneSelected) {
      onToneSelected(`custom:${tone.id}`);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Custom Tones</h3>
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

      {/* Create/Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tone Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            English Description
          </label>
          <textarea
            value={formData.descriptionEnglish}
            onChange={(e) => setFormData({ ...formData, descriptionEnglish: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            rows={2}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kurdish Description
          </label>
          <textarea
            value={formData.descriptionKurdish}
            onChange={(e) => setFormData({ ...formData, descriptionKurdish: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            rows={2}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry (Optional)
          </label>
          <input
            type="text"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., technology, finance"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {editingTone ? 'Update' : 'Create'} Tone
          </button>
          {editingTone && (
            <button
              type="button"
              onClick={() => {
                setEditingTone(null);
                setFormData({ name: '', descriptionEnglish: '', descriptionKurdish: '', industry: '' });
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List of Custom Tones */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Custom Tones</h4>
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : customTones.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No custom tones yet. Create one above!</div>
        ) : (
          <div className="space-y-2">
            {customTones.map((tone) => (
              <div
                key={tone.id}
                className="p-3 bg-white border border-gray-200 rounded-md flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{tone.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {tone.descriptionEnglish}
                  </div>
                  {tone.industry && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      {tone.industry}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {onToneSelected && (
                    <button
                      onClick={() => handleSelect(tone)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Use
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(tone)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tone.id)}
                    className="px-3 py-1 text-sm bg-red-200 text-red-700 rounded hover:bg-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
