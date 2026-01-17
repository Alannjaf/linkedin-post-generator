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

// Initialize custom_tones table if it doesn't exist
export async function ensureCustomTonesTable() {
  try {
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'custom_tones'
      )
    `;
    
    const exists = Array.isArray(tableExists) && tableExists.length > 0 && (tableExists[0] as any).exists;
    
    if (!exists) {
      await sql`
        CREATE TABLE custom_tones (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description_english TEXT NOT NULL,
          description_kurdish TEXT NOT NULL,
          industry TEXT,
          is_preset BOOLEAN DEFAULT false,
          tone_mix JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      // Seed industry presets after table creation
      await seedIndustryPresets();
    }
  } catch (error) {
    console.error('Error ensuring custom_tones table:', error);
  }
}

// Create a custom tone
export async function createCustomTone(data: {
  name: string;
  descriptionEnglish: string;
  descriptionKurdish: string;
  industry?: string;
  isPreset?: boolean;
  toneMix?: { tone: string; percentage: number }[];
}) {
  try {
    await ensureCustomTonesTable();
    const result = await sql`
      INSERT INTO custom_tones (
        name,
        description_english,
        description_kurdish,
        industry,
        is_preset,
        tone_mix
      ) VALUES (
        ${data.name},
        ${data.descriptionEnglish},
        ${data.descriptionKurdish},
        ${data.industry || null},
        ${data.isPreset || false},
        ${data.toneMix ? JSON.stringify(data.toneMix) : null}::jsonb
      )
      RETURNING 
        id,
        name,
        description_english as "descriptionEnglish",
        description_kurdish as "descriptionKurdish",
        industry,
        is_preset as "isPreset",
        tone_mix as "toneMix",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error creating custom tone:', error);
    throw error;
  }
}

// Get a custom tone by ID
export async function getCustomTone(id: number) {
  try {
    await ensureCustomTonesTable();
    const result = await sql`
      SELECT 
        id,
        name,
        description_english as "descriptionEnglish",
        description_kurdish as "descriptionKurdish",
        industry,
        is_preset as "isPreset",
        tone_mix as "toneMix",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM custom_tones
      WHERE id = ${id}
      LIMIT 1
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting custom tone:', error);
    return null;
  }
}

// Get all custom tones (excluding presets by default)
export async function getAllCustomTones(includePresets: boolean = false) {
  try {
    await ensureCustomTonesTable();
    const result = includePresets
      ? await sql`
          SELECT 
            id,
            name,
            description_english as "descriptionEnglish",
            description_kurdish as "descriptionKurdish",
            industry,
            is_preset as "isPreset",
            tone_mix as "toneMix",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM custom_tones
          ORDER BY is_preset DESC, created_at DESC
        `
      : await sql`
          SELECT 
            id,
            name,
            description_english as "descriptionEnglish",
            description_kurdish as "descriptionKurdish",
            industry,
            is_preset as "isPreset",
            tone_mix as "toneMix",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM custom_tones
          WHERE is_preset = false
          ORDER BY created_at DESC
        `;
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error getting all custom tones:', error);
    return [];
  }
}

// Get industry presets
export async function getIndustryPresets(industry?: string) {
  try {
    await ensureCustomTonesTable();
    const result = industry
      ? await sql`
          SELECT 
            id,
            name,
            description_english as "descriptionEnglish",
            description_kurdish as "descriptionKurdish",
            industry,
            is_preset as "isPreset",
            tone_mix as "toneMix",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM custom_tones
          WHERE is_preset = true AND industry = ${industry}
          ORDER BY name
        `
      : await sql`
          SELECT 
            id,
            name,
            description_english as "descriptionEnglish",
            description_kurdish as "descriptionKurdish",
            industry,
            is_preset as "isPreset",
            tone_mix as "toneMix",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM custom_tones
          WHERE is_preset = true
          ORDER BY industry, name
        `;
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error getting industry presets:', error);
    return [];
  }
}

