import { NextRequest, NextResponse } from "next/server";
import { Language } from "@/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-pro-preview";

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
        { error: "Post content and language are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured");
    }

    // Always generate the prompt in English, but note if Kurdish text should be included in the image
    const isKurdishPost = language === "kurdish";
    const analysisPrompt = `You are an image prompt generator for LinkedIn posts. Based on the following post content, create a detailed, unique image generation prompt that accurately represents and complements the post.

Post Content:
${postContent}

CRITICAL REQUIREMENTS FOR UNIQUENESS:
- Each prompt MUST be unique and tailored specifically to this post's content
- AVOID repetitive or generic styles like "3D isometric", "isometric illustration", "3D render", or similar overused styles
- Analyze the post content deeply to determine the most appropriate visual style from these options:
  * Professional photography (for real-world, authentic content)
  * Flat design or modern illustration (for clean, conceptual content)
  * Abstract or minimalist design (for philosophical or high-level concepts)
  * Documentary or editorial style (for news, insights, or stories)
  * Infographic-style visualization (for data or process content)
  * Environmental or lifestyle photography (for personal or cultural content)
- Choose the style that best matches the post's tone, subject matter, and message
- Vary visual approaches: some posts may need photography, others illustration, others abstract design
- The style should feel fresh and appropriate for the specific content, not generic

Requirements:
- The prompt should be for a professional, high-quality LinkedIn image
- It should intelligently reflect the core message and themes of the post
- It should be professional, modern, and clean
- It should visually represent the post's content in a graphic way
- It should be image-only (no text overlays)${
      isKurdishPost
        ? `\n- IMPORTANT FOR KURDISH POSTS: If the image design requires text elements (signs, banners, graphics, quotes, or any visual text), you MUST include the Kurdish text from the post content exactly as written. The Kurdish text should be part of the visual design itself, not an overlay. When including Kurdish text, specify it clearly in the prompt (e.g., "a sign displaying the Kurdish text: [exact Kurdish text from post]")`
        : ""
    }
- It should be suitable for business social media platform
- Include specific visual elements, colors, composition, and style that match the post's tone and content
- The prompt should be detailed enough for an image generation AI to create a relevant image
- IMPORTANT: Write the entire prompt in English${
      isKurdishPost
        ? ", but when Kurdish text is needed in the image (as part of signs, banners, or graphics), include the exact Kurdish text from the post"
        : ""
    }

Style Variety Examples (use as inspiration, not to copy):
- For technology posts: Consider modern tech photography, abstract data visualizations, or clean UI mockups
- For business posts: Consider professional office photography, collaboration scenes, or business concept illustrations
- For personal/cultural posts: Consider lifestyle photography, cultural elements, or authentic scenes
- For motivational posts: Consider inspiring landscapes, abstract growth concepts, or uplifting imagery

Write only the image generation prompt in English, nothing else. Make it unique to this specific post content.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "LinkedIn Post Generator",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.9,
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

    const generatedPrompt = data.choices[0]?.message?.content?.trim() || "";

    if (!generatedPrompt) {
      throw new Error("No prompt generated");
    }

    return NextResponse.json({ prompt: generatedPrompt });
  } catch (error) {
    console.error("Error generating image prompt:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to generate image prompt";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
