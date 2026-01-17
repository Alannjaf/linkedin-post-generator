import { NextRequest, NextResponse } from "next/server";
import { Language } from "@/types";
import { logger } from "@/lib/utils/logger";
import { OPENROUTER_API_URL, DEFAULT_MODEL } from "@/lib/config/api-config";


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
    const { postContent, language, tone, context } = body;

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

    const isKurdishPost = language === "kurdish";
    const contextSection = context ? `\n\nOriginal Context/Draft:\n${context}` : "";
    const toneSection = tone ? `\n\nTone of the post: ${tone}` : "";

    // Extract Kurdish text for images (questions, key phrases)
    let kurdishTextToInclude = "";
    if (isKurdishPost) {
      // Extract questions from Kurdish text (lines containing ؟)
      const kurdishQuestions = postContent
        .split('\n')
        .filter((line: string) => line.includes('؟'))
        .map((line: string) => line.trim());
      
      if (kurdishQuestions.length > 0) {
        // Prioritize engagement questions (containing question words)
        kurdishTextToInclude = kurdishQuestions.find((q: string) => 
          q.includes('چی') ||  // what
          q.includes('کێ') ||  // who  
          q.includes('چۆن') || // how
          q.includes('کەی') || // when
          q.includes('کام')    // which
        ) || kurdishQuestions[0]; // fallback to first question
      }
      
      // If no questions found, look for key phrases with emojis or emphasis
      if (!kurdishTextToInclude) {
        const emphasisLines = postContent
          .split('\n')
          .filter((line: string) => line.includes('!') || line.includes('👇') || line.includes('✨'))
          .map((line: string) => line.trim());
        
        if (emphasisLines.length > 0) {
          kurdishTextToInclude = emphasisLines[0];
        }
      }
    }

    // STEP 1: Detect post type
    const postTypeAnalyzer = `Analyze this post and identify its primary type in ONE WORD:

Post: ${postContent}

Choose ONLY ONE from these options:
- ENGAGEMENT (asking for comments, questions, community input, discussions)
- SHOWCASE (displaying finished work, achievements, completed projects)
- EDUCATIONAL (teaching, explaining, sharing knowledge, tips, tutorials)
- ANNOUNCEMENT (launching something new, revealing news, updates)
- STORYTELLING (sharing personal journey, experience, reflection)
- BUILDING (showing work in progress, development process, creating)

Answer with just the single word that best matches.`;

    const typeResponse = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "LinkedIn Post Generator",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: postTypeAnalyzer }],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!typeResponse.ok) {
      throw new Error("Failed to detect post type");
    }

    const typeData: OpenRouterResponse = await typeResponse.json();
    const postType = typeData.choices[0]?.message?.content?.trim().toUpperCase() || "GENERAL";

    // STEP 2: Define type-specific guidance
    const postTypeGuidance: Record<string, string> = {
      ENGAGEMENT: `
🎯 This is an ENGAGEMENT post. The image MUST:
- Show community interaction visually (speech bubbles, comments, dialogue elements)
- Include the actual question or call-to-action text prominently${isKurdishPost ? ' in Kurdish from the post' : ''}
- Visualize people responding, participating, or contributing
- Create an inviting, open atmosphere that encourages viewer to comment
- Show the author actively receiving, welcoming, or processing community input
- Use warm, collaborative colors and approachable composition
- Make it feel like a conversation, not a lecture`,
      
      SHOWCASE: `
🎯 This is a SHOWCASE post. The image MUST:
- Display the finished product, achievement, or result prominently as the hero
- Use professional, polished, high-quality styling
- Show completion, success, and accomplishment
- Celebrate the achievement with proud, confident composition
- Make the product/result crystal clear and attractive
- Use professional photography style or polished illustration`,
      
      EDUCATIONAL: `
🎯 This is an EDUCATIONAL post. The image MUST:
- Use clear, organized visual hierarchy with structured layout
- Show teaching, knowledge transfer, or learning in action
- Include organized elements (numbered steps, labeled sections, clear categories)
- Create a learning-friendly, accessible atmosphere
- Make information visually digestible and easy to follow
- Use infographic style or clear instructional visuals`,
      
      BUILDING: `
🎯 This is a BUILDING/DEVELOPMENT post. The image MUST:
- Show active work in progress, not finished products
- Visualize the creation, construction, or development process
- Include tools, code, construction elements, or building materials
- Create energy and momentum of active work happening now
- Show transformation in progress or construction underway
- Use dynamic composition suggesting ongoing activity`,
      
      STORYTELLING: `
🎯 This is a STORYTELLING post. The image MUST:
- Show journey, progression, or narrative flow (often left to right or bottom to top)
- Use visual storytelling with clear beginning, middle, progression
- Be authentic, relatable, and emotionally resonant
- Show personal transformation, growth, or change over time
- Create emotional connection and human element
- Use documentary or lifestyle photography style`,
      
      ANNOUNCEMENT: `
🎯 This is an ANNOUNCEMENT post. The image MUST:
- Be bold, eye-catching, and immediately attention-grabbing
- Clearly communicate the news or announcement visually
- Use celebratory, exciting, or impactful tone and composition
- Make the announcement the unmistakable focal point
- Create buzz, excitement, or sense of importance
- Use dynamic, energetic visual treatment`,
    };

    const specificGuidance = postTypeGuidance[postType] || `
🎯 This is a GENERAL post. The image should:
- Clearly represent the main message of the post
- Use appropriate professional styling for LinkedIn
- Match the tone and intent of the content`;

    // STEP 3: Create comprehensive prompt - consolidated to remove duplicates
    
    // For Kurdish posts with extracted text, create a mandatory template
    const kurdishTextRequirement = isKurdishPost && kurdishTextToInclude ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 MANDATORY REQUIREMENT - THIS OVERRIDES ALL OTHER INSTRUCTIONS 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is a KURDISH ENGAGEMENT POST. You MUST include this exact text in the image:

