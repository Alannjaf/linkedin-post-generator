import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCustomTones,
  getIndustryPresets,
  createCustomTone,
  seedIndustryPresets,
  ensureCustomTonesTable,
} from '@/lib/db';
import { CreateCustomToneRequest } from '@/types';

// GET /api/custom-tones - List all custom tones and presets
export async function GET(request: NextRequest) {
  try {
    // Ensure table exists (will auto-seed presets on first creation)
    await ensureCustomTonesTable();
    
    const { searchParams } = new URL(request.url);
    const includePresets = searchParams.get('includePresets') === 'true';
    const industry = searchParams.get('industry');

    if (industry) {
      // Get industry-specific presets
      const presets = await getIndustryPresets(industry);
      return NextResponse.json(presets);
    }

    // Get all custom tones (optionally including presets)
    const tones = await getAllCustomTones(includePresets);
    return NextResponse.json(tones);
  } catch (error) {
    console.error('Error fetching custom tones:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch custom tones';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/custom-tones - Create a new custom tone
export async function POST(request: NextRequest) {
  try {
    // Ensure table exists
    await ensureCustomTonesTable();
    
    const body: CreateCustomToneRequest = await request.json();
    const { name, descriptionEnglish, descriptionKurdish, industry, toneMix } = body;

    if (!name || !descriptionEnglish || !descriptionKurdish) {
      return NextResponse.json(
        { error: 'Missing required fields: name, descriptionEnglish, descriptionKurdish' },
        { status: 400 }
      );
    }

    const customTone = await createCustomTone({
      name,
      descriptionEnglish,
      descriptionKurdish,
      industry,
      toneMix,
      isPreset: false,
    });

    if (!customTone) {
      return NextResponse.json(
        { error: 'Failed to create custom tone' },
        { status: 500 }
      );
    }

    return NextResponse.json(customTone, { status: 201 });
  } catch (error) {
    console.error('Error creating custom tone:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create custom tone';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/custom-tones/seed - Seed industry presets (admin endpoint)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'seed') {
      await seedIndustryPresets();
      return NextResponse.json({ message: 'Industry presets seeded successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error seeding presets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to seed presets';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
