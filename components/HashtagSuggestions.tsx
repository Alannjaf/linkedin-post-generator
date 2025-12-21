'use client';

interface HashtagSuggestionsProps {
  hashtags: string[];
  onAddHashtag: (hashtag: string) => void;
  onRemoveHashtag: (hashtag: string) => void;
  selectedHashtags: string[];
}

export default function HashtagSuggestions({
  hashtags,
  onAddHashtag,
  onRemoveHashtag,
  selectedHashtags,
}: HashtagSuggestionsProps) {
  if (hashtags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <label className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Suggested Hashtags
      </label>
      <div className="flex flex-wrap gap-2.5">
        {hashtags.map((hashtag) => {
          const isSelected = selectedHashtags.includes(hashtag);
          return (
            <button
              key={hashtag}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onRemoveHashtag(hashtag);
                } else {
                  onAddHashtag(hashtag);
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
              }`}
            >
              #{hashtag}
            </button>
          );
        })}
      </div>
      {selectedHashtags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Selected hashtags ({selectedHashtags.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map((hashtag) => (
              <span
                key={hashtag}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
              >
                #{hashtag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

