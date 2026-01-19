import { NextRequest, NextResponse } from 'next/server';
import { deleteSavedTrendingPost, ensureSavedTrendingPostsTable } from '@/lib/db';

// DELETE /api/saved-posts/[id] - Delete a saved post by post_id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    await ensureSavedTrendingPostsTable();
    await deleteSavedTrendingPost(postId);

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete post';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}