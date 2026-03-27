import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";


// --- END TOOL DEFINITIONS ---

export const createChat = mutation({
    args: {
        projectId: v.optional(v.string()), // Relaxed to string to support localId or string IDs
        agentId: v.optional(v.id("ai_agents")), // Support for Custom Agents
        title: v.string(),
        channel: v.optional(v.string()), // 'adaptive' | 'calculator' — scopes chat to a specific tool
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const subject = identity.subject;

        // Fetch user for orgId
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        // Use DB ID if available, else fallback to identity subject (for non-synced users)
        const finalUserId = user?._id || subject;
        const orgId = user?.orgIds?.[0] || "default";

        // Normalize Project ID
        let validProjectId: Id<"projects"> | undefined = undefined;
        if (args.projectId) {
            validProjectId = ctx.db.normalizeId("projects", args.projectId) || undefined;
            if (!validProjectId) {
                const p = await ctx.db.query("projects").withIndex("by_localId", q => q.eq("localId", args.projectId as string)).first();
                if (p) validProjectId = p._id;
            }
        }

        const chatId = await ctx.db.insert("chats", {
            projectId: validProjectId,
            orgId,
            userId: finalUserId,
            agentId: args.agentId,
            title: args.title,
            channel: args.channel, // Store the channel discriminator
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
        });

        return chatId;
    },
});

// Internal query for Actions to fetch messages
export const getMessagesInternal = internalQuery({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("messages")
            .withIndex("by_chat_order", (q) => q.eq("chatId", args.chatId))
            .collect();
    }
});

import { paginationOptsValidator } from "convex/server";

// Non-paginated query for AI context and internal logic
export const getAllMessages = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        return await ctx.db
            .query("messages")
            .withIndex("by_chat_order", (q) => q.eq("chatId", args.chatId))
            .collect();
    },
});

export const getMessages = query({
    args: {
        chatId: v.id("chats"),
        paginationOpts: paginationOptsValidator
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            // Return empty paginated result for unauthenticated users (stale tabs)
            return { page: [], isDone: true, continueCursor: "" } as any;
        }

        return await ctx.db
            .query("messages")
            .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
            .order("desc")
            .paginate(args.paginationOpts);
    },
});

// Simple approach: collect all messages for this chat, sort by _creationTime ascending.
// No reliance on index ordering or .reverse() - explicit and deterministic.
export const getRecentMessages = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        // Collect all messages for this chat
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
            .collect();
        // Sort by _creationTime ascending (chronological) — explicit, no ambiguity
        messages.sort((a, b) => a._creationTime - b._creationTime);
        return messages;
    },
});

export const listChats = query({
    args: {
        projectId: v.optional(v.string()),
        channel: v.optional(v.string()), // Filter by channel: 'adaptive' | 'calculator'
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        // Determine the User ID to filter by.
        const filterUserId = user?._id || identity.subject;

        // Channel filter helper — matches chats by channel, treating undefined/null as 'adaptive' (backward compat)
        const matchesChannel = (chat: { channel?: string }) => {
            const requestedChannel = args.channel || 'adaptive';
            const chatChannel = chat.channel || 'adaptive'; // Legacy chats without channel default to 'adaptive'
            return chatChannel === requestedChannel;
        };

        if (args.projectId) {
            // Normalize
            let validProjectId = ctx.db.normalizeId("projects", args.projectId);
            if (!validProjectId) {
                const p = await ctx.db.query("projects").withIndex("by_localId", q => q.eq("localId", args.projectId as string)).first();
                if (p) validProjectId = p._id;
            }

            if (validProjectId) {
                const projectChats = await ctx.db
                    .query("chats")
                    .withIndex("by_project", q => q.eq("projectId", validProjectId))
                    .order("desc")
                    .collect();

                // Filter by userId AND channel
                return projectChats.filter(chat => chat.userId === filterUserId && matchesChannel(chat));
            }
            return [];
        }

        if (user) {
            const userChats = await ctx.db
                .query("chats")
                .withIndex("by_user", q => q.eq("userId", user._id))
                .order("desc")
                .collect();
            return userChats.filter(matchesChannel);
        } else {
            const allChats = await ctx.db.query("chats").order("desc").collect();
            return allChats.filter(c => c.userId === identity.subject && matchesChannel(c));
        }
    }
});

