import { Language, Tone, PostLength } from "@/types";

const LENGTH_TARGETS: Record<PostLength, number> = {
  short: 300,
  medium: 800,
  long: 1500,
};

const TONE_DESCRIPTIONS: Record<Tone, Record<Language, string>> = {
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

export function buildPostPrompt(params: {
  context: string;
  language: Language;
  tone: Tone;
  length: PostLength;
}): string {
  const { context, language, tone, length } = params;
  const targetLength = LENGTH_TARGETS[length];
  const toneDesc = TONE_DESCRIPTIONS[tone][language];

  if (language === "kurdish") {
    return `تۆ بەرهەمهێنەری پۆستی LinkedIn بۆ کوردی. لەبەرگرتنەوەی دەقەکەم، پۆستێکی تەواوی LinkedIn دروست بکە.

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
    return `You are a LinkedIn post generator. Based on the following context, create a complete LinkedIn post.

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
}

export function buildHashtagPrompt(params: {
  postContent: string;
  language: Language;
}): string {
  const { postContent, language } = params;

  if (language === "kurdish") {
    return `بەپێی پۆستی خوارەوە، 3-5 هاشتاگی گونجاو پێشنیار بکە بۆ LinkedIn. تەنها هاشتاگەکان بنووسە، هەر یەک لەسەر هێڵێکی جیا، بەبێ #.

پۆست:
${postContent}`;
  } else {
    return `Based on the following LinkedIn post, suggest 3-5 relevant hashtags. Write only the hashtags, one per line, without the # symbol.

Post:
${postContent}`;
  }
}
