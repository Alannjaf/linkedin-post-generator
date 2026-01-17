import { TrendingPost, TrendingPostsSearchParams, LinkedInAPIResponse, LinkedInAPIPostItem, TrendingPostsCacheRow } from '@/types';
import { getCachedTrendingPosts, saveTrendingPostsCache, ensureTrendingPostsCacheTable } from './db';

// Extract hashtags from post content
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([\w\u0600-\u06FF]+)/g;
  const matches = Array.from(text.matchAll(hashtagRegex));
  return matches.map(match => match[1]).filter(tag => tag.length > 0);
}

// Determine post type from LinkedIn API response
type UpdateType = NonNullable<NonNullable<NonNullable<NonNullable<LinkedInAPIPostItem['item']>['searchFeedUpdate']>['update']>>;
function getPostType(update: UpdateType | undefined): 'text' | 'poll' | 'video' | 'image' {
  if (update?.content?.pollComponent) return 'poll';
  if (update?.content?.linkedInVideoComponent) return 'video';
  if (update?.content?.imageComponent) return 'image';
  return 'text';
}

// Parse LinkedIn API response into TrendingPost format
export function parseLinkedInPostResponse(data: LinkedInAPIResponse): TrendingPost[] {
  if (!data?.data?.elements || !Array.isArray(data.data.elements)) {
    return [];
  }

  const posts: TrendingPost[] = [];

  for (const element of data.data.elements) {
    if (!element.items || !Array.isArray(element.items)) {
      continue;
    }

    for (const itemWrapper of element.items) {
      const item = itemWrapper.item?.searchFeedUpdate;
      if (!item) {
        continue;
      }
      
      const update = item.update;
      // socialDetail and actor are inside update, not at item level
      const socialDetail = update?.socialDetail;
      const actor = update?.actor;
      const commentary = update?.commentary;

      if (!socialDetail || !actor || !commentary) {
        continue;
      }

      // Extract content
      const content = commentary.text?.text || '';
      if (!content) {
        continue;
      }

      // Extract engagement metrics
      const activityCounts = socialDetail.totalSocialActivityCounts || {};
      const reactionTypeCounts = activityCounts.reactionTypeCounts || [];
      
      const totalReactions = reactionTypeCounts.reduce(
        (sum: number, r) => sum + (r.count || 0),
        0
      );

      // Extract author info
      const authorName = actor.name?.text || 'Unknown';
      const profileUrl = actor.navigationContext?.actionTarget || '';
      const company = actor.supplementaryActorInfo?.text || 
                     (actor.description?.text?.includes('followers') ? actor.name?.text : undefined);

      // Extract post URL - check both item.socialContent and update.socialContent
      const postUrl = update?.socialContent?.shareUrl || 
                     item.socialContent?.shareUrl ||
                     `https://www.linkedin.com/feed/update/${update.backendUrn?.replace('urn:li:activity:', '')}`;

      // Extract posted time
      const postedAt = actor.subDescription?.text || '';

      // Extract hashtags
      const hashtags = extractHashtags(content);

      // Determine post type
      const postType = getPostType(update);

      // Generate unique ID from entity URN
      const postId = update.backendUrn || 
                    update.shareUrn?.replace('urn:li:share:', '') ||
                    `post-${Date.now()}-${Math.random()}`;

      const post: TrendingPost = {
        id: postId,
        content: content.trim(),
        author: {
          name: authorName,
          profileUrl,
          company: company !== authorName ? company : undefined,
        },
        engagement: {
          likes: activityCounts.numLikes || 0,
          comments: activityCounts.numComments || 0,
          shares: activityCounts.numShares || 0,
          totalReactions,
          reactionBreakdown: reactionTypeCounts.map((r) => ({
            type: r.reactionType || 'UNKNOWN',
            count: r.count || 0,
          })),
        },
        postUrl,
        postedAt,
        postType,
        hashtags,
      };

      posts.push(post);
    }
  }

  return posts;
}

// Calculate engagement summary from posts
export function calculateEngagementSummary(posts: TrendingPost[]) {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      avgLikes: 0,
      avgComments: 0,
      avgShares: 0,
      avgTotalEngagement: 0,
      totalHashtags: {},
      postTypeDistribution: {},
    };
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.engagement.likes, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.engagement.comments, 0);
  const totalShares = posts.reduce((sum, p) => sum + p.engagement.shares, 0);
  const totalEngagement = posts.reduce((sum, p) => sum + p.engagement.totalReactions, 0);

  // Count hashtags
  const hashtagCounts: Record<string, number> = {};
  posts.forEach(post => {
    post.hashtags.forEach(tag => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    });
  });

  // Count post types
  const postTypeCounts: Record<string, number> = {};
  posts.forEach(post => {
    postTypeCounts[post.postType] = (postTypeCounts[post.postType] || 0) + 1;
  });

  return {
    totalPosts: posts.length,
    avgLikes: Math.round(totalLikes / posts.length),
    avgComments: Math.round(totalComments / posts.length),
    avgShares: Math.round(totalShares / posts.length),
    avgTotalEngagement: Math.round(totalEngagement / posts.length),
    totalHashtags: hashtagCounts,
    postTypeDistribution: postTypeCounts,
  };
}

// Search trending posts with caching
export async function searchTrendingPosts(
  params: TrendingPostsSearchParams
): Promise<{ posts: TrendingPost[]; totalResults: number; cached: boolean; cacheExpiresAt?: string }> {
  const { query, limit = 10, offsite = 0, minEngagement = 0 } = params;
  
  // Ensure cache table exists
  await ensureTrendingPostsCacheTable();

  // Create cache key including pagination and filters
  const cacheKey = `${query}:${limit}:${offsite}:${minEngagement}`;

  // Check cache first
  const cached = await getCachedTrendingPosts(cacheKey);
  if (cached) {
    // Handle both JSONB string and already parsed object
    let postsData: TrendingPost[];
    const postsDataValue = cached.posts_data;
    if (typeof postsDataValue === 'string') {
      try {
        postsData = JSON.parse(postsDataValue);
      } catch (e) {
        postsData = [];
      }
    } else if (Array.isArray(postsDataValue)) {
      postsData = postsDataValue;
    } else {
      postsData = [];
    }

    if (postsData.length > 0) {
      const filteredPosts = minEngagement > 0
        ? postsData.filter(p => p.engagement.totalReactions >= minEngagement)
        : postsData;

      return {
        posts: filteredPosts,
        totalResults: postsData.length,
        cached: true,
        cacheExpiresAt: cached.expires_at,
      };
    }
  }

  // Cache miss - would need to call API here
  // For now, return empty (API call will be made in the route handler)
  return {
    posts: [],
    totalResults: 0,
    cached: false,
  };
}
