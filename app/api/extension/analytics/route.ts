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

// CORS headers Helper
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

// Handle OPTIONS preflight
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

// Ensure analytics tables exist
async function ensureAnalyticsTables() {
    const sql = getDb();

    // Follower history table
    await sql`
    CREATE TABLE IF NOT EXISTS follower_history (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      count INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

    // Post analytics table
    await sql`
    CREATE TABLE IF NOT EXISTS post_analytics (
      id SERIAL PRIMARY KEY,
      post_url TEXT UNIQUE,
      content TEXT,
      impressions INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      engagement_rate DECIMAL(5,2),
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, data } = body;

        await ensureAnalyticsTables();
        const sql = getDb();

        if (type === 'follower_history') {
            // Bulk insert/update follower history
            for (const entry of data) {
                await sql`
          INSERT INTO follower_history (date, count)
          VALUES (${entry.date}, ${entry.count})
          ON CONFLICT (date) DO UPDATE SET count = ${entry.count}
        `;
            }

            return NextResponse.json({
                success: true,
                message: `Synced ${data.length} follower entries`,
            }, { headers: corsHeaders() });
        }

        if (type === 'post_analytics') {
            // Insert/update post analytics
            const { postUrl, content, impressions, likes, comments, shares } = data;

            const engagementRate = impressions > 0
                ? ((likes + comments + shares) / impressions * 100).toFixed(2)
                : 0;

            await sql`
        INSERT INTO post_analytics (post_url, content, impressions, likes, comments, shares, engagement_rate)
        VALUES (${postUrl}, ${content}, ${impressions}, ${likes}, ${comments}, ${shares}, ${engagementRate})
        ON CONFLICT (post_url) DO UPDATE SET
          impressions = ${impressions},
          likes = ${likes},
          comments = ${comments},
          shares = ${shares},
          engagement_rate = ${engagementRate},
          recorded_at = NOW()
      `;

            return NextResponse.json({ success: true }, { headers: corsHeaders() });
        }

        return NextResponse.json(
            { error: 'Invalid analytics type' },
            { status: 400, headers: corsHeaders() }
        );
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to save analytics' },
            { status: 500, headers: corsHeaders() }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await ensureAnalyticsTables();
        const sql = getDb();

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'summary';

        function formatDate(date: Date) {
            if (!dateFormat) {
                // Use Intl.DateTimeFormat for safer date formatting without external libraries
                dateFormat = new Intl.DateTimeFormat('en-CA'); // YYYY-MM-DD
            }
            return dateFormat.format(date);
        }
        let dateFormat: Intl.DateTimeFormat;

        if (type === 'followers') {
            const history = await sql`
        SELECT date, count FROM follower_history 
        ORDER BY date DESC 
        LIMIT 90
      `;

            return NextResponse.json({ history }, { headers: corsHeaders() });
        }

        if (type === 'posts') {
            const posts = await sql`
        SELECT * FROM post_analytics 
        ORDER BY recorded_at DESC 
        LIMIT 50
      `;

            return NextResponse.json({ posts }, { headers: corsHeaders() });
        }

        // Summary
        const followerHistory = await sql`
      SELECT date, count FROM follower_history 
      ORDER BY date DESC 
      LIMIT 30
    `;

        const postStats = await sql`
      SELECT 
        COUNT(*) as total_posts,
        COALESCE(AVG(likes), 0) as avg_likes,
        COALESCE(AVG(comments), 0) as avg_comments,
        COALESCE(AVG(engagement_rate), 0) as avg_engagement
      FROM post_analytics
    `;

        const topPosts = await sql`
      SELECT * FROM post_analytics 
      ORDER BY (likes + comments) DESC 
      LIMIT 5
    `;

        return NextResponse.json({
            followers: {
                history: followerHistory,
                current: followerHistory[0]?.count || 0,
                growth: followerHistory.length >= 2
                    ? followerHistory[0].count - followerHistory[followerHistory.length - 1].count
                    : 0,
            },
            posts: {
                total: parseInt(postStats[0]?.total_posts || 0),
                avgLikes: parseFloat(postStats[0]?.avg_likes || 0),
                avgComments: parseFloat(postStats[0]?.avg_comments || 0),
                avgEngagement: parseFloat(postStats[0]?.avg_engagement || 0),
                top: topPosts,
            },
        }, { headers: corsHeaders() });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to get analytics' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
