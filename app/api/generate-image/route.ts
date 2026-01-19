import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

interface OpenRouterImage {
  image_url: {
    url: string; // Base64 data URL
  };
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content?: string;
      role?: string;
      images?: OpenRouterImage[];
    };
  }>;
  error?: {
    message: string;
  };
  // Some models might return image data directly
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imagePrompt, imageTheme, referenceImage } = body;

    if (!imagePrompt) {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OpenRouter API key is not configured');
    }

    // Construct the text content
    const textPrompt = imageTheme
      ? `Master Theme/Style: ${imageTheme}\n\nImage Specific Details: ${imagePrompt}\n\nRequirement: strictly follow the master theme for colors and style.${referenceImage ? ' Use the provided image as a strict reference for composition, lighting, and style.' : ''}`
      : imagePrompt;

    // Construct the message content (array if reference image exists, string otherwise)
    const messageContent = referenceImage
      ? [
        {
          type: 'text',
          text: textPrompt
        },
        {
          type: 'image_url',
          image_url: {
            url: referenceImage // Supports both http URLs and data URLs
          }
        }
      ]
      : textPrompt;

    // For image generation, we need to send a request that will generate an image
    // Note: OpenRouter's image generation might work differently - this is a standard approach
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LinkedIn Post Generator',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
        modalities: ['image', 'text'],
        temperature: 0.7,
        max_tokens: 4000,
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

    // Check if response contains images in the expected format
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices in response');
    }

    const message = data.choices[0].message;

    // Check for images array in message (OpenRouter image generation format)
    if (message.images && message.images.length > 0) {
      const firstImage = message.images[0];
      if (firstImage.image_url && firstImage.image_url.url) {
        // The URL is already a base64 data URL
        return NextResponse.json({ imageUrl: firstImage.image_url.url });
      }
    }

    // Fallback: Check if response has direct image data
    if (data.data && data.data.length > 0) {
      const imageData = data.data[0];
      if (imageData.url) {
        return NextResponse.json({ imageUrl: imageData.url });
      }
      if (imageData.b64_json) {
        // Convert base64 to data URL
        const dataUrl = `data:image/png;base64,${imageData.b64_json}`;
        return NextResponse.json({ imageUrl: dataUrl });
      }
    }

    // If no images found, return error with response details for debugging
    throw new Error(
      `No images found in response. ` +
      `Response structure: ${JSON.stringify(data, null, 2)}`
    );
  } catch (error) {
    console.error('Error generating image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

