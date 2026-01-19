import { Language, Tone, PostLength, BuiltInTone, HookStyle, Platform } from "@/types";
import { getToneDescription } from "./tone-mixer";
import { promptCache } from "./prompt-cache";
import { PLATFORM_LIMITS } from "./platform-config";

const LENGTH_TARGETS: Record<PostLength, number> = {
  short: 300,
  medium: 800,
  long: 1500,
};

export const TONE_DESCRIPTIONS: Record<BuiltInTone, Record<Language, string>> = {
  professional: {
    english: "professional and business-focused",
    kurdish: "پیشەیی و بزنس-مەركەز",
  },
  casual: {
    english: "casual and relaxed",
    kurdish: "ئاسایی و ئارام",
  },
  friendly: {
    english: "friendly and approachable",
    kurdish: "دۆستانە و نزیک",
  },
  inspirational: {
    english: "inspirational and motivating",
    kurdish: "ئیلهامبەخش و هاندەر",
  },
  informative: {
    english: "informative and educational",
    kurdish: "زانیاری و پەروەردەیی",
  },
  comedy: {
    english: "humorous and entertaining with light-hearted jokes",
    kurdish: "خۆش و پێکەنیناوی بە شوخی و پێکەنین",
  },
};

export async function buildPostPrompt(params: {
  context: string;
  language: Language;
  tone: Tone;
  length: PostLength;
}): Promise<string> {
  const { context, language, tone, length } = params;

  // Check cache first
  const cachedPrompt = promptCache.get({
    context,
    language,
    tone,
    length,
    type: 'post',
  });

  if (cachedPrompt) {
    return cachedPrompt;
  }

  // Clear expired entries periodically (every 100 cache checks)
  if (Math.random() < 0.01) {
    promptCache.clearExpired();
  }

  const targetLength = LENGTH_TARGETS[length];
  const toneDesc = await getToneDescription(tone, language);

  let prompt: string;
  if (language === "kurdish") {
    prompt = `تۆ بەرهەمهێنەری پۆستی LinkedIn بۆ کوردی. لەبەرگرتنەوەی دەقەکەم، پۆستێکی تەواوی LinkedIn دروست بکە.

زانیاری:
${context}

تێبینیەکان:
- شێواز: ${toneDesc}
- درێژی: گرنگە - پۆستەکە دەبێت نزیکەی ${targetLength} پیت بێت (نزیکەی ${Math.round(targetLength / 5)} وشە). بە وردی پیتەکان بژمێرە و بۆمەبەستی ئەم درێژییە بکارە. ئەمە پێویستی بە ژماردنی پیتە، نەک تۆکن.
- زمان: کوردی
- فۆرمات: خاڵەکان، و هێڵەکان بۆ خوێندنەوەی باشتر
- هاشتاگ: پێویستە لە کۆتای پۆستەکەدا 3-5 هاشتاگی گونجاو بنووسیت بە فۆرماتی: #هاشتاگ1 #هاشتاگ2 #هاشتاگ3

گرنگ: ژماردنی پیتەکان (${targetLength} پیت) هەموو دەقەکە لەخۆدەگرێت لەوانەش هاشتاگەکان. پۆستەکە بنووسە لەگەڵ هاشتاگەکان لە کۆتاییدا، دڵنیابکە کە کۆی گشتی پیتەکان نزیکەی ${targetLength} پیت بێت.

پێویستیەکی زۆر گرنگ: 
- پێویست نییە هیچ دەربڕینێکی پێشەکی یان ڕوونکردنەوە بنووسیت. پۆستەکە بەبێ هیچ دەربڕینێکی وەک "فەرموو"، "ئەمەش پۆستێکی LinkedIn"، "بەپێی داواکارییەکانت" دەست پێ بکە.
- بە هیچ شێوەیەک نیشانەی "*" (ئەستێرە) بەکار مەهێنە لە ناوەڕۆکی پۆستەکەدا.
- بە راستەوخۆ پۆستەکە بنووسە، بەبێ هیچ پێشەکییەک.`;
  } else {
    prompt = `You are a LinkedIn post generator. Based on the following context, create a complete LinkedIn post.

Context:
${context}

Requirements:
- Tone: ${toneDesc}
- Length: CRITICAL - The post must be approximately ${targetLength} characters long (around ${Math.round(
      targetLength / 5
    )} words). Count characters carefully and aim for this exact length. This is a character count requirement, not a token count.
- Language: English
- Format: bullet points, and line breaks for better readability
- Hashtags: MUST include 3-5 relevant hashtags at the end in format: #hashtag1 #hashtag2 #hashtag3

IMPORTANT: The character count (${targetLength} characters) includes all text including hashtags. Write the post content with hashtags at the end, ensuring the total character count is close to ${targetLength} characters.

CRITICAL REQUIREMENTS:
- DO NOT include any introductory text, meta-commentary, or explanatory phrases like "Here's a LinkedIn post", "Based on your requirements", "This is a post about", etc.
- DO NOT use asterisks "*" anywhere in the content. Use bullet points with dashes "-" or other formatting instead.
- Start directly with the post content. No preamble or introduction.`;
  }

  // Cache the generated prompt
  promptCache.set({
    context,
    language,
    tone,
    length,
    type: 'post',
  }, prompt);

  return prompt;
}

