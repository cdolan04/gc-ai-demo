import type { ActionFunctionArgs } from "react-router";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { authenticate } from "../shopify.server";
import { createTools } from "../lib/ai/tools";
import { buildSystemPrompt } from "../lib/ai/system-prompt";

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
    messages: await convertToModelMessages(messages),
    tools,
    maxRetries: 5,
    stopWhen: stepCountIs(10),
    onError: ({ error }) => {
      console.error("streamText error:", error);
    },
  });

  return result.toUIMessageStreamResponse();
};
