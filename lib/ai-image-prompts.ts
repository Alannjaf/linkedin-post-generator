import { Language } from '@/types';

export async function generateImagePromptWithAI(
  postContent: string,
  language: Language,
  apiKey: string
): Promise<string> {
  const analysisPrompt = language === 'kurdish'
    ? `تۆ بەرهەمهێنەری پێشنیاری وێنە بۆ پۆستی LinkedIn. لەبەرگرتنەوەی پۆستەکە، پێشنیارێکی وێنە دروست بکە کە بە باشی لەگەڵ ناوەڕۆکی پۆستەکە بگونجێت.

پۆست:
${postContent}

تێبینیەکان:
- پێشنیارەکە دەبێت بۆ وێنەی پیشەیی و بەرز LinkedIn بێت
- دەبێت بە شێوەیەکی زیرەکانە ناوەڕۆکی پۆستەکە لەبیر بکات
- دەبێت وێنەیەکی پیشەیی، مۆدێرن، و ساکار بێت
- دەبێت بە شێوەیەکی گرافیکی ناوەڕۆکی پۆستەکە پیشان بدات
- دەبێت بەبێ دەق بێت (تەنها وێنە)
- دەبێت بۆ پلاتفۆرمی کۆمەڵایەتی بزنس گونجاو بێت

تەنها پێشنیاری وێنە بنووسە، بەبێ هیچ شتێکی تر.`
    : `You are an image prompt generator for LinkedIn posts. Based on the following post content, create a detailed image generation prompt that accurately represents and complements the post.

Post Content:
${postContent}

Requirements:
- The prompt should be for a professional, high-quality LinkedIn image
- It should intelligently reflect the core message and themes of the post
- It should be professional, modern, and clean
- It should visually represent the post's content in a graphic way
- It should be image-only (no text overlays)
- It should be suitable for business social media platform
- Include specific visual elements, colors, composition, and style that match the post's tone and content

Write only the image generation prompt, nothing else.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LinkedIn Post Generator',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API error: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const generatedPrompt = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    return generatedPrompt;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate image prompt with AI');
  }
}

