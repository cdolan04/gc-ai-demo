import type { ActionFunctionArgs } from "react-router";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { authenticate } from "../shopify.server";
import { createTools } from "../lib/ai/tools";
import { buildSystemPrompt } from "../lib/ai/system-prompt";

/**
 * Trim conversation history to keep input tokens under the rate limit.
 * Keeps the first message (initial briefing context) and the most recent messages.
 * This prevents large accumulated tool results from blowing past the 30k/min limit.
 */
const MAX_UI_MESSAGES = 20;

function trimMessages(messages: UIMessage[]): UIMessage[] {
  if (messages.length <= MAX_UI_MESSAGES) return messages;
  // Keep first message (has welcome context) + last (MAX-1) messages
  return [messages[0], ...messages.slice(-(MAX_UI_MESSAGES - 1))];
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const { messages } = (await request.json()) as { messages: UIMessage[] };

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const tools = createTools(admin);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(trimMessages(messages)),
    tools,
    maxRetries: 3,
    stopWhen: stepCountIs(10),
    onStepFinish: ({ toolCalls }) => {
      if (toolCalls?.length) {
        console.log(`[AI] Tools called:`, toolCalls.map((t: any) => t.toolName).join(", "));
      }
    },
    onError: ({ error }) => {
      console.error("streamText error:", error);
    },
  });

  return result.toUIMessageStreamResponse();
};
