import { NextRequest, NextResponse } from "next/server";
import { Language, Tone, HookStyle, GeneratedHook } from "@/types";
import { buildHookPrompt } from "@/lib/prompts";
import { callOpenRouterForHook } from "@/lib/api/openrouter-client";
import { logger } from "@/lib/utils/logger";

function parseHooks(content: string, language: Language): GeneratedHook[] {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const hooks: GeneratedHook[] = [];
  const hookStyles: HookStyle[] = ['question', 'statement', 'story', 'statistic'];

  for (let i = 0; i < lines.length && hooks.length < 5; i++) {
    const line = lines[i];
    
    // Skip meta-commentary
    if (language === 'kurdish') {
      if (line.match(/^هۆک|^پێشنیار|^نموونە/i)) continue;
    } else {
      if (line.match(/^hook|^option|^suggestion|^example/i)) continue;
    }

    // Try to detect hook style
    let detectedStyle: HookStyle = 'statement';
    if (line.includes('?') || line.match(/^(what|how|why|when|where|who|which|do|does|did|can|could|will|would|should|is|are|was|were)/i)) {
      detectedStyle = 'question';
    } else if (line.match(/^\d+[%]|^\d+ out of|\d+ percent|statistics?|data shows|research shows/i)) {
      detectedStyle = 'statistic';
    } else if (line.match(/^(once|when|years? ago|last|recently|story|tale)/i)) {
      detectedStyle = 'story';
    }

    // Rotate through styles if we have multiple hooks
    if (hooks.length < hookStyles.length) {
      detectedStyle = hookStyles[hooks.length];
    }

    hooks.push({
      text: line,
      style: detectedStyle,
    });
  }

  return hooks.length > 0 ? hooks : [{ text: content.trim(), style: 'statement' }];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postContent, language, tone, hookStyle } = body;

    if (!postContent || !language || !tone) {
      return NextResponse.json(
        { error: "Missing required parameters: postContent, language, tone" },
        { status: 400 }
      );
    }

    if (!postContent.trim()) {
      return NextResponse.json(
        { error: "Post content cannot be empty" },
        { status: 400 }
      );
    }

    const prompt = buildHookPrompt({
      postContent: postContent.trim(),
      language: language as Language,
      tone: tone as Tone,
      hookStyle: hookStyle as HookStyle | undefined,
    });

    const content = await callOpenRouterForHook([
      { role: "user", content: prompt }
    ]);

    if (!content) {
      throw new Error("No hooks generated");
    }

    const hooks = parseHooks(content, language as Language);

    return NextResponse.json({ hooks });
  } catch (error) {
    logger.error("Error generating hooks:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate hooks";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
