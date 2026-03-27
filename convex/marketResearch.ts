import { WorkflowManager } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getProjectSafe } from "./auth";

export const workflow = new WorkflowManager(components.workflow);

export const deepResearch = (workflow as any).define({
    args: {
        projectId: v.string(), // Added for context
        startupData: v.any(),
        keywords: v.optional(v.array(v.string())),
        attachedFiles: v.optional(v.array(v.object({
            name: v.string(),
            data: v.string(),
            mimeType: v.string()
        }))),
        modelName: v.optional(v.string())
    },
    handler: async (step: any, args: any) => {
        try {
            // Parallel Execution of Metrics Analysis
            const [tam, sam, som]: any[] = await Promise.all([
                step.runAction(internal.ai.analyzeMetric, {
                    metric: "TAM",
                    startupData: args.startupData,
                    keywords: args.keywords,
                    attachedFiles: args.attachedFiles,
                    modelName: args.modelName
                }, { name: "analyzeTAM" }),
                step.runAction(internal.ai.analyzeMetric, {
                    metric: "SAM",
                    startupData: args.startupData,
                    keywords: args.keywords,
                    attachedFiles: args.attachedFiles,
                    modelName: args.modelName
                }, { name: "analyzeSAM" }),
                step.runAction(internal.ai.analyzeMetric, {
                    metric: "SOM",
                    startupData: args.startupData,
                    keywords: args.keywords,
                    attachedFiles: args.attachedFiles,
                    modelName: args.modelName
                }, { name: "analyzeSOM" })
            ]);

            // Compile Final Report
            const report: any = await step.runAction(internal.ai.compileResearchReport, {
                tam,
                sam,
                som,
                startupData: args.startupData,
                keywords: args.keywords,
                attachedFiles: args.attachedFiles,
                modelName: args.modelName
            }, { name: "compileReport" });

            // Collect and Deduplicate Sources
            const allSources = [
                ...(tam.sources || []), 
                ...(sam.sources || []), 
                ...(som.sources || [])
            ];
            const uniqueSources = allSources.filter((s, i, arr) => 
                arr.findIndex(x => x.url === s.url) === i
            );

            // Save final result specifically
            await step.runMutation(internal.market.saveMarketAnalysisResult, {
                projectId: args.projectId,
                tam: tam.value,
                sam: sam.value,
                som: som.value,
                reportContent: report,
                sources: uniqueSources
            }, { name: "saveResult" });

            return {
                tam: tam.value,
                sam: sam.value,
                som: som.value,
                reportContent: report,
                sources: uniqueSources
            };
        } catch (error: any) {
            // Explicit failure path prevents UI from hanging
            await step.runMutation(internal.market.resetMarketStatus, {
                projectId: args.projectId,
                status: 'failed'
            }, { name: "failResult" });
            throw error; // Important for Convex system logs
        }
    }
});

export const startResearch = mutation({
    args: {
        projectId: v.string(), // Added for context
        startupData: v.any(),
        keywords: v.optional(v.array(v.string())),
        attachedFiles: v.optional(v.array(v.object({
            name: v.string(),
            data: v.string(),
            mimeType: v.string()
        }))),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args): Promise<any> => {
        // 0. Resolve Project ID
        const project = await getProjectSafe(ctx, args.projectId);
        if (!project) {
            throw new Error("Project not found: " + args.projectId);
        }

        // 1. Start the workflow with REAL ID
        const runId: any = await workflow.start(ctx, internal.marketResearch.deepResearch, {
            ...args,
            projectId: project._id
        });

        // 2. Mark project market data as analyzing + save runId using REAL ID
        const existing = await ctx.db
            .query("market_data")
            .withIndex("by_project", (q) => q.eq("projectId", project._id))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                // @ts-ignore - Schema update pending
                workflowId: runId,
                status: 'analyzing',
                updatedAt: Date.now()
            });
        } else {
            // Create placeholder if not exists
            await ctx.db.insert("market_data", {
                projectId: project._id,
                orgId: project.orgId,
                // @ts-ignore
                workflowId: runId,
                status: 'analyzing',
                updatedAt: Date.now(),
                tam: 0, sam: 0, som: 0, reportContent: ""
            } as any);
        }

        return runId;
    }
});
