"use node";
import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { api, internal, components } from "../_generated/api";
import { callAI } from "./shared";

export const chatWithAIAnalyst = action({
    args: {
        startupData: v.any(),
        module: v.string(), // 'competitors' | 'revenue'
        history: v.array(v.object({
            role: v.string(), // 'user' | 'assistant'
            content: v.string()
        })),
        userQuestion: v.string(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;

        let context = "";
        if (args.module === 'competitors') {
            context = `
                Startup: ${data.name}
                Competitor Analysis Context:
                - Existing Summary: ${data.competitorAnalysis.analysisSummary}
                - Competitors: ${JSON.stringify(data.competitorAnalysis.competitors.map((c: any) => ({ name: c.name, ...c.attributesData })))}
            `;
        } else {
            context = `
                Startup: ${data.name}
                Financial Model Context:
                - Business Model: ${data.revenueModel.businessModelType}
                - Revenue Streams: ${JSON.stringify(data.revenueModel.revenueStreams)}
                - Cost Structure: ${JSON.stringify(data.revenueModel.costStructure)}
                - Metrics: Growth ${data.revenueModel.monthlyGrowthRate}%, Churn ${data.revenueModel.churnRate}%, CAC $${data.revenueModel.cac}.
            `;
        }

        const systemInstruction = `
            You are an AI Analyst for a startup called "${data.name}".
            Your goal is to answer follow-up questions about the ${args.module === 'competitors' ? 'Competitive Matrix' : 'Financial Forecast'}.
            
            CONTEXT:
            ${context}
            
            GUIDELINES:
            1. Be concise, professional, and data-driven.
            2. If the user asks for new comparisons or projections, use the provided context to infer reasonable answers.
            3. Always wrap key financial metrics like dollar amounts ($1,000), percentages (15%), 'Churn', 'CAC', and 'Growth' in **bold** so the UI can render them as badges.
            4. If a question is unrelated to the startup or the analysis, politely bring them back to the topic.
        `;

        // Format history for Gemini
        const contents = args.history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Append current question
        contents.push({
            role: 'user',
            parts: [{ text: args.userQuestion }]
        });

        return callAI(ctx, contents, systemInstruction, undefined, undefined, 0, [], args.modelName || "gemini-3-flash-preview");
    }
});

export const analyzeConversation = action({
    args: {
        chatId: v.id("chats"),
        projectId: v.optional(v.id("projects")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // 1. Fetch messages using internal query
        const messages = await ctx.runQuery(internal.aiChat.getMessagesInternal, {
            chatId: args.chatId
        });

        if (!messages || messages.length < 5) return;

        // 2. Format transcript
        const transcript = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

        // 3. Resolve Org ID
        let orgId = "default";
        if (args.projectId) {
            const project = await ctx.runQuery(internal.projects.getProjectInternal, { projectId: args.projectId });
            if (project) orgId = project.orgId || "default";
        }

        // 4. Delegate to Component
        const apiKey = process.env.GEMINI_API_KEY || "";

        await ctx.runAction(components.adaptive_learning.public.consolidateMemory, {
            transcript: transcript,
            projectId: args.projectId ? args.projectId : "global",
            orgId: orgId,
            apiKey: apiKey
        });

        // 5. Trigger Profiling
        const user = await ctx.runQuery(api.users.getUser, {});
        if (user) {
            await ctx.runAction(components.adaptive_learning.public.learnFromSession, {
                transcript: transcript,
                userId: user._id,
                orgId: orgId,
                apiKey: apiKey
            });
        }
    }
});
