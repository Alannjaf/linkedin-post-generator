import { Language, Tone, PostLength, BuiltInTone } from "@/types";
import { getToneDescription } from "./tone-mixer";
import { promptCache } from "./prompt-cache";

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
