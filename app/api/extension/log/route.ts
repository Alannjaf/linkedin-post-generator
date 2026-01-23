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

        const timestamp = new Date().toLocaleTimeString();
        console.log(`\x1b[36m[EXT-DEBUG ${timestamp}]\x1b[0m ${message}`);
        if (data) {
            // limit data size if needed, or pretty print
            if (typeof data === 'object') {
                console.log(JSON.stringify(data, null, 2));
            } else {
                console.log(data);
            }
        }

        return NextResponse.json({ success: true }, { headers: corsHeaders() });
    } catch (error) {
        console.error('Logging error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to log' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
