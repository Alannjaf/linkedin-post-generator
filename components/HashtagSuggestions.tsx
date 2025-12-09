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
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Suggested Hashtags
      </label>
      <div className="flex flex-wrap gap-2">
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
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              #{hashtag}
            </button>
          );
        })}
      </div>
      {selectedHashtags.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Selected hashtags:</p>
          <div className="flex flex-wrap gap-1">
            {selectedHashtags.map((hashtag) => (
              <span
                key={hashtag}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
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