export const saveMessage = mutation({
    args: {
        chatId: v.id("chats"),
        role: v.string(),
        content: v.string(),
        toolResults: v.optional(v.string()),
        groundingMetadata: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        // Verify chat exists first to avoid orphaned messages or errors on patching deleted chats
        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            // Chat not found, skipping message save.
            return;
        }

        // Get next order number (Convex agent pattern: deterministic per-chat ordering)
        const lastMsg = await ctx.db
            .query("messages")
            .withIndex("by_chat_order", q => q.eq("chatId", args.chatId))
            .order("desc")
            .first();
        const nextOrder = (lastMsg?.order ?? -1) + 1;

        await ctx.db.insert("messages", {
            chatId: args.chatId,
            role: args.role,
            content: args.content,
            createdAt: Date.now(),
            order: nextOrder,
            status: "complete",
            toolResults: args.toolResults,
            groundingMetadata: args.groundingMetadata
        });

        await ctx.db.patch(args.chatId, {
            lastMessageAt: Date.now()
        });
    }
});

export const updateChatTitle = mutation({
    args: { chatId: v.id("chats"), title: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const chat = await ctx.db.get(args.chatId);
        if (!chat) throw new Error("Chat not found");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        const isOwner = chat.userId === user?._id || chat.userId === identity.subject;
        if (!isOwner) throw new Error("Unauthorized");

        await ctx.db.patch(args.chatId, { title: args.title });
    }
});

export const deleteChat = mutation({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const chat = await ctx.db.get(args.chatId);
        if (!chat) throw new Error("Chat not found");

        // Verify ownership (fallback to subject comparison if userId format differs)
        // We know we save userId as either DB ID or subject.
        // Let's check both possibilities or assume exact match logic from retrieval.
        // Actually, explicit match is best.
        // But for safety, let's just check if identity matches via user lookup or subject.

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        const isOwner = chat.userId === user?._id || chat.userId === identity.subject;

        if (!isOwner) throw new Error("Unauthorized");

        // Delete all messages first
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chat", q => q.eq("chatId", args.chatId))
            .collect();

        await Promise.all(messages.map(m => ctx.db.delete(m._id)));

        // Delete the chat
        await ctx.db.delete(args.chatId);
    }
});

