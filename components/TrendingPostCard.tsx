'use client';

import { TrendingPost } from '@/types';

interface TrendingPostCardProps {
  post: TrendingPost;
  onUseAsInspiration?: (post: TrendingPost) => void;
  onSavePost?: (post: TrendingPost) => void;
  isSaved?: boolean;
}

export default function TrendingPostCard({ post, onUseAsInspiration, onSavePost, isSaved }: TrendingPostCardProps) {
  const formatTime = (timeStr: string) => {
    // Extract time info from strings like "2d •" or "4d •"
    return timeStr.trim() || 'Recently';
  };

  const getPostTypeBadge = (type: string) => {
    const badges = {
      text: { label: 'Text', color: 'bg-blue-50 text-blue-700' },
      poll: { label: 'Poll', color: 'bg-purple-50 text-purple-700' },
      video: { label: 'Video', color: 'bg-red-50 text-red-700' },
      image: { label: 'Image', color: 'bg-green-50 text-green-700' },
    };
    return badges[type as keyof typeof badges] || badges.text;
  };

  const typeBadge = getPostTypeBadge(post.postType);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={post.author.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {post.author.name}
            </a>
            {post.author.company && (
              <span className="text-xs text-gray-500">• {post.author.company}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{formatTime(post.postedAt)}</span>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: typeBadge.color.split(' ')[0], color: typeBadge.color.split(' ')[1] }}>
              {typeBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 line-clamp-4 leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.hashtags.slice(0, 5).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
          {post.hashtags.length > 5 && (
            <span className="px-2 py-0.5 text-gray-400 text-xs">
              +{post.hashtags.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Engagement Metrics */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a1 1 0 001.8.6l2.7-3.6-2.7-3.6a1 1 0 00-1.8.6zM12.33 8.923a.75.75 0 00-1.06 0l-2.83 2.83a.75.75 0 001.06 1.06l2.83-2.83a.75.75 0 000-1.06zM14.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 8.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6z" />
            </svg>
            <span className="font-semibold">{post.engagement.likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-semibold">{post.engagement.comments}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="font-semibold">{post.engagement.shares}</span>
          </div>
          <div className="text-gray-500">
            {post.engagement.totalReactions} total
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View on LinkedIn
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {onSavePost && (
            <button
              type="button"
              onClick={() => onSavePost(post)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium flex items-center gap-1 ${
                isSaved
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isSaved ? 'Saved' : 'Save for later'}
            >
              {isSaved ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save
                </>
              )}
            </button>
          )}
          {onUseAsInspiration && (
            <button
              type="button"
              onClick={() => onUseAsInspiration(post)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Use as Inspiration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
