import { NextRequest, NextResponse } from 'next/server';
import { Language } from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-pro-preview';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, language } = body;

    if (!postContent || !language) {
      return NextResponse.json(
        { error: 'Post content and language are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is not configured');
    }

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
- دەبێت وردەکاری وێنەسازی وەک ڕەنگ، کۆمپۆزیشن، و ستایل تێدابێت

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
- The prompt should be detailed enough for an image generation AI to create a relevant image

Write only the image generation prompt, nothing else.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LinkedIn Post Generator',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API error: ${response.statusText}`
      );
    }

    const data: OpenRouterResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const generatedPrompt = data.choices[0]?.message?.content?.trim() || '';

    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    return NextResponse.json({ prompt: generatedPrompt });
  } catch (error) {
    console.error('Error generating image prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image prompt';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

