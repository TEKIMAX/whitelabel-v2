import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    founder_profile: defineTable({
        userId: v.string(), // Link to User
        orgId: v.string(),
        // Psychographic Profile (AI generated/updated)
        riskTolerance: v.optional(v.string()), // e.g., "conservative", "aggressive"
        learningStyle: v.optional(v.string()), // e.g., "visual", "theoretical", "example-based"
        communicationStyle: v.optional(v.string()), // e.g., "direct", "formal", "casual"

        // Skill Matrix (0-10)
        skills: v.optional(v.object({
            financial: v.number(),
            technical: v.number(),
            marketing: v.number(),
            sales: v.number(),
            leadership: v.number()
        })),

        // Raw analysis data
        rawAnalysis: v.optional(v.string()), // JSON string of deep analysis
        lastAnalyzed: v.number(),

        // Adaptive System Configuration
        isAdaptiveEnabled: v.optional(v.boolean()), // Master toggle
        adaptiveSystemInstruction: v.optional(v.string()), // The active override

        // Governance / Proposal Flow
        pendingProposal: v.optional(v.object({
            newInstruction: v.string(),
            reason: v.string(),
            diff: v.optional(v.string()),
            createdAt: v.number()
        })),
    }).index("by_user", ["userId"]).index("by_org", ["orgId"]),

    project_memory: defineTable({
        projectId: v.string(), // ID from main app, stored as string in component
        orgId: v.string(),
        userId: v.optional(v.string()), // Added to fix validation error
        // Core memory unit
        fact: v.string(), // e.g. "User decided to pivot to B2B on Dec 12"
        category: v.string(), // "Decision", "Constraint", "Goal", "Preference"
        confidence: v.number(), // 0-1, how sure is AI about this?
        source: v.string(), // "chat", "document", "manual"
        sourceId: v.optional(v.string()), // ID of message or doc

        // For vector search later (placeholder)
        embedding: v.optional(v.array(v.number())),

        createdAt: v.number(),
    }).index("by_project", ["projectId"]).index("by_org", ["orgId"]),

    feedback_loop: defineTable({
        userId: v.string(),
        orgId: v.string(),
        projectId: v.optional(v.string()), // ID from main app

        // What are we giving feedback on?
        targetType: v.string(), // "chat_response", "document_generation", "coach_tip"
        targetId: v.string(), // ID of the AI output

        // The Signal
        rating: v.number(), // 1 (Bad) to 5 (Good)
        comment: v.optional(v.string()), // "Too vague", "Perfect tone"

        // AI Reflection
        aiReflection: v.optional(v.string()), // System notes on why it failed/succeeded

        createdAt: v.number(),
    }).index("by_user", ["userId"]).index("by_target", ["targetId"]).index("by_org", ["orgId"]),

    adaptive_waitlist: defineTable({
        userId: v.string(),
        name: v.string(),
        email: v.string(),
        interest: v.optional(v.string()), // e.g., "General Interest" or specific feature
        createdAt: v.number(),
    }).index("by_user", ["userId"]).index("by_email", ["email"]),
});
