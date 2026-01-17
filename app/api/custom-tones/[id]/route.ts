import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomTone,
  updateCustomTone,
  deleteCustomTone,
} from '@/lib/db';
import { UpdateCustomToneRequest } from '@/types';

// GET /api/custom-tones/[id] - Get a specific custom tone
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid tone ID' },
        { status: 400 }
      );
    }

    const tone = await getCustomTone(id);
    
    if (!tone) {
      return NextResponse.json(
        { error: 'Custom tone not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tone);
  } catch (error) {
    console.error('Error fetching custom tone:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch custom tone';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT /api/custom-tones/[id] - Update a custom tone
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid tone ID' },
        { status: 400 }
      );
    }

    const body: UpdateCustomToneRequest = await request.json();
    const { name, descriptionEnglish, descriptionKurdish, industry, toneMix } = body;

    const updatedTone = await updateCustomTone(id, {
      name,
      descriptionEnglish,
      descriptionKurdish,
      industry,
      toneMix,
    });

    if (!updatedTone) {
      return NextResponse.json(
        { error: 'Custom tone not found or failed to update' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTone);
  } catch (error) {
    console.error('Error updating custom tone:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update custom tone';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/custom-tones/[id] - Delete a custom tone
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid tone ID' },
        { status: 400 }
      );
    }

    await deleteCustomTone(id);
    return NextResponse.json({ message: 'Custom tone deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom tone:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete custom tone';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
