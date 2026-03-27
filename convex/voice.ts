// @ts-nocheck — Schema too large for TS type inference (62 tables). Convex validates at runtime.
"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";


export const processAudioQuestion = action({
    args: {
        audioData: v.string(), // Base64 encoded audio
        mimeType: v.string(),
        startupData: v.any(), // Context
        history: v.optional(v.array(v.object({
            role: v.string(),
            text: v.string()
        })))
    },
    handler: async (ctx, args) => {
        try {

            // User requested "actual conversational model" - gemini-2.0-flash-exp is the latest multimodal one.
            // gemini-1.5-pro is also good but 2.0 is faster for voice.
            const modelName = "gemini-2.0-flash-exp";

            const userPrompt = "Listen to the user's answer or question. Compare it against their Business Model Canvas context provided below. Guide them or quiz them on the next logical step. You have access to Google Search if you need to fetch real-time examples or market data to help them. Keep your response conversational, encouraging, and brief (under 3 sentences) so it flows naturally as a voice conversation.";

            const contextBlock = `
            [Startup Context]
            Name: ${args.startupData.name}
            Hypothesis: ${args.startupData.hypothesis}
            Problem: ${args.startupData.canvas['Problem'] || 'N/A'}
            Solution: ${args.startupData.canvas['Solution'] || 'N/A'}
            Customer Segments: ${args.startupData.canvas['Customer Segments'] || 'N/A'}
            `;

            // Prepare parts for callOllamaInternal
            // The Rust API now supports `inline_data` via generic mapping in gemini.rs
            const parts: any[] = [
                { text: contextBlock },
                { text: args.history ? `Previous conversation:\n${args.history.map(h => `${h.role}: ${h.text}`).join('\n')}` : "" },
                { text: "User's Audio Input:" },
                {
                    inlineData: {
                        mimeType: args.mimeType,
                        data: args.audioData
                    }
                },
                { text: userPrompt }
            ];

            // Enable Google Search Tool via standardized format
            // Rust API maps "google_search" type correctly to "googleSearchRetrieval"
            const tools = [{ type: "google_search" }];

            // Import dynamically to avoid circular deps
            const { callOllamaInternal } = await import("./ollamaService");

            // Execute via Rust API (Secure Gateway)
            // This prevents exposing keys or logic on client side as requested.
            // The System Prompt is injected here as part of the Context Block/User Prompt structure 
            // which is standard for Gemini.
            const textResponse = await callOllamaInternal(
                modelName,
                [{ role: 'user', parts: parts }],
                undefined, // No separate system instruction
                undefined, // Format
                undefined, // API Key (auto-resolved to server env, then Rust API)
                tools
            );

            return {
                text: textResponse || "I didn't catch that. Could you say it again?",
            };

        } catch (error) {
            return {
                text: "I'm having trouble hearing you right now. Please try again."
            };
        }
    }
});
