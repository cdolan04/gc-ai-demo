import type { ActionFunctionArgs } from "react-router";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { authenticate } from "../shopify.server";
import { createTools } from "../lib/ai/tools";
import { buildSystemPrompt } from "../lib/ai/system-prompt";

/**
 * Trim conversation history to keep input tokens under the rate limit.
 * Two strategies:
 * 1. Cap total messages (keep first + most recent)
 * 2. Truncate large tool outputs in older messages — once the AI has analyzed
 *    a 15K-token order payload, resending it on every request is pure waste.
 */
const MAX_UI_MESSAGES = 12;
const KEEP_FULL_RESULTS = 2; // keep full tool outputs only for the last N messages

function trimMessages(messages: UIMessage[]): UIMessage[] {
  const capped =
    messages.length <= MAX_UI_MESSAGES
      ? messages
      : [messages[0], ...messages.slice(-(MAX_UI_MESSAGES - 1))];
  return truncateOldToolResults(capped);
}

function truncateOldToolResults(messages: UIMessage[]): UIMessage[] {
  const cutoff = messages.length - KEEP_FULL_RESULTS;
  return messages.map((msg, i) => {
    if (i >= cutoff || msg.role === "user") return msg;
    const parts = msg.parts.map((part) => {
      if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
        const toolPart = part as { output?: unknown; [key: string]: unknown };
        if (
          toolPart.output &&
          JSON.stringify(toolPart.output).length > 500
        ) {
          // Replace large output with stub — cast back to satisfy UIMessage union
          return Object.assign({}, part, {
            output: "[Previous tool result — data already analyzed]",
          }) as typeof part;
        }
      }
      return part;
    });
    return { ...msg, parts } as UIMessage;
  });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const { messages, welcomeContext } = (await request.json()) as {
    messages: UIMessage[];
    welcomeContext?: string;
  };

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const tools = createTools(admin);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: buildSystemPrompt(welcomeContext),
    messages: await convertToModelMessages(trimMessages(messages)),
    tools,
    maxRetries: 0,
    stopWhen: stepCountIs(6),
    onError: ({ error }) => {
      console.error("streamText error:", error);
    },
  });

  return result.toUIMessageStreamResponse();
};
