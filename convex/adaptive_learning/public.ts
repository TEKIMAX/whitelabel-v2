import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";


// --- Public API ---

// 1. Get Founder Profile
export const getProfile = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("founder_profile")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
    }
});

// 2. Track Feedback (Negative/Positive)
export const trackFeedback = mutation({
    args: {
        userId: v.string(),
        orgId: v.string(),
        projectId: v.optional(v.string()),
        targetType: v.string(),
        targetId: v.string(),
        rating: v.number(),
        comment: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("feedback_loop", {
            ...args,
            createdAt: Date.now()
        });
    }
});

// 3. Get recent negative feedback
export const getNegativeFeedback = query({
    args: { userId: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        // We can also support org-wide if we pass orgId
        return await ctx.db
            .query("feedback_loop")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            // Filter for negative ratings (<=3) manually or assume caller does?
            // Let's return raw rows, caller filters. Or better, component logic.
            // For simplicity, return the last N items.
            .order("desc")
            .take(args.limit || 5);
    }
});

// 4. Get org-wide negative feedback
export const getOrgNegativeFeedback = query({
    args: { orgId: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("feedback_loop")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .order("desc")
            .take(args.limit || 5);
    }
});

// 5. Add Project Memory
export const addMemory = mutation({
    args: {
        projectId: v.string(),
        orgId: v.string(),
        fact: v.string(),
        category: v.string(),
        confidence: v.number(),
        source: v.string(),
        sourceId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("project_memory", {
            ...args,
            createdAt: Date.now()
        });
    }
});

// 6. Update Profile from Analysis (Internal Mutation)
export const updateProfileFromAnalysis = mutation({
    args: {
        userId: v.string(),
        orgId: v.string(),
        analysisResult: v.string() // JSON string from AI
    },
    handler: async (ctx, args) => {
        const analysis = JSON.parse(args.analysisResult);

        if (!analysis.detectedChanges || !analysis.updates) return;

        const existingProfile = await ctx.db
            .query("founder_profile")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .unique();

        const currentSkills = existingProfile?.skills || {
            financial: 5, technical: 5, marketing: 5, sales: 5, leadership: 5
        };

        const newSkills = {
            ...currentSkills,
            ...(analysis.updates.skills || {})
        };

        const updates = {
            userId: args.userId,
            orgId: args.orgId,
            lastAnalyzed: Date.now(),
            riskTolerance: analysis.updates.riskTolerance,
            learningStyle: analysis.updates.learningStyle,
            communicationStyle: analysis.updates.communicationStyle,
            skills: newSkills,
            rawAnalysis: JSON.stringify(analysis)
        };

        if (existingProfile) {
            await ctx.db.patch(existingProfile._id, updates);
        } else {
            await ctx.db.insert("founder_profile", updates);
        }
    }
});

// 7. Analyze Conversation (Active Memory)
export const consolidateMemory = action({
    args: {
        transcript: v.string(),
        projectId: v.string(),
        orgId: v.string(),
        apiKey: v.string(), // Component isolated env
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { callOllamaInternal } = await import("../ollamaService");
        const model = args.modelName || "gemini-3-flash-preview";

        const prompt = `
            Analyze this conversation between a Founder and an AI Advisor.
            Extract "Key Facts" or "Decisions" that should be remembered for future context.
            Focus on:
            - Strategic decisions (e.g., "Pivot to B2B")
            - Constraints (e.g., "Budget is $5k")
            - Preferences (e.g., "Dislikes playful tone")
            
            Return ONLY a valid JSON array of objects with the following structure:
            [
                { 
                    "fact": "User decided to target Enterprise market", 
                    "category": "Decision", 
                    "confidence": 0.9 
                }
            ]
            
            Transcript:
            ${args.transcript}
        `;

        try {
            const responseText = await callOllamaInternal(
                model,
                prompt,
                undefined,
                "json"
            );

            const facts = JSON.parse(responseText);

            if (Array.isArray(facts)) {
                for (const item of facts) {
                    await ctx.runMutation(api.public.addMemory, {
                        projectId: args.projectId,
                        orgId: args.orgId,
                        fact: item.fact,
                        category: item.category || "General",
                        confidence: item.confidence || 0.8,
                        source: "chat"
                    });
                }
            }
        } catch (e) {
        }
    }
});

