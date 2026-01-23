import { NextResponse } from 'next/server';

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { key, message, data } = body;

        // Simple verification (optional, but good practice)
        // if (key !== 'debug_secret') ... 

        return NextResponse.json({ success: true }, { headers: corsHeaders() });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to log' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
