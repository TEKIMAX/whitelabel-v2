"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { WorkOS } from "@workos-inc/node";

const getWorkOS = () => new WorkOS(process.env.WORKOS_API_KEY!);

export const create = action({
    args: {
        name: v.string(),
        hypothesis: v.optional(v.string()),
        localId: v.optional(v.string()),
        foundingDate: v.optional(v.number())
    },
    handler: async (ctx, args): Promise<any> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Ventures are Convex-only records scoped to the deployment's tenant org.
        // We do NOT create a WorkOS org per venture — the provisioner already created
        // the one WorkOS org for this deployment (WORKOS_ORG_ID). Use that org ID.
        // Fallback order: env var → JWT org_id claim → JWT orgId claim
        const orgId = process.env.WORKOS_ORG_ID
            || (identity as any).org_id
            || (identity as any).orgId;
        if (!orgId) throw new Error("No tenant org found. Set WORKOS_ORG_ID in your Convex environment variables.");

        // Ensure User exists in Convex (Sync) to prevent "User not found" race condition
        await ctx.runMutation(api.users.store, {});

        // Create Project in Convex scoped to the tenant org
        const projectId: any = await ctx.runMutation(internal.projects.createInternal, {
            name: args.name,
            hypothesis: args.hypothesis || "",
            localId: args.localId,
            orgId,
            tokenIdentifier: identity.tokenIdentifier,
            foundingDate: args.foundingDate,
            deploymentId: process.env.DEPLOYMENT_ID,
        });

        return projectId;
    }
});

export const deleteProject = action({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const project = await ctx.runQuery(internal.projects.getProjectInternal, { projectId: args.projectId });
        if (!project) throw new Error("Project not found");

        // Check ownership: project.userId may be stored as raw subject or prefixed tokenIdentifier
        const isOwner = project.userId === identity.subject ||
            project.userId === identity.tokenIdentifier ||
            identity.tokenIdentifier.endsWith(`|${project.userId}`);
        if (!isOwner) throw new Error("Unauthorized: Only the creator can delete the project");

        // Ventures are Convex records — no WorkOS org to delete
        await ctx.runMutation(internal.projects.markDeleted, {
            projectId: args.projectId,
            orgId: project.orgId
        });
    }
});

export const redeployProject = action({
    args: { deploymentId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // The master API URL would typically be configured in environment variables.
        // Assuming the Cloudflare Pages deployment injected it, or we use a known endpoint.
        const apiUrl = process.env.MASTER_API_URL || "https://api.adaptivestartup.io";

        try {
            const response = await fetch(`${apiUrl}/api/deployments/${args.deploymentId}/redeploy`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${identity.tokenIdentifier}` // Forward the JWT to verify ownership
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Master API returned ${response.status}: ${text}`);
            }

            return { success: true };
        } catch (error: any) {
            throw new Error(`Failed to trigger redeployment: ${error.message}`);
        }
    }
});

export const generatePortalLink = action({
    args: {
        orgId: v.string(),
        intent: v.string(), // "sso", "dsync", "audit_logs"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Verify the user has access to this org
        const user = await ctx.runQuery(api.users.getUser);
        if (!user || !user.orgIds.includes(args.orgId)) {
            throw new Error("Unauthorized");
        }

        const workos = getWorkOS();

        try {
            const { link } = await workos.portal.generateLink({
                organization: args.orgId,
                intent: args.intent as any,
            });
            return link;
        } catch (error) {
            throw new Error("Could not generate portal link. Ensure organization exists in WorkOS.");
        }
    }
});
