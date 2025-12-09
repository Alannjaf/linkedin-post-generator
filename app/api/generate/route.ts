import { NextRequest, NextResponse } from 'next/server';
import { PostGenerationParams, GeneratedPost } from '@/types';
import { buildPostPrompt, buildHashtagPrompt } from '@/lib/prompts';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-pro-preview';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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

async function callOpenRouter(messages: OpenRouterMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured');
  }

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
      messages,
      temperature: 0.7,
      max_tokens: 2000,
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

  return data.choices[0]?.message?.content?.trim() || '';
}

export async function POST(request: NextRequest) {
  try {
    const body: PostGenerationParams = await request.json();
    const { context, language, tone, length } = body;

    if (!context || !language || !tone || !length) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const prompt = buildPostPrompt({ context, language, tone, length });
    const content = await callOpenRouter([{ role: 'user', content: prompt }]);

    if (!content) {
      throw new Error('No content generated');
    }

    // Extract hashtags from the content
    const hashtagRegex = /#(\w+)/g;
    const foundHashtags: string[] = [];
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) {
      foundHashtags.push(match[1]);
    }

    // Remove hashtags from content
    let cleanContent = content.replace(hashtagRegex, '').trim();

    // If no hashtags found, generate them separately
    let hashtags = foundHashtags;
    if (hashtags.length === 0) {
      const hashtagPrompt = buildHashtagPrompt({ postContent: cleanContent, language });
      const hashtagContent = await callOpenRouter([
        { role: 'user', content: hashtagPrompt }
      ]);
      
      hashtags = hashtagContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/^#/, ''))
        .slice(0, 5);
    }

    const result: GeneratedPost = {
      content: cleanContent,
      hashtags,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate post';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