"${kurdishTextToInclude}"

REQUIRED FORMAT in your image prompt:
Your prompt MUST contain this exact phrase somewhere:
"A prominent [banner/whiteboard/sign/display] showing Kurdish text: ${kurdishTextToInclude}"

This is NOT optional. This is NOT negotiable. Even if you think text overlays 
aren't good for LinkedIn, KURDISH ENGAGEMENT POSTS REQUIRE THE QUESTION TO BE VISIBLE.

The text must be:
✓ In the exact Arabic script shown above (no Latin alphabet, no translation)
✓ Prominent and readable (large size, clear placement)
✓ The focal point that invites comments
✓ Integrated into the scene (on whiteboard, banner, screen, sign, etc.)
✓ Character-for-character exact match (preserve Sorani/Kurmanji dialect exactly)

Kurdish Text Placement:
- For questions: Large, prominent banner, whiteboard, or speech bubble
- Make it the FOCAL POINT that invites engagement
- Use clear, readable Kurdish font
- Ensure text is large enough to be the main call-to-action

Kurdish Cultural Elements (optional):
- Consider subtle use of Kurdish flag colors (red, white, green) in design accents
- Include authentic cultural visual elements when appropriate
- Make it feel genuine to Kurdish digital culture
- Avoid stereotypes - focus on modern, professional Kurdish context

IF YOUR PROMPT DOES NOT INCLUDE THIS EXACT KURDISH TEXT, IT IS WRONG.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : '';

    const analysisPrompt = `You are an expert image prompt generator for LinkedIn posts. Your goal is to create detailed, unique prompts that generate images perfectly aligned with each post's specific purpose and call-to-action.

${kurdishTextRequirement}

POST CONTENT:
${postContent}${toneSection}${contextSection}

POST TYPE IDENTIFIED: ${postType}

${specificGuidance}

LEARN FROM THESE EXAMPLES:

❌ BAD Example - Generic Engagement Post:
"Abstract illustration of technology and innovation with people collaborating"

✅ GOOD Example - Engagement Post:
"Warm, inviting flat vector illustration centered on a friendly developer at a laptop. Multiple colorful speech bubbles and comment boxes flow in from left and top, each containing simple problem icons (traffic, clock, confusion). Prominent banner displays: '[Actual question from post]' in large, readable text. Developer actively catches inputs and transforms them into glowing app mockups on right. Warm coral and amber tones for problems, cool tech blues for solutions. Collaborative, conversational atmosphere inviting participation."

${isKurdishPost && kurdishTextToInclude ? `
✅ GOOD Example - Kurdish Engagement Post (LIKE THIS ONE):
"Community-focused illustration with confident developer at modern desk with laptop. Multiple warm-colored speech bubbles with problem icons (car in traffic, clock, confused face) flow from left toward the developer. BEHIND THE DEVELOPER, a large digital whiteboard/screen prominently displays in Kurdish text: ${kurdishTextToInclude} in clear, bold font. Developer actively processes these inputs, with sleek blue app mockups emerging on the right. Warm orange/coral tones (left) transition to cool neon blue (right). Inviting, collaborative atmosphere. The Kurdish question is the FOCAL POINT inviting engagement."

