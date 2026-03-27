import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { createStripeGateway } from './stripeGateway';
import { streamText, tool } from 'ai';

// Configure the Stripe Gateway AI provider
const customOpenAI = createStripeGateway();

export const streamResponse = httpAction(async (ctx, request) => {
  // CORS Headers
  const origin = request.headers.get("Origin") || "*";
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // Ensure it's a POST request
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { messages, chatId, projectId, pageContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages payload", { status: 400, headers });
    }

    // Build Context (Optional: using existing workflow context builder)
    // For now, we extract the latest message and history natively
    const systemInstruction = "You are a strategic AI assistant. Provide concise and precise answers.";

    // Start native AI stream
    // Note: If you want to use ollamaService locally, we need an @ai-sdk compatible provider
    // This example uses OpenAI, but it directly mirrors the streamText architecture
    const result = streamText({
      model: customOpenAI('gpt-4o-mini'), 
      messages,
      system: systemInstruction,
      onFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        // Here we could persist to Convex Database
        // await ctx.runMutation(api.aiChat.saveMessage, { ... })
      }
    });

    // Transform stream directly into standard Web Response
    const response = result.toTextStreamResponse();

    // Inject CORS headers natively
    for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
    }

    return response;

  } catch (error: any) {
    console.error("HTTP stream error", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
});
