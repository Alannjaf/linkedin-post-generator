import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { Draft } from '@/types';

// GET /api/drafts/[id] - Get a single draft
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
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
      WHERE id = ${id}
    `;

    const drafts = result as Draft[];
    if (drafts.length === 0) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json(drafts[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch draft';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT /api/drafts/[id] - Update a draft
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, language, tone, length, hashtags, generatedImage, imagePrompt, editedImagePrompt } = body;

    // First, get the current draft to merge with updates
    const currentResult = await sql`
      SELECT * FROM drafts WHERE id = ${id}
    `;

    const currentDrafts = currentResult as any[];
    if (currentDrafts.length === 0) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const current = currentDrafts[0];

    // Merge updates with current values
    const updatedTitle = title !== undefined ? title : current.title;
    const updatedContent = content !== undefined ? content : current.content;
    const updatedLanguage = language !== undefined ? language : current.language;
    const updatedTone = tone !== undefined ? tone : current.tone;
    const updatedLength = length !== undefined ? length : current.length;
    const updatedHashtags = hashtags !== undefined ? hashtags : current.hashtags;
    const updatedGeneratedImage = generatedImage !== undefined ? generatedImage : current.generated_image;
    const updatedImagePrompt = imagePrompt !== undefined ? imagePrompt : current.image_prompt;
    const updatedEditedImagePrompt = editedImagePrompt !== undefined ? editedImagePrompt : current.edited_image_prompt;

    const result = await sql`
      UPDATE drafts
      SET 
        title = ${updatedTitle},
        content = ${updatedContent},
        language = ${updatedLanguage},
        tone = ${updatedTone},
        length = ${updatedLength},
        hashtags = ${JSON.stringify(updatedHashtags)}::jsonb,
        generated_image = ${updatedGeneratedImage},
        image_prompt = ${updatedImagePrompt},
        edited_image_prompt = ${updatedEditedImagePrompt},
        updated_at = NOW()
      WHERE id = ${id}
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

    const updatedDrafts = result as Draft[];
    return NextResponse.json(updatedDrafts[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update draft';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/drafts/[id] - Delete a draft
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      DELETE FROM drafts
      WHERE id = ${id}
      RETURNING id
    `;

    const deletedDrafts = result as any[];
    if (deletedDrafts.length === 0) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete draft';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

