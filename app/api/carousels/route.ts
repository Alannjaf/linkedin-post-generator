import { NextRequest, NextResponse } from 'next/server';
import { saveCarousel, getAllCarousels, deleteCarousel, updateCarouselSlideImage } from '@/lib/db';
import { logger } from '@/lib/utils/logger';

export async function GET() {
    try {
        const carousels = await getAllCarousels();
        return NextResponse.json({ carousels });
    } catch (error) {
        logger.error('Error fetching carousels:', error);
        return NextResponse.json(
            { error: 'Failed to fetch carousels' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            title,
            sourceContent,
            slides,
            totalSlides,
            introduction,
            conclusion,
            hashtags,
            imageTheme,
            brandingGuidelines,
            language,
            tone,
            slideImages
        } = body;

        if (!title || !sourceContent || !slides || !language || !tone) {
            return NextResponse.json(
                { error: 'Missing required fields: title, sourceContent, slides, language, tone' },
                { status: 400 }
            );
        }

        const carousel = await saveCarousel({
            title,
            sourceContent,
            slides,
            totalSlides: totalSlides || slides.length,
            introduction,
            conclusion,
            hashtags: hashtags || [],
            imageTheme,
            brandingGuidelines,
            language,
            tone,
            slideImages,
        });

        return NextResponse.json({ carousel });
    } catch (error) {
        logger.error('Error saving carousel:', error);
        return NextResponse.json(
            { error: 'Failed to save carousel' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { carouselId, slideNumber, imageUrl } = body;

        if (!carouselId || slideNumber === undefined || !imageUrl) {
            return NextResponse.json(
                { error: 'Missing required fields: carouselId, slideNumber, imageUrl' },
                { status: 400 }
            );
        }

        await updateCarouselSlideImage(carouselId, slideNumber, imageUrl);
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error updating carousel slide image:', error);
        return NextResponse.json(
            { error: 'Failed to update carousel slide image' },
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

        await deleteCarousel(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error deleting carousel:', error);
        return NextResponse.json(
            { error: 'Failed to delete carousel' },
            { status: 500 }
        );
    }
}
