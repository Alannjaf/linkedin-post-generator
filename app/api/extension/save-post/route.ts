import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Initialize Neon client
function getDb() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
    }
    return neon(databaseUrl);
}

// Ensure swipe_file table exists
async function ensureSwipeFileTable() {
    const sql = getDb();
    await sql`
    CREATE TABLE IF NOT EXISTS swipe_file_posts (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      author_name VARCHAR(255),
      author_profile_url TEXT,
      post_url TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      notes TEXT
    )
  `;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, author, engagement, postUrl } = body;

        if (!content) {
            return NextResponse.json(
                { error: 'Post content is required' },
                { status: 400 }
            );
        }

        await ensureSwipeFileTable();
        const sql = getDb();

        // Check if post already exists (by content hash or URL)
        const existing = await sql`
      SELECT id FROM swipe_file_posts 
      WHERE post_url = ${postUrl || ''} 
      LIMIT 1
    `;

        if (existing.length > 0) {
            return NextResponse.json(
                { message: 'Post already saved', id: existing[0].id },
                { status: 200 }
            );
        }

        // Insert new post
        const result = await sql`
      INSERT INTO swipe_file_posts (
        content, 
        author_name, 
        author_profile_url, 
        post_url, 
        likes, 
        comments, 
        saved_at
      ) VALUES (
        ${content},
        ${author?.name || 'Unknown'},
        ${author?.profileUrl || ''},
        ${postUrl || ''},
        ${engagement?.likes || 0},
        ${engagement?.comments || 0},
        NOW()
      )
      RETURNING id
    `;

        return NextResponse.json({
            success: true,
            id: result[0].id,
            message: 'Post saved to swipe file',
        });
    } catch (error) {
        console.error('[Extension API] Failed to save post:', error);
        return NextResponse.json(
            { error: 'Failed to save post' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await ensureSwipeFileTable();
        const sql = getDb();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const posts = await sql`
      SELECT * FROM swipe_file_posts 
      ORDER BY saved_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

        const countResult = await sql`SELECT COUNT(*) as total FROM swipe_file_posts`;
        const total = parseInt(countResult[0].total);

        return NextResponse.json({
            posts,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + posts.length < total,
            },
        });
    } catch (error) {
        console.error('[Extension API] Failed to get posts:', error);
        return NextResponse.json(
            { error: 'Failed to get posts' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Post ID is required' },
                { status: 400 }
            );
        }

        const sql = getDb();
        await sql`DELETE FROM swipe_file_posts WHERE id = ${parseInt(id)}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Extension API] Failed to delete post:', error);
        return NextResponse.json(
            { error: 'Failed to delete post' },
            { status: 500 }
        );
    }
}