// Update a custom tone
export async function updateCustomTone(
  id: number,
  data: {
    name?: string;
    descriptionEnglish?: string;
    descriptionKurdish?: string;
    industry?: string;
    toneMix?: { tone: string; percentage: number }[];
  }
) {
  try {
    await ensureCustomTonesTable();
    
    // Get current tone to merge with updates
    const current = await getCustomTone(id);
    if (!current) {
      return null;
    }

    // Type assertion since getCustomTone returns properly typed data
    const currentTone = current as any;
    const updatedData = {
      name: data.name !== undefined ? data.name : currentTone.name,
      descriptionEnglish: data.descriptionEnglish !== undefined ? data.descriptionEnglish : currentTone.descriptionEnglish,
      descriptionKurdish: data.descriptionKurdish !== undefined ? data.descriptionKurdish : currentTone.descriptionKurdish,
      industry: data.industry !== undefined ? data.industry : currentTone.industry,
      toneMix: data.toneMix !== undefined ? data.toneMix : currentTone.toneMix,
    };

    const result = await sql`
      UPDATE custom_tones
      SET 
        name = ${updatedData.name},
        description_english = ${updatedData.descriptionEnglish},
        description_kurdish = ${updatedData.descriptionKurdish},
        industry = ${updatedData.industry || null},
        tone_mix = ${updatedData.toneMix ? JSON.stringify(updatedData.toneMix) : null}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id,
        name,
        description_english as "descriptionEnglish",
        description_kurdish as "descriptionKurdish",
        industry,
        is_preset as "isPreset",
        tone_mix as "toneMix",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error updating custom tone:', error);
    throw error;
  }
}

// Delete a custom tone
export async function deleteCustomTone(id: number) {
  try {
    await ensureCustomTonesTable();
    await sql`
      DELETE FROM custom_tones
      WHERE id = ${id} AND is_preset = false
    `;
    return true;
  } catch (error) {
    console.error('Error deleting custom tone:', error);
    throw error;
  }
}

// Seed industry presets
export async function seedIndustryPresets() {
  try {
    await ensureCustomTonesTable();

    const presets = [
      {
        name: 'Technology',
        descriptionEnglish: 'professional and informative with a friendly touch, optimized for tech industry',
        descriptionKurdish: 'پیشەیی و زانیاری بە تێکەڵەیەکی دۆستانە، بۆ پیشەسازی تەکنۆلۆژیا',
        industry: 'technology',
        toneMix: [
          { tone: 'professional', percentage: 60 },
          { tone: 'informative', percentage: 30 },
          { tone: 'friendly', percentage: 10 },
        ],
      },
      {
        name: 'Finance',
        descriptionEnglish: 'highly professional and informative, suitable for financial services',
        descriptionKurdish: 'زۆر پیشەیی و زانیاری، بۆ خزمەتگوزاریەکانی دارایی',
        industry: 'finance',
        toneMix: [
          { tone: 'professional', percentage: 80 },
          { tone: 'informative', percentage: 20 },
        ],
      },
      {
        name: 'Healthcare',
        descriptionEnglish: 'professional and friendly with informative elements, ideal for healthcare',
        descriptionKurdish: 'پیشەیی و دۆستانە بە توخمە زانیارییەکان، بۆ تەندروستی',
        industry: 'healthcare',
        toneMix: [
          { tone: 'professional', percentage: 70 },
          { tone: 'friendly', percentage: 20 },
          { tone: 'informative', percentage: 10 },
        ],
      },
      {
        name: 'Marketing',
        descriptionEnglish: 'friendly and professional with inspirational elements, perfect for marketing',
        descriptionKurdish: 'دۆستانە و پیشەیی بە توخمە ئیلهامبەخشەکان، بۆ بازاریابی',
        industry: 'marketing',
        toneMix: [
          { tone: 'friendly', percentage: 50 },
          { tone: 'professional', percentage: 30 },
          { tone: 'inspirational', percentage: 20 },
        ],
      },
      {
        name: 'Education',
        descriptionEnglish: 'informative and friendly with inspirational touch, great for education',
        descriptionKurdish: 'زانیاری و دۆستانە بە تێکەڵەیەکی ئیلهامبەخش، بۆ پەروەردە',
        industry: 'education',
        toneMix: [
          { tone: 'informative', percentage: 60 },
          { tone: 'friendly', percentage: 30 },
          { tone: 'inspirational', percentage: 10 },
        ],
      },
      {
        name: 'Startup/Entrepreneurship',
        descriptionEnglish: 'inspirational and professional with friendly approach, ideal for startups',
        descriptionKurdish: 'ئیلهامبەخش و پیشەیی بە نزیکبوونەوەیەکی دۆستانە، بۆ دامەزراوە نوێکان',
        industry: 'startup',
        toneMix: [
          { tone: 'inspirational', percentage: 40 },
          { tone: 'professional', percentage: 30 },
          { tone: 'friendly', percentage: 30 },
        ],
      },
    ];

    for (const preset of presets) {
      // Check if preset already exists
      const existing = await sql`
        SELECT id FROM custom_tones
        WHERE is_preset = true AND industry = ${preset.industry}
        LIMIT 1
      `;

      if (Array.isArray(existing) && existing.length === 0) {
        await sql`
          INSERT INTO custom_tones (
            name,
            description_english,
            description_kurdish,
            industry,
            is_preset,
            tone_mix
          ) VALUES (
            ${preset.name},
            ${preset.descriptionEnglish},
            ${preset.descriptionKurdish},
            ${preset.industry},
            true,
            ${JSON.stringify(preset.toneMix)}::jsonb
          )
        `;
      }
    }
  } catch (error) {
    console.error('Error seeding industry presets:', error);
  }
}

