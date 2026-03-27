import { v } from "convex/values";
import { internalAction, internalMutation, mutation } from "./_generated/server";
import { api, internal, components } from "./_generated/api";
// @ts-ignore
import { WorkflowManager } from "@convex-dev/workflow";
import {
    UI_TOOLS,
    ROUTER_TOOL,
} from "./aiModules/tools";
import { getPersonaDirective, getChatSystemInstruction } from "./aiModules/prompts";
import { generateZodSchemaFromString } from "./zodGenerator";

// --- Workflow Manager with retry configuration ---
export const workflow = new WorkflowManager(components.workflow, {
    workpoolOptions: {
        defaultRetryBehavior: {
            maxAttempts: 3,
            initialBackoffMs: 1000,
            base: 2,
        },
        retryActionsByDefault: true,
    }
});

// --- Helper to format canvas data ---
const formatCanvas = (canvas: any) => {
    if (!canvas) return "No Lean Canvas data available.";
    return `
    - Problem: ${canvas.problem || "N/A"}
    - Solution: ${canvas.solution || "N/A"}
    - Value Prop: ${canvas.uniqueValueProposition || "N/A"}
    - Unfair Advantage: ${canvas.unfairAdvantage || "N/A"}
    - Customer Segments: ${canvas.customerSegments || "N/A"}
    - Key Metrics: ${canvas.keyMetrics || "N/A"}
    - Channels: ${canvas.channels || "N/A"}
    - Cost Structure: ${canvas.costStructure || "N/A"}
    - Revenue Streams: ${canvas.revenueStreams || "N/A"}
  `;
};

// ============================================================
// STEP 1: Build full context (query - no side effects)
// ============================================================
export const buildContext = internalAction({
    args: {
        chatId: v.id("chats"),
        pageContext: v.string(),
        projectId: v.optional(v.string()),
        agentId: v.optional(v.id("ai_agents")),
    },
    handler: async (ctx, args): Promise<{
        systemInstruction: string;
        history: Array<{ role: string; parts: Array<{ text: string }> }>;
    }> => {
        // Fetch user data
        const user = await ctx.runQuery(api.users.getUser);

        // Fetch chat history
        const messages = await ctx.runQuery(api.aiChat.getAllMessages, { chatId: args.chatId });
        const history = messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Fetch project context
        let projectContextString = "";
        if (args.projectId) {
            const contextData = await ctx.runQuery(api.aiChat.getProjectContext, { projectId: args.projectId });
            if (contextData) {
                projectContextString = `
=== PROJECT CONTEXT (Use this to inform your answers) ===
${contextData.userContext || ""}

HYPOTHESIS: ${contextData.hypothesis || "Not defined"}

LEAN CANVAS:
${formatCanvas(contextData.canvas)}

EXPENSE LIBRARY (Operating Costs):
${contextData.expenses || "No expenses recorded."}

PITCH DECK SLIDES:
${contextData.slides || "No slides yet."}

RECENT CUSTOMER INTERVIEWS:
${contextData.interviews || "No interviews yet."}

MARKET RESEARCH (Top-Down):
${contextData.marketResearch || "No data yet."}

MARKET RESEARCH (Bottom-Up):
${contextData.bottomUpResearch || "No data yet."}

COMPETITORS:
${contextData.competitorSummary || "No competitors tracked."}
${contextData.competitorAnalysis ? `Competitor Analysis: ${contextData.competitorAnalysis}` : ""}

GOALS & OKRs:
${contextData.goalsSummary || "No goals defined."}

FEATURES & ROADMAP:
${contextData.featuresSummary || "No features defined."}

REVENUE MODEL:
${contextData.revenueSummary || "No revenue streams."}

COST STRUCTURE:
${contextData.costsSummary || "No costs defined."}

RECENT DOCUMENTS:
${contextData.documentsSummary || "No documents."}
=========================================================
                `;
            }
        }

        // Fetch Custom Agent context if present
        let agentDirective = "";

        if (args.agentId) {
            const agent = await ctx.runQuery(internal.aiAgents.getAgentInternal, { agentId: args.agentId });
            if (agent) {
                agentDirective = `[CUSTOM AGENT CONFIGURATION]\nYou are acting as a specialized AI agent named "${agent.name}".\nRole: ${agent.role || 'Unspecified'}\nObjective: ${agent.objective || 'Complete the user request'}\n\n[SYSTEM MESSAGE / DIRECTIVES]\n${agent.systemMessage}`;
            }
        }

        // Build system instruction
        const interactionStyle = user?.onboardingData?.aiInteractionStyle || "Strategist";
        const personaDirective = getPersonaDirective(interactionStyle);
        const baseSystemInstruction = getChatSystemInstruction(args.pageContext, projectContextString, personaDirective);

        const systemInstruction = agentDirective ? `${agentDirective}\n\n[APP CONTEXT]\n${baseSystemInstruction}` : baseSystemInstruction;

        return { systemInstruction, history };
    }
});

