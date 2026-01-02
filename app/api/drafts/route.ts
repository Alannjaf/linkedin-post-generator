import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { Draft } from '@/types';

// GET /api/drafts - List all drafts
export async function GET() {
  try {
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
      LIMIT 50
    `;

    return NextResponse.json(drafts as Draft[]);
  } catch (error) {
    console.error('Error fetching drafts:', error);
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
    console.error('Error creating draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create draft';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

