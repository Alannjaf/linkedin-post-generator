import { NextRequest } from "next/server";
import { PostGenerationParams, PostLength } from "@/types";
import { buildPostPrompt } from "@/lib/prompts";
import { callOpenRouterStream, callOpenRouterWithWebSearch, type OpenRouterStreamChunk } from "@/lib/api/openrouter-client";
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
    const { context, language, tone, length, trendingHashtags, enableWebSearch } = body;

    if (!context || !language || !tone || !length) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let enrichedContext = context;
    let webSearchCitations: Array<{ url: string; text: string; startIndex: number; endIndex: number }> | undefined = undefined;
    let webSearchStatus: 'idle' | 'searching' | 'completed' | 'failed' = 'idle';
    let webSearchSourceCount = 0;

    // If web search is enabled, search for information about the context first
    if (enableWebSearch) {
      try {
        webSearchStatus = 'searching';
        logger.log("[Stream API] Web search enabled, searching for context information...");
        const webSearchResult = await callOpenRouterWithWebSearch({
          context: `Search for current information about: ${context}. Provide relevant details and context.`,
        });

        // Combine original context with web search results for richer context
        enrichedContext = `${context}\n\nAdditional context from web search:\n${webSearchResult.content}`;
        webSearchCitations = webSearchResult.citations;
        webSearchSourceCount = webSearchResult.citations.length;
        webSearchStatus = 'completed';
        logger.log(`[Stream API] Web search completed, found ${webSearchResult.citations.length} citations`);
      } catch (error) {
        webSearchStatus = 'failed';
        logger.warn("[Stream API] Web search failed, falling back to standard generation:", error);
        // Fallback to standard generation if web search fails
        // Continue with original context
      }
    }

    const prompt = await buildPostPrompt({ context: enrichedContext, language, tone, length });

    // Get the streaming response from OpenRouter
    const openRouterStream = await callOpenRouterStream({
      messages: [{ role: "user", content: prompt }],
    });

    // Create an async iterator to process the stream
    async function* streamProcessor(): AsyncGenerator<string, void, unknown> {
      // Send web search status first if enabled
      if (enableWebSearch) {
        yield `data: ${JSON.stringify({
          status: webSearchStatus,
          sourceCount: webSearchSourceCount,
          message: webSearchStatus === 'completed'
            ? `Found ${webSearchSourceCount} sources`
            : webSearchStatus === 'failed'
              ? 'Web search failed, using provided context'
              : 'Searching the web...'
        })}\n\n`;
      }

      const reader = openRouterStream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
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
              // Send citations if web search was enabled
              if (webSearchCitations && webSearchCitations.length > 0) {
                yield `data: ${JSON.stringify({ citations: webSearchCitations })}\n\n`;
              }
              yield 'data: [DONE]\n\n';
              return;
            }

            try {
              const parsed: OpenRouterStreamChunk = JSON.parse(data);

              if (parsed.error) {
                yield `data: ${JSON.stringify({ error: parsed.error.message })}\n\n`;
                return;
              }

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield `data: ${JSON.stringify({ content })}\n\n`;
              }

              // Check for finish reason
              if (parsed.choices?.[0]?.finish_reason) {
                // Send citations if web search was enabled
                if (webSearchCitations && webSearchCitations.length > 0) {
                  yield `data: ${JSON.stringify({ citations: webSearchCitations })}\n\n`;
                }
                yield 'data: [DONE]\n\n';
                return;
              }
            } catch (parseError) {
              // Skip malformed JSON chunks
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

        // Send citations if web search was enabled
        if (webSearchCitations && webSearchCitations.length > 0) {
          yield `data: ${JSON.stringify({ citations: webSearchCitations })}\n\n`;
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
          const errorMessage = error instanceof Error ? error.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      },
      cancel() {
        // Clean up the iterator
        iterator.return?.(undefined);
      }
    });

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