export function buildHashtagPrompt(params: {
  postContent: string;
  language: Language;
  trendingHashtags?: string[];
}): string {
  const { postContent, language, trendingHashtags } = params;

  // Note: Hashtag prompts are not cached because postContent is typically unique
  // and caching would not provide significant performance benefits

  const trendingContext = trendingHashtags && trendingHashtags.length > 0
    ? (language === "kurdish"
      ? `\n\nهاشتاگە بەناوبانگەکان لە پۆستە هاوشێوەکاندا: ${trendingHashtags.map(t => `#${t}`).join(', ')}\nئەم هاشتاگانە لە پۆستە بەناوبانگەکاندا بەکاردەهێنران. لەبەرگرتنەوەیان بکە بۆ پێشنیارەکانت.`
      : `\n\nTrending hashtags from similar popular posts: ${trendingHashtags.map(t => `#${t}`).join(', ')}\nThese hashtags were used in popular posts on similar topics. Consider them for your suggestions.`)
    : '';

  if (language === "kurdish") {
    return `بەپێی پۆستی خوارەوە، 3-5 هاشتاگی گونجاو پێشنیار بکە بۆ LinkedIn. تەنها هاشتاگەکان بنووسە، هەر یەک لەسەر هێڵێکی جیا، بەبێ #.${trendingContext}

پۆست:
${postContent}`;
  } else {
    return `Based on the following LinkedIn post, suggest 3-5 relevant hashtags. Write only the hashtags, one per line, without the # symbol.${trendingContext}

Post:
${postContent}`;
  }
}

export function buildHookPrompt(params: {
  postContent: string;
  language: Language;
  tone: Tone;
  hookStyle?: HookStyle;
}): string {
  const { postContent, language, tone, hookStyle = 'any' } = params;

  const toneDesc = language === 'kurdish'
    ? 'شێوازی پۆستەکە'
    : 'the post tone';

  const styleInstructions = hookStyle === 'any'
    ? (language === 'kurdish'
      ? 'جۆرە جیاوازەکانی هۆک: پرسیار، دەربڕین، چیرۆک، ئامار'
      : 'different hook styles: question, statement, story, statistic')
    : (language === 'kurdish'
      ? `جۆری هۆک: ${hookStyle === 'question' ? 'پرسیار' : hookStyle === 'statement' ? 'دەربڕین' : hookStyle === 'story' ? 'چیرۆک' : 'ئامار'}`
      : `hook style: ${hookStyle}`);

  if (language === "kurdish") {
    return `بەپێی پۆستی خوارەوە، 3-5 هۆکی جیاواز (دەستپێکردنی سەرنجڕاکێش) دروست بکە. هۆکەکان دەبێت:
- سەرنجڕاکێش و گرنگ بن
- لەگەڵ ناوەڕۆکی پۆستەکە بگونجێن
- خوێنەر بگەڕێننەوە بۆ خوێندنەوەی زیاتر
- ${styleInstructions}

پۆست:
${postContent}

تەنها هۆکەکان بنووسە، هەر یەک لەسەر هێڵێکی جیا. نەک پۆستێکی تەواو.`;
  } else {
    return `Based on the following LinkedIn post, generate 3-5 different compelling opening lines (hooks). The hooks should:
- Be attention-grabbing and compelling
- Match the post's content and topic
- Entice readers to continue reading
- Use ${styleInstructions}

Post:
${postContent}

Write only the hooks, one per line. Do not write a complete post.`;
  }
}

export async function buildCTAPrompt(params: {
  postContent: string;
  language: Language;
  tone: Tone;
  postType?: 'engagement' | 'showcase' | 'educational' | 'story' | 'building' | 'announcement';
}): Promise<string> {
  const { postContent, language, tone, postType } = params;
  const toneDesc = await getToneDescription(tone, language);

  const postTypeContext = postType
    ? (language === 'kurdish'
      ? `جۆری پۆست: ${postType === 'engagement' ? 'بەشداری' : postType === 'showcase' ? 'پیشاندان' : postType === 'educational' ? 'پەروەردەیی' : postType === 'story' ? 'چیرۆک' : postType === 'building' ? 'دروستکردن' : 'ئاگاداری'}`
      : `Post type: ${postType}`)
    : '';

  if (language === "kurdish") {
    return `بەپێی پۆستی خوارەوە، 3-5 CTA (Call-to-Action) جیاواز دروست بکە. CTA-کان دەبێت:
- کاریگەر و کردارگر بن
- لەگەڵ شێوازی پۆستەکە بگونجێن (${toneDesc})
- خوێنەر هاندەن بۆ کردار (کۆمێنت، هاوبەشکردن، کلیک، هتد)
- کورت و ڕوون بن
${postTypeContext ? `- ${postTypeContext}` : ''}

پۆست:
${postContent}

بۆ هەر CTA، شوێنی پێشنیارکراو بنووسە (دەستپێک، ناوەڕاست، کۆتایی، یان تێکەڵ). تەنها CTA-کان بنووسە، هەر یەک لەسەر هێڵێکی جیا بە فۆرماتی: "CTA_TEXT | شوێن"`;
  } else {
    return `Based on the following LinkedIn post, generate 3-5 different Call-to-Action (CTA) options. The CTAs should:
- Be effective and action-oriented
- Match the post's tone (${toneDesc})
- Encourage reader action (comment, share, click, etc.)
- Be concise and clear
${postTypeContext ? `- ${postTypeContext}` : ''}

Post:
${postContent}

For each CTA, suggest placement (start, middle, end, or embedded). Write only the CTAs, one per line in format: "CTA_TEXT | placement"`;
  }
}

export async function buildAdaptationPrompt(params: {
  postContent: string;
  sourceLanguage: Language;
  targetPlatform: Platform;
  preserveTone?: boolean;
}): Promise<string> {
  const { postContent, sourceLanguage, targetPlatform, preserveTone = true } = params;
  const limits = PLATFORM_LIMITS[targetPlatform];

  const platformName = targetPlatform === 'twitter' ? 'Twitter/X' : targetPlatform.charAt(0).toUpperCase() + targetPlatform.slice(1);
  const maxChars = limits.maxCharacters;
  const maxHashtags = limits.maxHashtags || 10;

  if (sourceLanguage === "kurdish") {
    return `بەپێی پۆستی LinkedIn خوارەوە، ناوەڕۆکەکە بگۆڕە بۆ ${platformName}. 

پۆستی سەرەکی:
${postContent}

تێبینیەکان:
- سنووری پیت: ${maxChars} پیت (گرنگە!)
- سنووری هاشتاگ: ${maxHashtags} هاشتاگ
- ${preserveTone ? 'شێواز و تۆنەکە بپارێزە' : 'شێواز بگۆڕە بۆ ${platformName}'}
- ناوەڕۆکی سەرەکی بپارێزە بەڵام بگونجێنە بۆ ${platformName}
- فۆرمات بگۆڕە بەپێی ${platformName}${limits.supportsThreads ? ' (دەتوانیت thread دروست بکەیت ئەگەر پێویست بێت)' : ''}

پۆستێکی تەواوی ${platformName} بنووسە کە لە سنوورەکاندا بێت.`;
  } else {
    return `Based on the following LinkedIn post, adapt the content for ${platformName}.

Original Post:
${postContent}

Requirements:
- Character limit: ${maxChars} characters (CRITICAL!)
- Hashtag limit: ${maxHashtags} hashtags
- ${preserveTone ? 'Preserve the tone and style' : 'Adapt tone for ${platformName}'}
- Maintain core message but optimize for ${platformName}
- Adjust formatting for ${platformName}${limits.supportsThreads ? ' (you can create a thread if needed)' : ''}

Write a complete ${platformName} post that fits within the limits.`;
  }
}

export async function buildCarouselPrompt(params: {
  postContent: string;
  language: Language;
  tone: Tone;
  targetSlideCount?: number;
}): Promise<string> {
  const { postContent, language, tone, targetSlideCount } = params;
  const toneDesc = await getToneDescription(tone, language);

  const slideCountInstruction = targetSlideCount
    ? (language === 'kurdish'
      ? `- ژمارەی سلاید: ${targetSlideCount} سلاید`
      : `- Number of slides: ${targetSlideCount} slides`)
    : (language === 'kurdish'
      ? `- ژمارەی سلاید: بەپێی درێژی ناوەڕۆک (3-10 سلاید)`
      : `- Number of slides: Based on content length (3-10 slides)`);

  if (language === "kurdish") {
    return `بەپێی پۆستی LinkedIn خوارەوە، پۆستەکە بگۆڕە بۆ فۆرماتی carousel (سلایدی هەمەجۆر). 
    
    زانیاری پۆست:
    ${postContent}
    
    تێبینیەکان:
    - شێواز: ${toneDesc}
    - ${slideCountInstruction}
    - درێژی هەر سلایدێک: نزیکەی 125 پیت (ناوەڕۆک + سەردێڕ)
    - سەردێڕی سلاید: 30-50 پیت
    - ناوەڕۆکی سلاید: 80-120 پیت
    - هەموو خاڵە سەرەکییەکانی ناوەڕۆکە ڕەسەنەکە بگرێتەوە. وردەکارییە گرنگەکان بەجێ مەهێڵە.
    
    پێویستیەکی زۆر گرنگ بۆ وێنەکان:
    - هەموو وێنەکان دەبێت هەمان تێم و براندینگ هەبێت
    - هەمان شێوازی بینراو (وەک minimalist, corporate, modern)
    - هەمان پاڵێتی ڕەنگ (ڕەنگەکان دیاری بکە)
    - هەمان زمانێکی دیزاین (شێوازی وێنەکێشان، فۆتۆگرافی)
    - تێمی سەرەکی دروست بکە کە بۆ هەموو سلایدەکان بەکاربهێنرێت
    
    فۆرمات (بە وردی پەیڕەوی بکە):
    - بۆ هەر سلاید، تەنها ئەم شێوازە بەکاربهێنە. هیچ نیشانەیەکی تر (#, *, -) بەکارمەهێنە بۆ ناونیشانەکان.
    - بە هیچ شێوەیەک پێشەکی (Introduction) وەک "فەرموو"، "ئەمەش پلانەکە" مەنووسە. ڕاستەوخۆ دەست پێ بکە.
    
    SLIDE [number]:
    TITLE: [سەردێڕ]
    CONTENT: [ناوەڕۆک]
    IMAGE: [پێشنیاری وێنە - دڵنیابە کە لەگەڵ تێمی سەرەکی بگونجێت]
    
    لە کۆتاییدا، تێمی سەرەکی وێنەکان بنووسە:
    MASTER IMAGE THEME: [تێمی سەرەکی]`;
  } else {
    return `Based on the following LinkedIn post, convert it into a carousel format (multi-slide document).
    
    Original Post:
    ${postContent}
    
    Requirements:
    - Tone: ${toneDesc}
    - ${slideCountInstruction}
    - Each slide length: Approximately 125 characters (content + title)
    - Slide title: 30-50 characters
    - Slide content: 80-120 characters
    - Cover ALL main points from the original content. Do not leave out important details.
    
    CRITICAL REQUIREMENT FOR IMAGES:
    - ALL images must share the SAME theme and branding
    - Select a SPECIFIC art style (e.g., "3D Clay Render", "Flat Vector Art", "Cyberpunk Neon", "Minimalist Line Art"). AVOID generic terms like "Professional".
    - Define a SPECIFIC color palette (e.g., "Pastel Blue & White", "Dark Mode with Neon Purple Accents").
    - Generate a MASTER THEME description that describes this specific style and palette in detail.
    
    CRITICAL FORMATTING RULES:
    - START DIRECTLY with SLIDE 1.
    - DO NOT include any introductory text, meta-commentary, or phrases like "Here is the carousel" or "Sure, I can help".
    - DO NOT use Markdown headers (### or **) for the field labels (SLIDE, TITLE, CONTENT, IMAGE).
    
    Format:
    For each slide, write exactly:
    SLIDE [number]:
    TITLE: [title]
    CONTENT: [content]
    IMAGE: [image suggestion - ensure it matches the master theme]
    
    At the end, write:
    MASTER IMAGE THEME: [The specific art style, color palette, and visual mood to be used for ALL images]`;
  }
}
