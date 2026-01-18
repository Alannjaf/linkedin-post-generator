import { NextRequest, NextResponse } from 'next/server';
import { saveAdaptedPost, getAllAdaptedPosts, deleteAdaptedPost } from '@/lib/db';
import { logger } from '@/lib/utils/logger';

export async function GET() {
    try {
        const posts = await getAllAdaptedPosts();
        return NextResponse.json({ posts });
    } catch (error) {
        logger.error('Error fetching adapted posts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch adapted posts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sourceContent, platform, adaptedContent, characterCount, changes, language } = body;

        if (!sourceContent || !platform || !adaptedContent || !language) {
            return NextResponse.json(
                { error: 'Missing required fields: sourceContent, platform, adaptedContent, language' },
                { status: 400 }
            );
        }

        const post = await saveAdaptedPost({
            sourceContent,
            platform,
            adaptedContent,
            characterCount: characterCount || adaptedContent.length,
            changes: changes || [],
            language,
        });

        return NextResponse.json({ post });
    } catch (error) {
        logger.error('Error saving adapted post:', error);
        return NextResponse.json(
            { error: 'Failed to save adapted post' },
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
                { error: 'Missing required parameter: id' },
                { status: 400 }
            );
        }

        await deleteAdaptedPost(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error deleting adapted post:', error);
        return NextResponse.json(
            { error: 'Failed to delete adapted post' },
            { status: 500 }
        );
    }
}
