import { NextRequest } from "next/server";
import { PostGenerationParams, PostLength } from "@/types";
import { buildPostPrompt } from "@/lib/prompts";
import { callOpenRouterStream, type OpenRouterStreamChunk } from "@/lib/api/openrouter-client";
import { logger } from "@/lib/utils/logger";

// Character count targets based on post length (used in prompts, not as hard limits)
const CHARACTER_TARGETS: Record<PostLength, number> = {
  short: 300,
  medium: 800,
  long: 1500,
};

// Use nodejs runtime for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: PostGenerationParams = await request.json();
    const { context, language, tone, length, trendingHashtags } = body;

    if (!context || !language || !tone || !length) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const prompt = await buildPostPrompt({ context, language, tone, length });
    
    console.log('[Stream API] Starting streaming response for post generation');

    // Get the streaming response from OpenRouter
    const openRouterStream = await callOpenRouterStream({
      messages: [{ role: "user", content: prompt }],
    });

    console.log('[Stream API] OpenRouter stream received, creating response stream');

    // Create an async iterator to process the stream
    async function* streamProcessor(): AsyncGenerator<string, void, unknown> {
      const reader = openRouterStream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`[Stream API] Stream done after ${chunkCount} chunks`);
            break;
          }
          
          chunkCount++;
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
              continue;
            }
            
            const data = trimmedLine.slice(6);
            
            // Check for stream end
            if (data === '[DONE]') {
              console.log('[Stream API] Received [DONE] signal');
              yield 'data: [DONE]\n\n';
              return;
            }
            
            try {
              const parsed: OpenRouterStreamChunk = JSON.parse(data);
              
              if (parsed.error) {
                console.error('[Stream API] OpenRouter error:', parsed.error);
                yield `data: ${JSON.stringify({ error: parsed.error.message })}\n\n`;
                return;
              }
              
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                // Log first few chunks
                if (chunkCount <= 3) {
                  console.log(`[Stream API] Yielding chunk ${chunkCount}:`, content.substring(0, 30));
                }
                yield `data: ${JSON.stringify({ content })}\n\n`;
              }
              
              // Check for finish reason
              if (parsed.choices?.[0]?.finish_reason) {
                console.log('[Stream API] Finish reason:', parsed.choices[0].finish_reason);
                yield 'data: [DONE]\n\n';
                return;
              }
            } catch (parseError) {
              // Skip malformed JSON chunks
              console.debug('[Stream API] Skipping malformed chunk');
            }
          }
        }
        
        // Process remaining buffer
        if (buffer.trim()) {
          const trimmedLine = buffer.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            if (data !== '[DONE]') {
              try {
                const parsed: OpenRouterStreamChunk = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield `data: ${JSON.stringify({ content })}\n\n`;
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
        
        // Send final [DONE]
        yield 'data: [DONE]\n\n';
        
      } finally {
        reader.releaseLock();
      }
    }

    // Convert async iterator to ReadableStream
    const encoder = new TextEncoder();
    const iterator = streamProcessor();
    
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await iterator.next();
          
          if (done) {
            controller.close();
            return;
          }
          
          controller.enqueue(encoder.encode(value));
        } catch (error) {
          console.error('[Stream API] Pull error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      },
      cancel() {
        console.log('[Stream API] Stream cancelled by client');
        // Clean up the iterator
        iterator.return?.(undefined);
      }
    });

    console.log('[Stream API] Returning streaming response');

    // Return as Server-Sent Events
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error("[Stream API] Error generating post:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate post";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
