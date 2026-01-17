import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { TrendingPostsSearchParams, TrendingPost } from '@/types';
import { 
  searchTrendingPosts, 
  parseLinkedInPostResponse, 
  calculateEngagementSummary 
} from '@/lib/trending-posts';
import { 
  getCachedTrendingPosts, 
  saveTrendingPostsCache,
  ensureTrendingPostsCacheTable,
  deleteCachedTrendingPosts
} from '@/lib/db';
import { logger } from '@/lib/utils/logger';

const RAPIDAPI_HOST = 'linkedin-api-data.p.rapidapi.com';

interface RapidAPIResponse {
  success: boolean;
  code: number;
  message: string;
  data?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: TrendingPostsSearchParams = await request.json();
    const { query, limit = 10, offsite = 0, minEngagement = 0 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Ensure cache table exists
    await ensureTrendingPostsCacheTable();

    // Create cache key
    const cacheKey = `${query}:${limit}:${offsite}:${minEngagement}`;

    // Check cache first
    const cached = await getCachedTrendingPosts(cacheKey);
    if (cached && 'posts_data' in cached && cached.posts_data) {
      // Handle both JSONB string and already parsed object
      let postsData: TrendingPost[];
      const postsDataValue = (cached as any).posts_data;
      if (typeof postsDataValue === 'string') {
        try {
          postsData = JSON.parse(postsDataValue);
        } catch (e) {
          logger.error('[Trending Posts API] Error parsing cached posts_data:', e);
          postsData = [];
        }
      } else if (Array.isArray(postsDataValue)) {
        postsData = postsDataValue;
      } else {
        postsData = [];
      }
      
      // If cached data is empty, treat as cache miss and fetch fresh data
      if (!postsData || postsData.length === 0) {
        // Delete the empty cache entry so we don't hit it again
        await deleteCachedTrendingPosts(cacheKey);
        // Continue to API call below
      } else {
        // Sort by engagement (most engaged first) before filtering
        const sortedPostsData = [...postsData].sort((a, b) => {
          return b.engagement.totalReactions - a.engagement.totalReactions;
        });
        
        // Cache has valid data, return it
        const filteredPosts = minEngagement > 0
          ? sortedPostsData.filter(p => p.engagement.totalReactions >= minEngagement)
          : sortedPostsData;

        return NextResponse.json({
          posts: filteredPosts,
          totalResults: postsData.length,
          cached: true,
          cacheExpiresAt: (cached as any).expires_at,
        });
      }
    }

    // Cache miss - make API call
    // Note: This requires RAPIDAPI_KEY environment variable
    // If using MCP instead, this would need to be called differently
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
      return NextResponse.json(
        { 
          error: 'RapidAPI key not configured. Please set RAPIDAPI_KEY environment variable.',
          posts: [],
          totalResults: 0,
          cached: false,
        },
        { status: 503 }
      );
    }

    // Build path with query parameters
    const path = `/post/search?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}&offsite=${offsite}`;

    // Make API call using https module
    const apiData = await new Promise<RapidAPIResponse>((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: RAPIDAPI_HOST,
        port: null,
        path: path,
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': RAPIDAPI_HOST,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, function (res) {
        const chunks: Buffer[] = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', function () {
          const body = Buffer.concat(chunks);
          const bodyString = body.toString();
          
          try {
            const data = JSON.parse(bodyString);
            
            // Handle rate limiting
            if (res.statusCode === 429) {
              reject(new Error('Rate limit reached'));
              return;
            }
            
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(data.message || `API error: ${res.statusCode}`));
              return;
            }
            
            resolve(data);
          } catch (error) {
            logger.error('[Trending Posts API] Parse error:', error);
            logger.error('[Trending Posts API] Failed to parse body:', bodyString.substring(0, 200));
            reject(new Error('Failed to parse API response'));
          }
        });
      });

      req.on('error', function (error) {
        logger.error('[Trending Posts API] Request error:', error);
        reject(error);
      });

      req.end();
    }).catch(async (error) => {
      // If rate limited, try to return cached data even if expired
      if (error.message === 'Rate limit reached') {
        const expiredCache = await getCachedTrendingPosts(cacheKey.replace(/\d+$/, '0'));
        if (expiredCache && 'posts_data' in expiredCache) {
          const posts = (expiredCache as any).posts_data as TrendingPost[];
          return {
            success: true,
            code: 200,
            message: 'Using cached data',
            cachedFallback: true,
            posts: posts || [],
            totalResults: Array.isArray(posts) ? posts.length : 0,
            cacheExpiresAt: (expiredCache as any).expires_at,
          } as any;
        }
      }
      throw error;
    });

    // Handle cached fallback
    if ((apiData as any).cachedFallback) {
      return NextResponse.json({
        posts: (apiData as any).posts,
        totalResults: (apiData as any).totalResults,
        cached: true,
        cacheExpiresAt: (apiData as any).cacheExpiresAt,
        warning: 'Rate limit reached. Showing cached results.',
      });
    }

    if (!apiData.success || !apiData.data) {
      throw new Error(apiData.message || 'Invalid API response');
    }

    // Parse the response
    const posts = parseLinkedInPostResponse(apiData);
    
    // Sort by engagement (most engaged first) - by totalReactions descending
    const sortedPosts = [...posts].sort((a, b) => {
      return b.engagement.totalReactions - a.engagement.totalReactions;
    });
    
    // Filter by minimum engagement
    const filteredPosts = minEngagement > 0
      ? sortedPosts.filter(p => p.engagement.totalReactions >= minEngagement)
      : sortedPosts;

    // Calculate engagement summary
    const engagementSummary = calculateEngagementSummary(filteredPosts);

    // Save to cache (use longer expiration for popular searches)
    const expirationHours = posts.length > 0 ? 24 : 6;
    await saveTrendingPostsCache(
      cacheKey,
      filteredPosts,
      engagementSummary,
      expirationHours
    );

    const totalResults = apiData.data?.paging?.total || filteredPosts.length;

    return NextResponse.json({
      posts: filteredPosts,
      totalResults,
      cached: false,
      engagementSummary,
    });
  } catch (error) {
    logger.error('[Trending Posts API] Error searching trending posts:', error);
    logger.error('[Trending Posts API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to search trending posts';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        posts: [],
        totalResults: 0,
        cached: false,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check cache status or get API usage info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({
        message: 'Use POST to search trending posts',
        cacheEnabled: true,
      });
    }

    // Check cache for this query
    const cacheKey = `${query}:10:0:0`;
    const cached = await getCachedTrendingPosts(cacheKey);

    return NextResponse.json({
      cached: !!cached,
      cacheExpiresAt: (cached && 'expires_at' in cached) ? (cached as any).expires_at : null,
      message: cached ? 'Results are cached' : 'No cached results found',
    });
  } catch (error) {
    logger.error('Error checking cache:', error);
    return NextResponse.json(
      { error: 'Failed to check cache' },
      { status: 500 }
    );
  }
}