❌ WRONG for this Kurdish post:
"Developer at computer transforming problems into solutions, no text overlays" - MISSING THE REQUIRED KURDISH TEXT!
` : ''}

❌ BAD Example - Educational Post:
"Person teaching with a computer screen"

✅ GOOD Example - Educational Post:
"Clean infographic-style layout with clear 5-section vertical or horizontal flow. Each section numbered and visually distinct with icons. Central teaching figure or presentation element. Professional blue and white palette. Clear hierarchy, easy to scan, knowledge-transfer focused. Educational, organized, approachable."

❌ BAD Example - Showcase Post:
"3D isometric app floating in space"

✅ GOOD Example - Showcase Post:
"Professional product photography showing sleek app interface on iPhone, iPad, and MacBook arranged in modern composition. Polished UI clearly visible on all screens. Subtle gradient background (navy to deep purple). Confident, premium feel. Celebration of finished product. Sharp, high-quality, professional showcase."

For English posts:
- Generally avoid text overlays unless essential to the message
- If including text (quotes, statistics, key phrases), integrate naturally
- Keep text minimal and purposeful

STYLE VARIETY REQUIREMENTS:
- NEVER default to "3D isometric" or other overused styles
- Match style to content purpose:
  * Engagement posts → Warm, collaborative illustrations
  * Showcases → Professional photography or polished renders
  * Educational → Clean infographics or structured layouts
  * Stories → Documentary/lifestyle photography
  * Building → Dynamic work-in-progress visuals
  * Announcements → Bold, energetic graphics

CRITICAL REQUIREMENTS:
1. The image must DIRECTLY support the post's PRIMARY PURPOSE (what action does it want?)
2. Be specific about composition, colors, elements, and atmosphere
3. Make it unique to THIS specific post, not generic
4. Focus on what the author is DOING/ASKING, not just the topic
5. Create professional LinkedIn-appropriate imagery
6. Be detailed enough for an AI image generator to create accurately

Now create a detailed image generation prompt for the post above. Write ONLY the image prompt in English (with exact Kurdish text specified when needed), nothing else. Make it specific, purposeful, and aligned with the ${postType} post type.`;

    // STEP 4: Generate the actual image prompt
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
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
        temperature: 0.7,
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

    // Validation: Check if Kurdish text is included when required
    if (isKurdishPost && kurdishTextToInclude) {
      const hasKurdishText = generatedPrompt.includes(kurdishTextToInclude) || 
                            generatedPrompt.includes('Kurdish text') ||
                            generatedPrompt.includes('Kurdish:');
      
      if (!hasKurdishText) {
        logger.warn('Generated prompt missing Kurdish text, regenerating with minimal correction...');
        
        // Optimized retry: Only send minimal correction prompt instead of full conversation history
        const retryPrompt = `Your previous response was missing the required Kurdish text. 

Create an image prompt that includes this exact Kurdish text prominently displayed: "${kurdishTextToInclude}"

Your prompt must contain a phrase like: "[whiteboard/banner/sign] displaying the Kurdish text: ${kurdishTextToInclude}"

Generate the complete image prompt now:`;

        const retryResponse = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "LinkedIn Post Generator",
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [
              {
                role: "user",
                content: `${analysisPrompt}\n\nYour previous attempt missed the Kurdish text requirement. ${retryPrompt}`,
              },
            ],
            temperature: 0.6,
          }),
        });

        if (retryResponse.ok) {
          const retryData: OpenRouterResponse = await retryResponse.json();
          const retryGeneratedPrompt = retryData.choices[0]?.message?.content?.trim();
          
          if (retryGeneratedPrompt && retryGeneratedPrompt.includes(kurdishTextToInclude)) {
            return NextResponse.json({ 
              prompt: retryGeneratedPrompt,
              postType: postType,
              retried: true
            });
          }
        }
        
        // If retry failed, manually inject the Kurdish text requirement
        const enhancedPrompt = generatedPrompt.replace(
          /(developer|desk|laptop|workspace)/i,
          `$1. Behind the scene, a prominent digital whiteboard or banner displays in large, clear Kurdish text: "${kurdishTextToInclude}"`
        );
        
        return NextResponse.json({ 
          prompt: enhancedPrompt,
          postType: postType,
          manuallyEnhanced: true
        });
      }
    }

    return NextResponse.json({ 
      prompt: generatedPrompt,
      postType: postType
    });
  } catch (error) {
    logger.error("Error generating image prompt:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to generate image prompt";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}