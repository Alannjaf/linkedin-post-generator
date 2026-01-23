'use client';

import { SwipeFilePost } from '@/types';

interface SwipePostCardProps {
    post: SwipeFilePost;
    onRemix: (post: SwipeFilePost) => void;
    onDelete: (post: SwipeFilePost) => void;
    isDeleting?: boolean;
}

export default function SwipePostCard({ post, onRemix, onDelete, isDeleting = false }: SwipePostCardProps) {

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            }).format(date);
        } catch (e) {
            return 'Recently';
        }
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 group flex flex-col h-full ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {post.author_profile_url ? (
                            <a
                                href={post.author_profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block max-w-full"
                            >
                                {post.author_name}
                            </a>
                        ) : (
                            <span className="font-semibold text-gray-900 truncate block max-w-full">
                                {post.author_name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Saved {formatDate(post.saved_at)}</span>
                    </div>
                </div>

                {/* Actions Dropdown or simple delete button for now */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this post?')) onDelete(post);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Delete from Swipe File"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="mb-4 flex-grow">
                <p className="text-sm text-gray-700 line-clamp-6 leading-relaxed whitespace-pre-line">
                    {post.content}
                </p>
            </div>

            {/* Footer: Stats & Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                    {/* Likes */}
                    <div className="flex items-center gap-1" title="Likes">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a1 1 0 001.8.6l2.7-3.6-2.7-3.6a1 1 0 00-1.8.6zM12.33 8.923a.75.75 0 00-1.06 0l-2.83 2.83a.75.75 0 001.06 1.06l2.83-2.83a.75.75 0 000-1.06zM14.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 8.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6z" />
                        </svg>
                        <span className="font-medium">{post.likes.toLocaleString()}</span>
                    </div>
                    {/* Comments */}
                    <div className="flex items-center gap-1" title="Comments">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-medium">{post.comments.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {post.post_url && (
                        <a
                            href={post.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Original"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    )}
                    <button
                        onClick={() => onRemix(post)}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-1 shadow-sm hover:shadow"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        Remix
                    </button>
                </div>
            </div>
        </div>
    );
}
