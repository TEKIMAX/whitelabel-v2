/**
 * Storage & Usage Reporter — Reports trackable usage from Convex to the Provision Go API.
 *
 * Runs daily via cron (3:00 UTC):
 *   1. Recalculates actual file storage from file records
 *   2. Aggregates AI token usage and function call counts from the usage table
 *   3. POSTs combined usage data to the Go API's /api/usage/report endpoint
 *
 * The Go API calculates overage (Convex Pro included limits + 3% margin), saves to
 * usage_reports table, and Stripe invoice.upcoming webhook adds overages as
 * line items to the next invoice.
 *
 * Only the 3 metrics we can actually measure are tracked:
 *   - fileStorageGb  (from storageQuota.usedBytes)
 *   - aiTokens       (from usage table — sum of tokens this period)
 *   - functionCalls  (from usage table — sum of requests this period)
 */
import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Report all usage metrics to the Provision Go API.
 * Called by dailyUsageSync after recalculating storage.
 */
export const reportUsageToAPI = internalAction({
    args: {},
    handler: async (ctx) => {
        const apiUrl = process.env.PROVISION_API_URL || process.env.VITE_API_URL;
        const apiKey = process.env.BRAIN_SHARED_SECRET || process.env.ADMIN_API_KEY;
        const deploymentName = process.env.CONVEX_CLOUD_URL || process.env.CONVEX_URL || "";

        if (!apiUrl) {
            return;
        }

        // Get all storage quotas (one per org)
        const quotas = await ctx.runQuery(internal.storageReporter.getAllQuotas);
        if (!quotas || quotas.length === 0) {
            return;
        }

        const period = new Date().toISOString().slice(0, 7); // "2026-03"

        for (const quota of quotas) {
            try {
                // 1. File storage from storageQuota
                const fileStorageGB = quota.usedBytes / (1024 ** 3);

                // 2. AI tokens + function calls from usage table
                const usageMetrics = await ctx.runQuery(
                    internal.storageReporter.getOrgUsageForPeriod,
                    { orgId: quota.orgId, period }
                );

                const body = {
                    deploymentId: deploymentName,
                    period,
                    functionCalls: usageMetrics.totalRequests,
                    fileStorageGb: Math.round(fileStorageGB * 1000) / 1000,
                    aiTokens: usageMetrics.totalTokens,
                };

                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                };
                if (apiKey) {
                    headers["X-API-Key"] = apiKey;
                }

                const response = await fetch(`${apiUrl}/api/usage/report`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(
                        `[usageReporter] Failed to report usage for org ${quota.orgId}: ${response.status} ${errorText}`
                    );
                } else {
                    const result = await response.json() as any;

                    // Update the quota with overage info from the API
                    if (result.overageAmountCents !== undefined) {
                        await ctx.runMutation(internal.storageReporter.updateOverageInfo, {
                            orgId: quota.orgId,
                            overageAmountCents: result.overageAmountCents,
                            lastReportedAt: Date.now(),
                            lastReportedPeriod: period,
                        });
                    }
                }
            } catch (error: any) {
                console.error(`[usageReporter] Error reporting for org ${quota.orgId}:`, error.message);
            }
        }
    },
});

/**
 * Daily cron entry point — recalculate storage then report all usage.
 */
export const dailyUsageSync = internalAction({
    args: {},
    handler: async (ctx) => {
        // 1. Get all orgs with storage quotas
        const quotas = await ctx.runQuery(internal.storageReporter.getAllQuotas);
        if (!quotas || quotas.length === 0) return;

        // 2. Recalculate file storage for each org
        for (const quota of quotas) {
            await ctx.runMutation(internal.storageQuota.recalculateUsage, {
                orgId: quota.orgId,
            });
        }

        // 3. Report all usage (storage + AI tokens + function calls) to Go API
        await ctx.runAction(internal.storageReporter.reportUsageToAPI);
    },
});

// ── Internal Queries ──

/**
 * Get all enabled storage quotas (one per org).
 */
export const getAllQuotas = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("storageQuota")
            .filter((q) => q.eq(q.field("enabled"), true))
            .collect();
    },
});

/**
 * Aggregate AI tokens and function call requests for an org within a billing period.
 * Sums up the `usage` table rows where orgId matches and date falls within the period.
 */
export const getOrgUsageForPeriod = internalQuery({
    args: {
        orgId: v.string(),
        period: v.string(), // "2026-03"
    },
    handler: async (ctx, args) => {
        // Get the month boundaries from the period string
        const [year, month] = args.period.split("-");
        const startDate = `${year}-${month}-01`;
        const endMonth = parseInt(month) === 12 ? "01" : String(parseInt(month) + 1).padStart(2, "0");
        const endYear = parseInt(month) === 12 ? String(parseInt(year) + 1) : year;
        const endDate = `${endYear}-${endMonth}-01`;

        // Query all usage records for this org in the billing period
        const usageRecords = await ctx.db
            .query("usage")
            .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
            .collect();

        // Filter to the current period and sum up tokens + requests
        let totalTokens = 0;
        let totalRequests = 0;

        for (const record of usageRecords) {
            if (record.date >= startDate && record.date < endDate) {
                totalTokens += record.tokens || 0;
                totalRequests += record.requests || 0;
            }
        }

        return { totalTokens, totalRequests };
    },
});


/**
 * Update quota with overage info from the Go API response.
 */
export const updateOverageInfo = internalMutation({
    args: {
        orgId: v.string(),
        overageAmountCents: v.number(),
        lastReportedAt: v.number(),
        lastReportedPeriod: v.string(),
    },
    handler: async (ctx, args) => {
        const quota = await ctx.db
            .query("storageQuota")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .unique();

        if (quota) {
            await ctx.db.patch(quota._id, {
                overageAmountCents: args.overageAmountCents,
                lastReportedAt: args.lastReportedAt,
                lastReportedPeriod: args.lastReportedPeriod,
            });
        }
    },
});
