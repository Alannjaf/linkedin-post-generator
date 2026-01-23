'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SwipePostCard from '@/components/SwipePostCard';
import { SwipeFilePost } from '@/types';
import ThemeToggle from '@/components/ThemeToggle'; // Assuming we want the theme toggle

export default function SwipeFilePage() {
    const router = useRouter();
    const [posts, setPosts] = useState<SwipeFilePost[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const limit = 24; // 3 columns * 8 rows roughly

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setOffset(0); // Reset pagination on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchPosts = useCallback(async (isLoadMore = false) => {
        try {
            setLoading(true);
            const currentOffset = isLoadMore ? offset : 0;

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: currentOffset.toString(),
                search: debouncedSearch
            });

            const res = await fetch(`/api/extension/save-post?${params.toString()}`);
            const data = await res.json();

            if (data.posts) {
                if (isLoadMore) {
                    setPosts(prev => [...prev, ...data.posts]);
                    setOffset(prev => prev + data.posts.length);
                } else {
                    setPosts(data.posts);
                    setOffset(data.posts.length);
                }
                setHasMore(data.pagination?.hasMore || false);
            }
        } catch (error) {
            // Failed to fetch swipe file posts
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, offset]);

    // Initial load and search changes
    useEffect(() => {
        // Reset posts when search changes (handled by debounced effect setting offset=0)
        // But we need to call fetch.
        // Actually, simpler logic:
        // When debouncedSearch changes, we reset everything and fetch.
        fetchPosts(false);
    }, [debouncedSearch]);


    const handleLoadMore = () => {
        fetchPosts(true);
    };

    const handleRemix = (post: SwipeFilePost) => {
        const context = `Remix this post by ${post.author_name}:\n\n${post.content}`;
        router.push(`/?context=${encodeURIComponent(context)}`);
    };

    const handleDelete = async (post: SwipeFilePost) => {
        if (deletingId) return;
        setDeletingId(post.id);
        try {
            const res = await fetch(`/api/extension/save-post?id=${post.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== post.id));
            }
        } catch (error) {
            alert('Failed to delete post');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Header */}
                <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all text-gray-600 dark:text-gray-300"
                                title="Back to Generator"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Swipe File</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            Your collection of saved LinkedIn posts for inspiration.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Content Grid */}
                {loading && posts.length === 0 ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No saved posts found</h3>
                        {search ? (
                            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search terms.</p>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                Use the browser extension to save posts from LinkedIn, and they will appear here.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map((post) => (
                                <div key={post.id} className="h-full">
                                    <SwipePostCard
                                        post={post}
                                        onRemix={handleRemix}
                                        onDelete={handleDelete}
                                        isDeleting={deletingId === post.id}
                                    />
                                </div>
                            ))}
                        </div>

                        {hasMore && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                    className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-gray-600 dark:text-gray-300 hover:shadow-md hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium disabled:opacity-50"
                                >
                                    {loading ? 'Loading...' : 'Load More Posts'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