// 8. Observer AI (Dynamic Profiling)
export const learnFromSession = action({
    args: {
        transcript: v.string(),
        userId: v.string(),
        orgId: v.string(),
        apiKey: v.string()
    },
    handler: async (ctx, args) => {
        const { callOllamaInternal } = await import("../ollamaService");

        const prompt = `
            You are an expert Educational Psychologist and User Observer.
            Analyze the following conversation to profile the Founder (User).
            
            Focus on these attributes:
            1. Technical Skill (0-10): Does the user understand jargon? Do they ask basic questions like "What is an API?" (Low) or discussion architecture (High)?
            2. Learning Style: Do they ask for examples, metaphors, or raw data?
            
            Current Transcript:
            ${args.transcript}
            
            Return a JSON object with ONLY changes that are detected with high confidence:
            {
                "detectedChanges": true,
                "updates": {
                    "skills": { "technical": 3 }, // Only include if confident
                    "learningStyle": "Analogy-based" // Options: "Visual", "Theoretical", "Example-based", "Analogy-based"
                },
                "reasoning": "User repeatedly asked for metaphors and was confused by 'JSON'."
            }
            
            If no clear signal, return { "detectedChanges": false }.
            RETURN JSON ONLY.
        `;

        try {
            const responseText = await callOllamaInternal(
                "gemini-3-flash-preview",
                prompt,
                undefined,
                "json"
            );

            const analysis = JSON.parse(responseText);

            if (analysis.detectedChanges && analysis.updates) {
                // Call public mutation to update profile
                await ctx.runMutation(api.public.updateProfileFromAnalysis, {
                    userId: args.userId,
                    orgId: args.orgId,
                    analysisResult: JSON.stringify(analysis)
                });
            }

        } catch (e) {
        }
    }
});
// 9. Get Memories
export const getMemories = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("project_memory")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .order("desc")
            .collect();
    }
});

// 10. Get Org Memory Stats (Knowledge Graph)
export const getOrgMemoryStats = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const memories = await ctx.db
            .query("project_memory")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .collect();

        // Calculate "New Insights" (last 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const newInsights = memories.filter(m => m.createdAt > sevenDaysAgo).length;

        return {
            totalNodes: memories.length,
            newInsights,
            recentMemories: memories.slice(0, 5)
        };
    }
});

// 10. Get Org Pulse (Adaptive Score)
export const getOrgPulse = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("founder_profile")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first(); // Assuming one active profile per org for now, or aggregate

        const feedback = await ctx.db
            .query("feedback_loop")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .collect();

        const memoriesCount = (await ctx.db
            .query("project_memory")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .collect()).length;

        // Mock "Adaptive Score" Calculation:
        // Purely data-driven: (Memories * 2) + (Feedback * 5) - (Negative Feedback * 10)
        const negativeFeedback = feedback.filter(f => f.rating <= 2).length;
        const rawScore = (memoriesCount * 2) + (feedback.length * 5) - (negativeFeedback * 10);
        const score = Math.max(0, Math.min(100, Math.round(rawScore)));

        return {
            adaptiveScore: score,
            feedbackCount: feedback.length,
            disconnects: negativeFeedback,
            pendingProposal: profile?.pendingProposal,
            isAdaptiveEnabled: profile?.isAdaptiveEnabled || false,
            adaptiveSystemInstruction: profile?.adaptiveSystemInstruction,
            systemHealth: {
                contextStatus: memoriesCount > 0 ? "Active" : "Idle",
                memoryStrength: memoriesCount > 50 ? "High" : memoriesCount > 10 ? "Medium" : "Low",
                sentimentAccuracy: feedback.length > 0 ? Math.round(((feedback.length - negativeFeedback) / feedback.length) * 100) : 100,
                feedbackLoop: feedback.length > 0 ? "Active" : "Pending"
            }
        };
    }
});

// 11. Propose System Update (Called by AI Observer)
export const proposeSystemUpdate = mutation({
    args: {
        userId: v.string(),
        orgId: v.string(),
        newInstruction: v.string(),
        reasoning: v.string(),
        diffSummary: v.string()
    },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("founder_profile")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .unique();

        if (!profile) return; // Should create if missing? assuming profile exists from observer.

        await ctx.db.patch(profile._id, {
            pendingProposal: {
                newInstruction: args.newInstruction,
                reason: args.reasoning,
                createdAt: Date.now(),
                diff: args.diffSummary
            }
        });
    }
});

// 12. Approve Proposal
export const approveProposal = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("founder_profile")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!profile || !profile.pendingProposal) return;

        await ctx.db.patch(profile._id, {
            adaptiveSystemInstruction: profile.pendingProposal.newInstruction,
            isAdaptiveEnabled: true,
            pendingProposal: undefined, // Clear proposal
            lastAnalyzed: Date.now()
        });
    }
});

