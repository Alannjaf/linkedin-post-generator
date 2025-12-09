import { Language, Tone, PostLength } from '@/types';

const LENGTH_TARGETS: Record<PostLength, number> = {
  short: 300,
  medium: 800,
  long: 1500,
};

const TONE_DESCRIPTIONS: Record<Tone, Record<Language, string>> = {
  professional: {
    english: 'professional and business-focused',
    kurdish: 'پیشەیی و بزنس-مەركەز',
  },
  casual: {
    english: 'casual and relaxed',
    kurdish: 'ئاسایی و ئارام',
  },
  friendly: {
    english: 'friendly and approachable',
    kurdish: 'دۆستانە و نزیک',
  },
  inspirational: {
    english: 'inspirational and motivating',
    kurdish: 'ئیلهامبەخش و هاندەر',
  },
  informative: {
    english: 'informative and educational',
    kurdish: 'زانیاری و پەروەردەیی',
  },
  comedy: {
    english: 'humorous and entertaining with light-hearted jokes',
    kurdish: 'خۆش و پێکەنیناوی بە شوخی و پێکەنین',
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

  if (language === 'kurdish') {
    return `تۆ بەرهەمهێنەری پۆستی LinkedIn بۆ کوردی. لەبەرگرتنەوەی دەقەکەم، پۆستێکی تەواوی LinkedIn دروست بکە.

زانیاری:
${context}

تێبینیەکان:
- شێواز: ${toneDesc}
- درێژی: نزیکەی ${targetLength} پیت (نزیکەی ${Math.round(targetLength / 5)} وشە)
- زمان: کوردی
- فۆرمات: بەکارهێنانی بولد، خاڵەکان، و هێڵەکان بۆ خوێندنەوەی باشتر
- هاشتاگ: لە کۆتاییدا 3-5 هاشتاگی گونجاو پێشنیار بکە

تەنها پۆستەکە بنووسە، بەبێ هیچ شتێکی تر.`;
  } else {
    return `You are a LinkedIn post generator. Based on the following context, create a complete LinkedIn post.

Context:
${context}

Requirements:
- Tone: ${toneDesc}
- Length: Approximately ${targetLength} characters (around ${Math.round(targetLength / 5)} words)
- Language: English
- Format: Use bold text, bullet points, and line breaks for better readability
- Hashtags: Suggest 3-5 relevant hashtags at the end

Write only the post content, nothing else.`;
  }
}

export function buildHashtagPrompt(params: {
  postContent: string;
  language: Language;
}): string {
  const { postContent, language } = params;

  if (language === 'kurdish') {
    return `بەپێی پۆستی خوارەوە، 3-5 هاشتاگی گونجاو پێشنیار بکە بۆ LinkedIn. تەنها هاشتاگەکان بنووسە، هەر یەک لەسەر هێڵێکی جیا، بەبێ #.

پۆست:
${postContent}`;
  } else {
    return `Based on the following LinkedIn post, suggest 3-5 relevant hashtags. Write only the hashtags, one per line, without the # symbol.

Post:
${postContent}`;
  }
}