// Internal mutation to append content for streaming
export const appendToMessage = mutation({
    args: {
        messageId: v.id("messages"),
        contentChunk: v.optional(v.string()), // Made optional to allow reasoning-only updates
        // Disable "thinking" for faster response as requested
        reasoningChunk: v.optional(v.string()), // New: Reasoning stream
    },
    handler: async (ctx, args) => {
        const msg = await ctx.db.get(args.messageId);
        if (!msg) return;

        let patches: any = {};
        if (args.contentChunk) {
            patches.content = msg.content + args.contentChunk;
        }
        if (args.reasoningChunk) {
            patches.reasoning = (msg.reasoning || "") + args.reasoningChunk;
        }

        if (Object.keys(patches).length > 0) {
            await ctx.db.patch(args.messageId, patches);
        }
    }
});
export const getProjectContext = query({
    args: { projectId: v.string() },
    handler: async (ctx, args) => {
        let validProjectId = ctx.db.normalizeId("projects", args.projectId);
        if (!validProjectId) {
            const p = await ctx.db.query("projects").withIndex("by_localId", q => q.eq("localId", args.projectId)).first();
            if (p) validProjectId = p._id;
        }

        if (!validProjectId) return null;

        const project = await ctx.db.get(validProjectId);
        if (!project) return null;

        // ── User Context (role from workspace, RAG .md files) ──
        let userContext = "";
        try {
            const identity = await ctx.auth.getUserIdentity();
            if (identity) {
                const user = await ctx.db
                    .query("users")
                    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
                    .first();

                const orgId = user?.orgIds?.[0] || project.orgId || "";

                // Get user's workspace membership & role
                let workspaceRole = "member";
                let workspaceName = "";
                const workspaces = await ctx.db
                    .query("venture_workspaces")
                    .withIndex("by_parentOrg", (q) => q.eq("parentOrgId", orgId))
                    .collect();

                for (const ws of workspaces) {
                    const member = ws.members?.find(m => m.email === (user?.email || identity.email));
                    if (member) {
                        workspaceRole = member.role;
                        workspaceName = ws.name;
                        break;
                    }
                }

                // Build user context
                userContext = `
USER CONTEXT:
- Name: ${user?.name || identity.name || "Unknown"}
- Email: ${user?.email || identity.email || "Unknown"}
- Workspace Role: ${workspaceRole}${workspaceName ? `\n- Workspace: ${workspaceName}` : ""}`;

                // Inject workspace RAG .md files as knowledge context
                const ragDocs = await ctx.db
                    .query("workspace_personality")
                    .withIndex("by_org", (q) => q.eq("orgId", orgId))
                    .collect();
                if (ragDocs.length > 0) {
                    const ragContext = ragDocs
                        .map(d => `### ${d.title || "Context"}\n${d.content}`)
                        .join("\n\n---\n\n");
                    userContext += `\n\nWORKSPACE KNOWLEDGE (RAG):\n${ragContext}`;
                }

                // Include workspace files assigned to this user
                for (const ws of workspaces) {
                    const assignedFiles = ws.files?.filter(f =>
                        f.assignedEmail === (user?.email || identity.email) ||
                        f.assignedUserId === user?._id
                    );
                    if (assignedFiles && assignedFiles.length > 0) {
                        userContext += `\n\nASSIGNED FILES:\n${assignedFiles.map(f => `- ${f.filename}`).join("\n")}`;
                    }
                }
            }
        } catch { /* auth not available in some contexts */ }

        // ── Active Canvas ──
        let canvasData = null;
        if (project.currentCanvasId) {
            canvasData = await ctx.db.get(project.currentCanvasId);
        } else {
            canvasData = await ctx.db
                .query("canvases")
                .withIndex("by_project", q => q.eq("projectId", project._id))
                .first();
        }

        // ── Deck Slides ──
        const slides = await ctx.db
            .query("deck_slides")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .collect();

        // ── Customer Interviews (last 10) ──
        const interviews = await ctx.db
            .query("interviews")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .order("desc")
            .take(10);

        // ── Market Research (Top-Down) ──
        const marketData = await ctx.db
            .query("market_data")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .order("desc")
            .first();

        // ── Market Research (Bottom-Up) ──
        const bottomUpData = await ctx.db
            .query("bottom_up_data")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .order("desc")
            .first();

        // ── Competitors (limit 10) ──
        const competitors = await ctx.db
            .query("competitors")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .take(10);

        // ── Competitor Config ──
        const competitorConfig = await ctx.db
            .query("competitor_config")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .first();

        // ── Goals / OKRs (limit 10) ──
        const goals = await ctx.db
            .query("goals")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .take(10);

        // ── Features / Roadmap (limit 15) ──
        const features = await ctx.db
            .query("features")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .take(15);

        // ── Revenue Streams ──
        const revenueStreams = await ctx.db
            .query("revenue_streams")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .collect();

        // ── Costs ──
        const costs = await ctx.db
            .query("costs")
            .withIndex("by_project", q => q.eq("projectId", project._id))
            .collect();

        // ── Documents (limit 5, most recent) ──
        const documents = await ctx.db
            .query("documents")
            .withIndex("by_project_type", q => q.eq("projectId", project._id))
            .order("desc")
            .take(5);

        // ── Build formatted context strings ──
        const marketResearch = marketData
            ? `TAM: $${(marketData.tam / 1e9).toFixed(1)}B | SAM: $${(marketData.sam / 1e6).toFixed(0)}M | SOM: $${(marketData.som / 1e6).toFixed(0)}M\nNAICS: ${marketData.naicsCode || "N/A"}\nReport: ${(marketData.reportContent || "").slice(0, 500)}`
            : "No top-down market research yet.";

        const bottomUpResearch = bottomUpData
            ? `TAM: $${(bottomUpData.tam / 1e9).toFixed(1)}B | SAM: $${(bottomUpData.sam / 1e6).toFixed(0)}M | SOM: $${(bottomUpData.som / 1e6).toFixed(0)}M\nReport: ${(bottomUpData.reportContent || "").slice(0, 500)}`
            : "No bottom-up market research yet.";

        const competitorSummary = competitors.length > 0
            ? competitors.map(c => {
                let attrs = "";
                try { attrs = Object.entries(JSON.parse(c.attributesData || "{}")).map(([k, v]) => `${k}: ${v}`).join(", "); } catch { }
                return `- ${c.name}${attrs ? ` (${attrs})` : ""}`;
            }).join("\n")
            : "No competitors added yet.";

        const goalsSummary = goals.length > 0
            ? goals.map(g => `- [${g.status}] ${g.title} (${g.type}, ${g.timeframe})`).join("\n")
            : "No goals/OKRs defined yet.";

        const featuresSummary = features.length > 0
            ? features.map(f => `- [${f.status}/${f.priority}] ${f.title}: ${f.description.slice(0, 100)}`).join("\n")
            : "No features in roadmap yet.";

        const revenueSummary = revenueStreams.length > 0
            ? revenueStreams.map(r => `- ${r.name}: $${r.price} (${r.frequency})`).join("\n")
            : "No revenue streams defined.";

        const costsSummary = costs.length > 0
            ? costs.map(c => `- ${c.name}: $${c.amount} (${c.frequency})`).join("\n")
            : "No costs defined.";

        const documentsSummary = documents.length > 0
            ? documents.map(d => `- [${d.type}] ${d.title || "Untitled"}: ${(d.content || "").slice(0, 200)}`).join("\n")
            : "No documents yet.";

        return {
            hypothesis: project.hypothesis,
            canvas: canvasData,
            slides: slides.map(s => `[Slide ${s.order}] ${s.title}: ${s.content} (Notes: ${s.notes})`).join("\n"),
            interviews: interviews.map(i => `[Interview] ${i.customerStatus}: ${i.customData} (Analysis: ${i.aiAnalysis})`).join("\n"),
            expenses: (project.expenseLibrary || []).map(e => `- ${e.name}: $${e.amount} (${e.frequency}, ${e.category || 'General'})`).join("\n"),
            // New context sources
            userContext,
            marketResearch,
            bottomUpResearch,
            competitorSummary,
            competitorAnalysis: competitorConfig?.analysisSummary || "",
            goalsSummary,
            featuresSummary,
            revenueSummary,
            costsSummary,
            documentsSummary,
        };
    }
});

