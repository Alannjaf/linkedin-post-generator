import { neon } from '@neondatabase/serverless';

let sqlInstance: any = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  if (!sqlInstance) {
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  
  return sqlInstance;
}

// Create a function that can be used as a tagged template literal
const sqlFunction = function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values);
};

// Add properties dynamically
Object.defineProperty(sqlFunction, 'query', {
  get() {
    return getSql().query;
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(sqlFunction, 'unsafe', {
  get() {
    return getSql().unsafe;
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(sqlFunction, 'transaction', {
  get() {
    return getSql().transaction;
  },
  enumerable: false,
  configurable: true,
});

export const sql = sqlFunction as ReturnType<typeof neon>;

// Initialize trending_posts_cache table if it doesn't exist
export async function ensureTrendingPostsCacheTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS trending_posts_cache (
        id SERIAL PRIMARY KEY,
        search_query TEXT NOT NULL,
        posts_data JSONB NOT NULL,
        engagement_summary JSONB,
        cached_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        UNIQUE(search_query)
      )
    `;
  } catch (error) {
    // Table might already exist, which is fine
    console.error('Error ensuring trending_posts_cache table:', error);
  }
}

// Get cached trending posts
export async function getCachedTrendingPosts(searchQuery: string) {
  try {
    const result = await sql`
      SELECT 
        search_query,
        posts_data,
        engagement_summary,
        cached_at,
        expires_at
      FROM trending_posts_cache
      WHERE search_query = ${searchQuery}
        AND expires_at > NOW()
      LIMIT 1
    `;
    
    const cached = Array.isArray(result) && result.length > 0 ? result[0] : null;
    
    return cached;
  } catch (error) {
    console.error('[DB Cache] Error getting cached trending posts:', error);
    return null;
  }
}

// Save trending posts to cache
export async function saveTrendingPostsCache(
  searchQuery: string,
  postsData: any,
  engagementSummary: any,
  expirationHours: number = 12
) {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);
    
    await sql`
      INSERT INTO trending_posts_cache (
        search_query,
        posts_data,
        engagement_summary,
        expires_at
      ) VALUES (
        ${searchQuery},
        ${JSON.stringify(postsData)}::jsonb,
        ${JSON.stringify(engagementSummary)}::jsonb,
        ${expiresAt.toISOString()}
      )
      ON CONFLICT (search_query) 
      DO UPDATE SET
        posts_data = ${JSON.stringify(postsData)}::jsonb,
        engagement_summary = ${JSON.stringify(engagementSummary)}::jsonb,
        cached_at = NOW(),
        expires_at = ${expiresAt.toISOString()}
    `;
  } catch (error) {
    console.error('Error saving trending posts cache:', error);
    throw error;
  }
}

// Clean up expired cache entries
export async function cleanupExpiredTrendingPostsCache() {
  try {
    await sql`
      DELETE FROM trending_posts_cache
      WHERE expires_at < NOW()
    `;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
  }
}

// Delete a specific cache entry by search query
export async function deleteCachedTrendingPosts(searchQuery: string) {
  try {
    await sql`
      DELETE FROM trending_posts_cache
      WHERE search_query = ${searchQuery}
    `;
  } catch (error) {
    console.error('[DB Cache] Error deleting cache entry:', error);
  }
}

// Initialize saved_trending_posts table if it doesn't exist
export async function ensureSavedTrendingPostsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS saved_trending_posts (
        id SERIAL PRIMARY KEY,
        post_id TEXT NOT NULL UNIQUE,
        post_data JSONB NOT NULL,
        saved_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `;
  } catch (error) {
    console.error('Error ensuring saved_trending_posts table:', error);
  }
}

// Save a trending post
export async function saveTrendingPost(post: any, notes?: string) {
  try {
    await ensureSavedTrendingPostsTable();
    const result = await sql`
      INSERT INTO saved_trending_posts (
        post_id,
        post_data,
        notes
      ) VALUES (
        ${post.id},
        ${JSON.stringify(post)}::jsonb,
        ${notes || null}
      )
      ON CONFLICT (post_id) 
      DO UPDATE SET
        post_data = ${JSON.stringify(post)}::jsonb,
        notes = ${notes || null},
        saved_at = NOW()
      RETURNING 
        id,
        post_id,
        post_data,
        saved_at,
        notes
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error saving trending post:', error);
    throw error;
  }
}

// Get all saved trending posts
export async function getAllSavedTrendingPosts() {
  try {
    await ensureSavedTrendingPostsTable();
    const result = await sql`
      SELECT 
        id,
        post_id,
        post_data,
        saved_at,
        notes
      FROM saved_trending_posts
      ORDER BY saved_at DESC
    `;
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error getting saved trending posts:', error);
    return [];
  }
}

// Delete a saved trending post by post_id
export async function deleteSavedTrendingPost(postId: string) {
  try {
    await ensureSavedTrendingPostsTable();
    await sql`
      DELETE FROM saved_trending_posts
      WHERE post_id = ${postId}
    `;
  } catch (error) {
    console.error('Error deleting saved trending post:', error);
    throw error;
  }
}

// Check if a post is saved
export async function isPostSaved(postId: string) {
  try {
    await ensureSavedTrendingPostsTable();
    const result = await sql`
      SELECT id
      FROM saved_trending_posts
      WHERE post_id = ${postId}
      LIMIT 1
    `;
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('Error checking if post is saved:', error);
    return false;
  }
}

