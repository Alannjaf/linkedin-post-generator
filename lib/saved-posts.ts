import { TrendingPost, SavedTrendingPost } from '@/types';

const API_BASE = '/api/saved-posts';

export async function savePost(post: TrendingPost, notes?: string): Promise<SavedTrendingPost> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post, notes }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save post');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to save post:', error);
    throw error instanceof Error ? error : new Error('Failed to save post');
  }
}

export async function getAllSavedPosts(): Promise<SavedTrendingPost[]> {
  try {
    const response = await fetch(API_BASE);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load saved posts');
    }

    const savedPosts = await response.json();
    return savedPosts || [];
  } catch (error) {
    console.error('Failed to load saved posts:', error);
    return [];
  }
}

export async function deleteSavedPost(postId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/${postId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete post');
    }

    return true;
  } catch (error) {
    console.error('Failed to delete saved post:', error);
    return false;
  }
}