export const createAssistantMessage = mutation({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        // Get next order number
        const lastMsg = await ctx.db
            .query("messages")
            .withIndex("by_chat_order", q => q.eq("chatId", args.chatId))
            .order("desc")
            .first();
        const nextOrder = (lastMsg?.order ?? -1) + 1;

        return await ctx.db.insert("messages", {
            chatId: args.chatId,
            role: 'assistant',
            content: '', // Start empty
            reasoning: '', // Start empty
            createdAt: Date.now(),
            order: nextOrder,
            status: "streaming",
        });
    }
});

// Finalize a streaming message (set status to complete)
export const finalizeMessage = mutation({
    args: {
        messageId: v.id("messages"),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const msg = await ctx.db.get(args.messageId);
        if (!msg) return;
        await ctx.db.patch(args.messageId, { status: args.status || "complete" });
    }
});

export const updateMessageMetadata = mutation({
    args: {
        messageId: v.id("messages"),
        toolResults: v.optional(v.string()),
        groundingMetadata: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, {
            toolResults: args.toolResults,
            groundingMetadata: args.groundingMetadata
        });
    }
});

export const updateMessageTools = mutation({
    args: {
        messageId: v.id("messages"),
        toolCalls: v.any() // Using any to accept array of objects
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, {
            toolResults: JSON.stringify(args.toolCalls)
        });
    }
});

// Helper to safely add milestone
export const addMilestone = mutation({
    args: {
        projectId: v.string(), // accepting string to normalize inside
        milestone: v.any() // The milestone object
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        let validProjectId = ctx.db.normalizeId("projects", args.projectId);
        if (!validProjectId) {
            const p = await ctx.db.query("projects").withIndex("by_localId", q => q.eq("localId", args.projectId)).first();
            if (p) validProjectId = p._id;
        }

        if (!validProjectId) throw new Error("Project not found");

        const project = await ctx.db.get(validProjectId);
        if (!project) throw new Error("Project not found");

        const currentMilestones = project.milestones || [];
        // Append new milestone
        await ctx.db.patch(validProjectId, {
            milestones: [...currentMilestones, args.milestone]
        });
    }
});
