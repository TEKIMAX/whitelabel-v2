"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { callAI } from "./shared";

export const fixDocumentGrammar = action({
    args: {
        text: v.string(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const prompt = `Fix the grammar and improve the flow of the following text, keeping the same meaning and tone. Return ONLY the corrected text, no explanations:\n\n"${args.text}"`;

        const systemInstruction = "You are a professional editor. Fix grammar, spelling, and improve readability while preserving the original meaning and tone.";

        return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], args.modelName || "gemini-3-flash-preview");
    }
});

export const documentAIChat = action({
    args: {
        message: v.string(),
        documentContext: v.string(),
        history: v.optional(v.array(v.object({
            role: v.string(),
            text: v.string()
        }))),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const systemInstruction = `You are a helpful and intelligent writing assistant embedded in a document editor.

Here is the current content of the document the user is working on:
---
${args.documentContext}
---

Answer the user's questions based on this context and your general knowledge. Keep answers concise, helpful, and formatted with Markdown where appropriate.`;

        // Build conversation history for the AI
        const historyParts = args.history?.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        })) || [];

        // Add the new user message
        const contents = [
            ...historyParts,
            { role: 'user', parts: [{ text: args.message }] }
        ];

        return callAI(ctx, contents, systemInstruction, undefined, undefined, 0, [], args.modelName || "gemini-3-flash-preview");
    }
});