// 13. Reject Proposal
export const rejectProposal = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("founder_profile")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!profile) return;

        await ctx.db.patch(profile._id, {
            pendingProposal: undefined
        });
    }
});

// 14. Toggle Adaptability
export const toggleAdaptability = mutation({
    args: { orgId: v.string(), enabled: v.boolean(), userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("founder_profile")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (profile) {
            await ctx.db.patch(profile._id, {
                isAdaptiveEnabled: args.enabled
            });
        } else {
            await ctx.db.insert("founder_profile", {
                orgId: args.orgId,
                userId: args.userId || "system",
                isAdaptiveEnabled: args.enabled,
                lastAnalyzed: Date.now(),
                skills: { financial: 5, technical: 5, marketing: 5, sales: 5, leadership: 5 }
            });
        }
    }
});

// 15. Reset Adaptability
export const resetAdaptability = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const profile = await ctx.db
            .query("founder_profile")
            .withIndex("by_org", q => q.eq("orgId", args.orgId))
            .first();

        if (!profile) return;

        await ctx.db.patch(profile._id, {
            adaptiveSystemInstruction: undefined,
            isAdaptiveEnabled: false,
            pendingProposal: undefined,
            skills: { financial: 5, technical: 5, marketing: 5, sales: 5, leadership: 5 } // Reset skills too? Maybe optional.
        });
    }
});
// 15. Reflective Optimization (Level 3 Adaptivity)
export const reflectiveOptimization = action({
    args: { orgId: v.string(), userId: v.string(), apiKey: v.string() },
    handler: async (ctx, args) => {
        const { callOllamaInternal } = await import("../ollamaService");

        // 1. Fetch System State
        const profile = await ctx.runQuery(api.public.getProfile, { userId: args.userId });
        const feedback = await ctx.runQuery(api.public.getNegativeFeedback, { userId: args.userId, limit: 10 });
        const memories = await ctx.runQuery(api.public.getMemories, { orgId: args.orgId });

        const currentInstruction = profile?.adaptiveSystemInstruction || "You are a standard startup advisor.";

        const prompt = `
            You are a "Self-Optimizing Meta-Intelligence".
            Your goal is to optimize the AI Advisor's system instructions based on the Founder's history.
            
            CURRENT INSTRUCTIONS:
            "${currentInstruction}"
            
            USER PROFILE:
            ${JSON.stringify(profile)}
            
            RECENT CRITICAL FEEDBACK (NEGATIVE):
            ${JSON.stringify(feedback)}
            
            KEY MEMORIES:
            ${JSON.stringify((memories || []).slice(0, 5))}
            
            TASK:
            Propose a NEW, optimized version of the system instructions.
            - If the user has negative feedback about "tone", adjust the tone.
            - If the user has high technical skills, make explanations more advanced.
            - If certain memories are repeated, incorporate them into the identity.
            
            Return a JSON object:
            {
                "newInstruction": "...",
                "reason": "Why did you change this? (e.g., 'Noticed preference for data over anecdotes')",
                "diff": "Brief summary of changes (e.g., 'Tone: Formal -> Direct; Depth: High')"
            }
            RETURN JSON ONLY.
        `;

        try {
            const responseText = await callOllamaInternal(
                "gemini-3-flash-preview",
                prompt,
                undefined,
                "json"
            );

            const proposal = JSON.parse(responseText);

            if (proposal.newInstruction !== currentInstruction) {
                await ctx.runMutation(api.public.proposeSystemUpdate, {
                    userId: args.userId,
                    orgId: args.orgId,
                    newInstruction: proposal.newInstruction,
                    reasoning: proposal.reason,
                    diffSummary: proposal.diff
                });
            }
        } catch (e) {
        }
    }
});

// 17. Join Waitlist
export const joinWaitlist = mutation({
    args: {
        userId: v.string(),
        name: v.string(),
        email: v.string(),
        interest: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        // Check if already exists
        const existing = await ctx.db
            .query("adaptive_waitlist")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .first();

        if (existing) return;

        await ctx.db.insert("adaptive_waitlist", {
            ...args,
            createdAt: Date.now()
        });
    }
});

// 18. Get Waitlist Status
export const getWaitlistStatus = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const entry = await ctx.db
            .query("adaptive_waitlist")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .first();
        return !!entry;
    }
});

// 19. Ping (Health Check)
export const ping = query({
    args: {},
    handler: async () => {
        return "pong";
    }
});
