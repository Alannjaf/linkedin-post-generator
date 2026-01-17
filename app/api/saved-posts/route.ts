import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllSavedTrendingPosts, 
  saveTrendingPost,
  ensureSavedTrendingPostsTable 
} from '@/lib/db';
import { SavedTrendingPost, TrendingPost } from '@/types';

// GET /api/saved-posts - Get all saved posts
export async function GET() {
  try {
    await ensureSavedTrendingPostsTable();
    const result = await getAllSavedTrendingPosts();

    // Transform database result to SavedTrendingPost format
    const savedPosts: SavedTrendingPost[] = result.map((row: any) => ({
      id: row.id,
      postId: row.post_id,
      post: row.post_data as TrendingPost,
      savedAt: row.saved_at,
      notes: row.notes || undefined,
    }));

    return NextResponse.json(savedPosts);
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch saved posts';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/saved-posts - Save a trending post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post, notes } = body;

    if (!post || !post.id) {
      return NextResponse.json(
        { error: 'Post data is required' },
        { status: 400 }
      );
    }

    await ensureSavedTrendingPostsTable();
    const saved = await saveTrendingPost(post, notes);

    if (!saved) {
      throw new Error('Failed to save post');
    }

    const savedPost: SavedTrendingPost = {
      id: saved.id,
      postId: saved.post_id,
      post: saved.post_data as TrendingPost,
      savedAt: saved.saved_at,
      notes: saved.notes || undefined,
    };

    return NextResponse.json(savedPost, { status: 201 });
  } catch (error) {
    console.error('Error saving post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save post';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}