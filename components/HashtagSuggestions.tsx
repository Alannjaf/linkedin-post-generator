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
      <label className="floating-label flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </span>
        Suggested Hashtags
      </label>

      <div className="flex flex-wrap gap-2.5">
        {hashtags.map((hashtag, index) => {
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
              className={`
                pill-badge transition-all duration-200
                ${isSelected ? 'active scale-105' : 'hover:border-[var(--accent-purple)] hover:text-[var(--text-primary)]'}
              `}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              #{hashtag}
              {isSelected && (
                <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Hashtags Display */}
      {selectedHashtags.length > 0 && (
        <div className="pt-4 border-t border-[var(--border-default)]">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Selected hashtags ({selectedHashtags.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map((hashtag) => (
              <span
                key={hashtag}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-[var(--text-primary)] rounded-lg text-sm font-medium border border-purple-500/30"
              >
                #{hashtag}
                <button
                  onClick={() => onRemoveHashtag(hashtag)}
                  className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