// ============================================================
// STEP 2: Stream AI Response (action - has side effects)
// This is the core AI call with streaming + real-time DB updates.
// Gets automatic retries via the workflow manager.
// ============================================================
export const streamAIResponse = internalAction({
    args: {
        chatId: v.id("chats"),
        messageId: v.id("messages"),
        content: v.string(),
        systemInstruction: v.string(),
        history: v.any(), // Array of { role, parts }
        modelName: v.optional(v.string()),
        attemptNumber: v.optional(v.number()), // For retry logic
        thinkingEnabled: v.optional(v.boolean()),
        pageContext: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{
        fullText: string;
        toolCalls: any[];
    }> => {
        const { streamChat, checkModelCapabilities } = await import("./ollamaService");

        // Fetch the user's Stripe Customer ID for billing attribution
        let stripeCustomerId: string | undefined;
        let orgId: string | undefined;
        try {
            const user = await ctx.runQuery(api.users.getUser) as any;
            stripeCustomerId = user?.stripeCustomerId || undefined;
            // The active organization context is needed to retrieve the tenant's allowed AI tools
            orgId = user?.currentOrgId || user?.orgIds?.[0] || undefined;
        } catch {
            // If user query fails, continue without customer ID
        }

        // Resolve Model Name
        const envModel = process.env.OLLAMA_MODEL || "gemma3:12b";
        let modelName = args.modelName || "cloud";
        if (['ollama', 'cloud', 'gemini-3-flash-preview', 'ollama/gemini-3-flash-preview', 'gpt-oss:20b-cloud'].includes(modelName)) {
            modelName = envModel;
        }

        // Build message history for SDK
        const historyForSdk = args.history.map((m: any) => ({
            role: m.role,
            parts: [{ text: m.parts[0]?.text || "" }]
        }));

        // On retry (attempt > 1), strip tools to avoid 500 errors from models
        // that don't support tool schemas well
        const attempt = args.attemptNumber || 1;
        
        let tools = attempt <= 1 ? ROUTER_TOOL : undefined;

        // Apply tenant-level tool filtering if tools are bound for the model
        if (tools && orgId) {
            try {
                const toolsConfig = await ctx.runQuery(internal.apiTools.getToolsConfig, { orgId });
                if (toolsConfig && toolsConfig.toolIds && toolsConfig.toolIds.length > 0) {
                    const allowedIds = new Set(toolsConfig.toolIds);
                    const filtered = UI_TOOLS.filter(t => allowedIds.has(t.function.name));
                    tools = filtered.length > 0 ? filtered : undefined;
                }
            } catch {
                // Ignore query failures (fallback to full tool suite)
            }
            
            // Inject Custom API Integrations
            try {
                const customApis = await ctx.runQuery(internal.apiIntegrations.getIntegrationsInternal, { orgId });
                if (customApis && customApis.length > 0) {
                    const dynamicTools = customApis.map((api: any) => {
                        let schemaStr = "";
                        if (api.description && api.description.includes('### Expected Data Schema:\n')) {
                            schemaStr = api.description.split('### Expected Data Schema:\n')[1] || "";
                        }
                        return {
                            type: "function",
                            function: {
                                name: `custom_api_${api._id}`,
                                description: api.description || `Call the custom API: ${api.name}`,
                                parameters: generateZodSchemaFromString(schemaStr)
                            }
                        };
                    });
                    if (!tools) tools = UI_TOOLS; // If undefined, base it on UI_TOOLS before appending
                    tools = [...tools, ...dynamicTools];

                    // Inject into system prompt so the AI is self-aware of its extended capabilities
                    args.systemInstruction += `\n\n### Custom Integrations Available:\nYou have been granted access to the following custom API tools which are not part of your standard suite. You can call these just like any other tool:\n`;
                    customApis.forEach((api: any) => {
                        args.systemInstruction += `- **custom_api_${api._id}** (${api.name}): ${api.description.split('###')[0].trim()}\n`;
                    });
                }
            } catch {
                // Ignore query failures
            }
        }

        // Capability Check
        const capabilities = await checkModelCapabilities(modelName);
        const supportsTools = capabilities.includes('tools');


        let finalSystemInstruction = args.systemInstruction;

        if (!supportsTools && tools !== undefined) {
            tools = undefined;
            finalSystemInstruction += "\n\n[CRITICAL SYSTEM NOTE: Your current model configuration does NOT support tool calling or function calling. If the user asks you to perform an action that requires tools (like searching the web, generating a report, or fetching live data), you MUST politely inform them that you do not have the capability to use tools because the selected model does not support it.]";
        }

        if (attempt > 1) {
        }

        // Pass think flag to SDK (defaults to true if not specified)
        const think = args.thinkingEnabled !== undefined ? args.thinkingEnabled : true;

        const stream = streamChat(
            modelName,
            historyForSdk.concat([{ role: 'user', parts: [{ text: args.content }] }]),
            finalSystemInstruction,
            undefined, // Use env API Key
            tools,
            think,
            stripeCustomerId
        );

        let fullText = "";
        let accumulatedToolCalls: Record<number, any> = {};

        // Consume Stream
        for await (const chunk of stream) {
            const c = chunk as any;

            // 1. Text Content
            const contentDelta = c.delta || c.choices?.[0]?.delta?.content || c.message?.content || "";

            // 2. Reasoning / Thinking
            const reasoningDelta = c.thinking || c.choices?.[0]?.delta?.reasoning_content || c.message?.thinking || "";

            // 3. Tool Calls
            const toolCallsDelta = c.toolCallDelta ? [c.toolCallDelta] : c.choices?.[0]?.delta?.tool_calls || c.message?.tool_calls;

            if (contentDelta || reasoningDelta) {
                if (contentDelta) fullText += contentDelta;
                await ctx.runMutation(api.aiChat.appendToMessage, {
                    messageId: args.messageId,
                    contentChunk: contentDelta || undefined,
                    reasoningChunk: reasoningDelta || undefined
                });
            }

            if (toolCallsDelta) {
                for (const tc of toolCallsDelta) {
                    const index = tc.index || 0;
                    if (!accumulatedToolCalls[index]) {
                        accumulatedToolCalls[index] = {
                            id: tc.id || "",
                            type: tc.type || "function",
                            function: { name: "", arguments: "" }
                        };
                    }
                    if (tc.id) accumulatedToolCalls[index].id = tc.id;
                    if (tc.function?.name) accumulatedToolCalls[index].function.name = tc.function.name;
                    if (tc.function?.arguments) accumulatedToolCalls[index].function.arguments += tc.function.arguments;
                }
            }
        }

        return {
            fullText,
            toolCalls: Object.values(accumulatedToolCalls)
        };
    }
});

// ============================================================
// STEP 3: Process tool calls (action - parsing + metadata update)
// ============================================================
export const processToolCalls = internalAction({
    args: {
        messageId: v.id("messages"),
        toolCalls: v.any(), // Array of accumulated tool calls
    },
    handler: async (ctx, args): Promise<void> => {
        const finalToolCalls = args.toolCalls;
        if (!finalToolCalls || finalToolCalls.length === 0) return;

        const toolsToStore = await Promise.all(finalToolCalls.map(async (fc: any) => {
            let args_parsed = {};
            try {
                let argStr = fc.function.arguments;
                if (typeof argStr === 'string') {
                    argStr = argStr.replace(/```json\n?|\n?```/g, "").trim();
                }
                args_parsed = JSON.parse(argStr);
            } catch (e) {
                args_parsed = {
                    _error: "Failed to parse JSON",
                    _rawArgs: fc.function.arguments
                };
            }

            let data = args_parsed as any;
            const name = fc.function.name;

            // Normalize name for matching
            const normalizedName = name.toLowerCase();
            let type = 'unknown';
            
            if (normalizedName.startsWith('custom_api_')) {
                try {
                    const apiId = name.replace('custom_api_', '');
                    const apiRecord = await ctx.runQuery(internal.apiIntegrations.getIntegrationByIdInternal, { integrationId: apiId as any });
                    
                    if (apiRecord) {
                        let finalEndpoint = apiRecord.endpoint;
                        let payloadData = { ...data };

                        // 1. Path Variable Replacement ({paramName})
                        const pathVars = finalEndpoint.match(/\{([a-zA-Z0-9_]+)\}/g);
                        if (pathVars) {
                            for (const pathVar of pathVars) {
                                const key = pathVar.replace(/\{|\}/g, '');
                                if (payloadData[key] !== undefined) {
                                    finalEndpoint = finalEndpoint.replace(pathVar, encodeURIComponent(payloadData[key]));
                                    delete payloadData[key];
                                }
                            }
                        }

                        const method = apiRecord.method || "POST";
                        const headers: Record<string, string> = {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiRecord.apiKey}`
                        };
                        const fetchOptions: RequestInit = { method, headers };
                        
                        // 2. Payload / Query Formatting
                        const hasRemainingData = Object.keys(payloadData).length > 0;
                        if (method !== "GET" && method !== "HEAD") {
                            if (hasRemainingData) {
                                fetchOptions.body = JSON.stringify(payloadData);
                            }
                        } else if (hasRemainingData) {
                            const params = new URLSearchParams();
                            for (const [k, v] of Object.entries(payloadData)) {
                                if (v !== undefined && v !== null) {
                                    params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
                                }
                            }
                            const separator = finalEndpoint.includes('?') ? '&' : '?';
                            finalEndpoint += `${separator}${params.toString()}`;
                        }

                        const res = await fetch(finalEndpoint, fetchOptions);
                        if (res.ok) {
                            const resultText = await res.text();
                            try {
                                data = { ...data, _apiResult: JSON.parse(resultText) };
                            } catch {
                                data = { ...data, _apiResult: resultText };
                            }
                            type = 'custom_api';
                        } else {
                            data = { ...data, _error: `API error: ${res.status} ${res.statusText}` };
                            type = 'custom_api';
                        }
                    } else {
                        data = { ...data, _error: "Custom API configuration not found" };
                        type = 'custom_api';
                    }
                } catch (e: any) {
                    data = { ...data, _error: e.message };
                    type = 'custom_api';
                }
            }
            else if (normalizedName === 'rendertable') type = 'table';
            else if (normalizedName === 'renderchart') type = 'chart';
            else if (normalizedName === 'renderpitchdeck') type = 'pitch_deck';
            else if (normalizedName === 'generateimage') type = 'image_gen';
            else if (normalizedName === 'rendermodelcanvas') type = 'model_canvas';
            else if (normalizedName === 'updatestartupjourney') type = 'startup_journey';
            else if (normalizedName === 'rendercustomercards') type = 'customer_cards';
            else if (normalizedName === 'renderfinancialsnapshot') type = 'financial_snapshot';
            else if (normalizedName === 'renderactioncard') type = 'action_card';
            else if (normalizedName === 'renderexpenseanalysis') type = 'expense_analysis';
            else if (normalizedName === 'renderrecommendation') type = 'recommendation';
            else if (normalizedName === 'renderswotanalysis') type = 'swot_analysis';
            else if (normalizedName === 'renderexecutionaudit') type = 'execution_audit';

            if (type === 'unknown') {
                data = { ...data, _originalToolName: name };
            }

            return { type, data };
        }));

        await ctx.runMutation(api.aiChat.updateMessageMetadata, {
            messageId: args.messageId,
            toolResults: JSON.stringify(toolsToStore)
        });
    }
});

// ============================================================
// STEP 3b: Search Grounding (online research with source refs)
// Calls Gemini REST API with Google Search tool
// ============================================================
export const searchGrounding = internalAction({
    args: {
        messageId: v.optional(v.id("messages")),
        query: v.string(),
        systemInstruction: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ text?: string; groundingMetadata?: any }> => {
        const { searchWithGrounding } = await import("./ollamaService");

        try {
            const result = await searchWithGrounding(
                args.query,
                args.systemInstruction || "You are a research and calculation assistant. Provide accurate pricing, cost, and market data with source citations."
            );

            if (result.groundingMetadata && args.messageId) {
                await ctx.runMutation(api.aiChat.updateMessageMetadata, {
                    messageId: args.messageId,
                    groundingMetadata: JSON.stringify(result.groundingMetadata)
                });
            }

            return { text: result.text, groundingMetadata: result.groundingMetadata };
        } catch (error) {
            return { text: undefined, groundingMetadata: undefined };
        }
    }
});

// ============================================================
// STEP 4: Handle workflow completion (onComplete callback)
// ============================================================
export const handleChatComplete = internalMutation({
    args: {
        workflowId: v.any(),
        result: v.any(),
        context: v.any(),
    },
    handler: async (ctx, args): Promise<void> => {
        const { chatId } = args.context || {};
        if (!chatId) return;

        // Find the latest streaming assistant message in this chat
        const streamingMsg = await ctx.db
            .query("messages")
            .withIndex("by_chat_order", (q: any) => q.eq("chatId", chatId))
            .order("desc")
            .first();

        if (!streamingMsg || streamingMsg.status !== "streaming") return;

        if (args.result?.kind === "error") {
            await ctx.db.patch(streamingMsg._id, {
                content: (streamingMsg.content || "") + `\n\n*[System Error: AI service unavailable after multiple retries. Please try again.]*`,
                status: "error"
            });
        }

        if (args.result?.kind === "canceled") {
            await ctx.db.patch(streamingMsg._id, {
                content: (streamingMsg.content || "") + `\n\n*[System: Request was canceled.]*`,
                status: "error"
            });
        }
    }
});

// ============================================================
// THE WORKFLOW: Durable orchestration of AI chat steps
// ============================================================
export const chatWorkflow = (workflow as any).define({
    args: {
        chatId: v.id("chats"),
        content: v.string(),
        pageContext: v.string(),
        modelName: v.optional(v.string()),
        projectId: v.optional(v.string()),
        thinkingEnabled: v.optional(v.boolean()),
        agentId: v.optional(v.id("ai_agents")),
    },
    handler: async (step: any, args: any): Promise<void> => {
        // Step 1: Save user message
        await step.runMutation(api.aiChat.saveMessage, {
            chatId: args.chatId,
            role: 'user',
            content: args.content
        });

        // Step 2: Build context (fetches history, project data, system prompt, agent data)
        const { systemInstruction, history } = await step.runAction(
            internal.aiChatWorkflow.buildContext,
            {
                chatId: args.chatId,
                pageContext: args.pageContext,
                projectId: args.projectId,
                agentId: args.agentId,
            }
        );

        // Step 2b: For Calculator AI — run search grounding FIRST to get real data
        let enrichedSystemInstruction = systemInstruction;
        const isCalculatorAI = args.pageContext?.includes('Calculator AI');
        let groundingMessageId: any = null;

        if (isCalculatorAI) {
            const searchResult = await step.runAction(
                internal.aiChatWorkflow.searchGrounding,
                {
                    messageId: undefined as any, // No message yet — we'll save metadata later
                    query: args.content,
                    systemInstruction: "You are a deep pricing research assistant. Your ONLY job is to find SPECIFIC dollar amounts, price ranges, and cost data. Search for real pricing from venues, service providers, cloud platforms, and industry reports. Return raw pricing data with exact numbers — never return dashes, placeholders, or 'varies'. If exact pricing isn't available, provide typical market ranges based on similar services."
                },
                { retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 } }
            );

            // Inject search results as context for the AI
            if (searchResult?.text || searchResult?.groundingMetadata) {
                const chunks = searchResult.groundingMetadata?.groundingChunks || [];
                const sourceSummary = chunks.map((c: any, i: number) =>
                    `[${i + 1}] ${c.web?.title || 'Source'}: ${c.web?.uri || ''}`
                ).join('\n');

                const researchData = searchResult.text || '';

                enrichedSystemInstruction = `${systemInstruction}\n\n[ONLINE RESEARCH DATA]\nThe following real-time research data has been gathered. You MUST use this data to populate your response with ACTUAL dollar amounts and numbers.\n\nCRITICAL RULES:\n1. NEVER use dashes "-" or "N/A" in table cells. Every cell must have a specific dollar amount or range.\n2. If the research data contains pricing, use those exact numbers.\n3. If pricing for a specific item isn't in the research, provide a reasonable market estimate based on the available data and state it as an estimate.\n4. Do NOT call any search tools or functions — the research is already done for you.\n5. Always include source citations at the end.\n\n${researchData}\n\n[SOURCES]\n${sourceSummary}`;
            }
        }

        // Step 3: Create assistant message placeholder
        const messageId = await step.runMutation(api.aiChat.createAssistantMessage, {
            chatId: args.chatId
        });

        // Step 4: Stream AI response (with automatic retries)
        const { fullText, toolCalls } = await step.runAction(
            internal.aiChatWorkflow.streamAIResponse,
            {
                chatId: args.chatId,
                messageId,
                content: args.content,
                systemInstruction: enrichedSystemInstruction,
                history,
                modelName: args.modelName,
                attemptNumber: 1,
                thinkingEnabled: args.thinkingEnabled,
                pageContext: args.pageContext,
            },
            { retry: { maxAttempts: 3, initialBackoffMs: 2000, base: 2 } }
        );

        // Step 5: Process tool calls if any
        if (toolCalls && toolCalls.length > 0) {
            await step.runAction(
                internal.aiChatWorkflow.processToolCalls,
                { messageId, toolCalls },
                { retry: false } // Tool processing is idempotent but shouldn't retry
            );
        }

        // Step 6: Finalize message
        await step.runMutation(api.aiChat.finalizeMessage, {
            messageId,
            status: "complete"
        });

        // Step 7: Save grounding metadata to the assistant message (for source references UI)
        if (isCalculatorAI) {
            // Re-run a lightweight search to get grounding metadata for the message
            await step.runAction(
                internal.aiChatWorkflow.searchGrounding,
                {
                    messageId,
                    query: args.content,
                    systemInstruction: "Provide accurate data with sources."
                },
                { retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 } }
            );
        }
    }
});

// ============================================================
// PUBLIC ENTRY POINT: Start the chat workflow
// Replaces the old `sendMessage` action
// ============================================================
export const startChat = mutation({
    args: {
        chatId: v.id("chats"),
        content: v.string(),
        pageContext: v.string(),
        modelName: v.optional(v.string()),
        projectId: v.optional(v.string()),
        thinkingEnabled: v.optional(v.boolean()),
        agentId: v.optional(v.id("ai_agents")),
    },
    handler: async (ctx, args): Promise<any> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        // Check usage limits before starting workflow
        const limit = await ctx.runQuery(api.usage.checkLimit, {});
        if (!limit.allowed) {
            throw new Error(JSON.stringify({
                code: "LIMIT_EXCEEDED",
                message: limit.reason,
                isPro: limit.isPro,
                limitType: limit.limitType
            }));
        }

        // Start the durable workflow
        const workflowId: any = await workflow.start(
            ctx,
            internal.aiChatWorkflow.chatWorkflow,
            {
                chatId: args.chatId,
                content: args.content,
                pageContext: args.pageContext,
                modelName: args.modelName,
                projectId: args.projectId,
                thinkingEnabled: args.thinkingEnabled,
                agentId: args.agentId,
            },
            {
                onComplete: internal.aiChatWorkflow.handleChatComplete,
                context: { chatId: args.chatId },
            }
        );

        return workflowId;
    }
});
