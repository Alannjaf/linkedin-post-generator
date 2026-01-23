import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { Draft } from '@/types';

// GET /api/drafts - List all drafts with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM drafts
    `;
    const countArray = countResult as Array<{ total: number | string }>;
    const total = parseInt(String(countArray[0]?.total || '0'), 10);

    // Get paginated drafts
    const drafts = await sql`
      SELECT 
        id,
        title,
        content,
        language,
        tone,
        length,
        hashtags,
        generated_image as "generatedImage",
        image_prompt as "imagePrompt",
        edited_image_prompt as "editedImagePrompt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM drafts
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return NextResponse.json({
      drafts: drafts as Draft[],
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch drafts';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/drafts - Create a new draft
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, language, tone, length, hashtags, generatedImage, imagePrompt, editedImagePrompt } = body;

    if (!title || !content || !language || !tone || !length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO drafts (
        title,
        content,
        language,
        tone,
        length,
        hashtags,
        generated_image,
        image_prompt,
        edited_image_prompt
      ) VALUES (
        ${title},
        ${content},
        ${language},
        ${tone},
        ${length},
        ${JSON.stringify(hashtags || [])}::jsonb,
        ${generatedImage || null},
        ${imagePrompt || null},
        ${editedImagePrompt || null}
      )
      RETURNING 
        id,
        title,
        content,
        language,
        tone,
        length,
        hashtags,
        generated_image as "generatedImage",
        image_prompt as "imagePrompt",
        edited_image_prompt as "editedImagePrompt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const drafts = result as Draft[];
    return NextResponse.json(drafts[0], { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create draft';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

