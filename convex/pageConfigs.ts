import { query, mutation, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const DEFAULT_PAGE_CONFIGS = [
  // Overview (Always accessible)
  { pageKey: "STARTUP_OVERVIEW", category: "Overview", label: "Startup Overview", icon: "Home", sortOrder: 0, visible: true },
  { pageKey: "SETTINGS", category: "Overview", label: "Settings", icon: "Settings", sortOrder: 100, visible: true },
  { pageKey: "DECK", category: "Overview", label: "Pitch Deck", icon: "Presentation", sortOrder: 101, visible: true },
  { pageKey: "NOTIFICATIONS", category: "Overview", label: "Notifications", icon: "Bell", sortOrder: 102, visible: true },

  // Research Hub - From TABS
  { pageKey: "MARKET_RESEARCH", category: "Research Hub", label: "Top-Down Sizing", icon: "Search", sortOrder: 1, visible: true },
  { pageKey: "BOTTOM_UP_SIZING", category: "Research Hub", label: "Bottom-Up Sizing", icon: "BarChart", sortOrder: 2, visible: true },
  { pageKey: "CUSTOMERS", category: "Research Hub", label: "Customer Discovery", icon: "Users", sortOrder: 3, visible: true },
  { pageKey: "COMPETITIVE_MATRIX", category: "Research Hub", label: "Competitive Matrix", icon: "Grid", sortOrder: 4, visible: true },
  { pageKey: "CANVAS_LANDING", category: "Research Hub", label: "Business Model Canvas", icon: "LayoutTemplate", sortOrder: 5, visible: true },
  { pageKey: "MARKET", category: "Research Hub", label: "Research Hub", icon: "Search", sortOrder: 6, visible: false },

  // Strategy - From TABS
  { pageKey: "CANVAS", category: "Strategy", label: "Strategy", icon: "LayoutTemplate", sortOrder: 10, visible: true },
  { pageKey: "GOALS", category: "Strategy", label: "Goals & Objectives", icon: "Flag", sortOrder: 11, visible: true },
  { pageKey: "CALENDAR", category: "Strategy", label: "Calendar", icon: "Calendar", sortOrder: 12, visible: true },
  { pageKey: "BUSINESS_PLAN_BUILDER", category: "Strategy", label: "Business Plan Builder", icon: "FileText", sortOrder: 13, visible: true },
  { pageKey: "JOURNEY", category: "Strategy", label: "Startup Journey", icon: "Map", sortOrder: 14, visible: true },
  { pageKey: "IDEATION", category: "Strategy", label: "Ideation & Whiteboard", icon: "Lightbulb", sortOrder: 15, visible: false },

  // Operations - From TABS
  { pageKey: "WORKSPACE", category: "Operations", label: "Operations", icon: "Briefcase", sortOrder: 20, visible: true },
  { pageKey: "EISENHOWER", category: "Operations", label: "Priority Matrix", icon: "Grid3x3", sortOrder: 21, visible: true },
  { pageKey: "TEAM", category: "Operations", label: "Team & Roles", icon: "Users", sortOrder: 22, visible: true },
  { pageKey: "FILES", category: "Operations", label: "Files & Assets", icon: "Folder", sortOrder: 23, visible: true },
  { pageKey: "LEGAL", category: "Operations", label: "Documents", icon: "Scale", sortOrder: 24, visible: true },
  { pageKey: "WIKI", category: "Operations", label: "Team Wiki", icon: "Book", sortOrder: 25, visible: false },

  // Forecasting - From TABS
  { pageKey: "FORECASTING", category: "Forecasting", label: "Forecasting", icon: "TrendingUp", sortOrder: 30, visible: true },
  { pageKey: "REVENUE", category: "Forecasting", label: "Financial Forecast", icon: "DollarSign", sortOrder: 31, visible: true },
  { pageKey: "EXPENSES", category: "Forecasting", label: "Operating Expenses", icon: "Receipt", sortOrder: 32, visible: true },
  { pageKey: "TOKEN_PRICING", category: "Forecasting", label: "Token Pricing", icon: "Coins", sortOrder: 33, visible: true },
  { pageKey: "CALCULATOR_AI", category: "Forecasting", label: "Calculator AI", icon: "Calculator", sortOrder: 34, visible: false },

  // AI Assistant - From TABS
  { pageKey: "AI_ASSISTANT", category: "AI Assistant", label: "Adaptive Engine", icon: "MessageSquare", sortOrder: 40, visible: true },
  { pageKey: "HUMAN_AI_COOPERATION", category: "AI Assistant", label: "Cooperation Report", icon: "Users", sortOrder: 41, visible: true },

  // Hidden/Pro Features
  { pageKey: "LANDING_PAGE", category: "Overview", label: "Landing Page Builder", icon: "Globe", sortOrder: 50, visible: false },
  { pageKey: "ADAPTIVE_LEARNING", category: "AI", label: "Adaptive Learning", icon: "Brain", sortOrder: 51, visible: false },
  { pageKey: "AI_DIAGNOSTIC", category: "AI", label: "AI Diagnostics", icon: "Activity", sortOrder: 52, visible: false },
  { pageKey: "AGENTS", category: "AI", label: "Custom Agents", icon: "Bot", sortOrder: 53, visible: false },
  { pageKey: "COMPETITORS", category: "Research Hub", label: "Competitor Analysis", icon: "Target", sortOrder: 54, visible: false },
  { pageKey: "GRANT", category: "Strategy", label: "Grant & Funding", icon: "DollarSign", sortOrder: 55, visible: false },
  { pageKey: "REPORT", category: "Strategy", label: "White Paper Generator", icon: "FileText", sortOrder: 56, visible: false },
  { pageKey: "BUSINESS_PLAN", category: "Strategy", label: "Business Plan", icon: "FileText", sortOrder: 57, visible: false },
  { pageKey: "SAFE", category: "Operations", label: "SAFE Generator", icon: "FileSignature", sortOrder: 58, visible: false },
  { pageKey: "VESTING", category: "Operations", label: "Vesting Agreement", icon: "Clock", sortOrder: 59, visible: false },
  { pageKey: "ENGINEERING", category: "Operations", label: "Engineering", icon: "Code", sortOrder: 60, visible: false },
  { pageKey: "INITIATIVES", category: "Strategy", label: "Initiatives & Divisions", icon: "Layers", sortOrder: 61, visible: false },
  { pageKey: "REVENUE_OPS", category: "Finance", label: "Revenue Operations", icon: "DollarSign", sortOrder: 62, visible: false },
  { pageKey: "STRIPE_DASHBOARD", category: "Finance", label: "Payouts & Invoices", icon: "CreditCard", sortOrder: 63, visible: false },
  { pageKey: "SUBSCRIPTION", category: "Finance", label: "Subscription", icon: "Repeat", sortOrder: 64, visible: false },
];

export const getByOrg = query({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const configs = await ctx.db
      .query("page_configs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    if (configs.length === 0) {
      return DEFAULT_PAGE_CONFIGS;
    }

    return configs.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const getVisiblePages = query({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const configs = await ctx.db
      .query("page_configs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("visible"), true))
      .collect();

    if (configs.length === 0) {
      return DEFAULT_PAGE_CONFIGS.filter(c => c.visible);
    }

    return configs.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const getCategories = query({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const configs = await ctx.db
      .query("page_configs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("visible"), true))
      .collect();

    if (configs.length === 0) {
      const categories = [...new Set(DEFAULT_PAGE_CONFIGS.filter(c => c.visible).map(c => c.category))];
      return categories.map((cat, i) => ({
        key: cat,
        label: cat,
        sortOrder: DEFAULT_PAGE_CONFIGS.find(c => c.category === cat)?.sortOrder || i * 10,
      }));
    }

    const categoryMap = new Map<string, number>();
    configs.forEach(c => {
      if (!categoryMap.has(c.category) || categoryMap.get(c.category)! > c.sortOrder) {
        categoryMap.set(c.category, c.sortOrder);
      }
    });

    return Array.from(categoryMap.entries())
      .map(([key, sortOrder]) => ({ key, label: key, sortOrder }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const upsert = mutation({
  args: {
    orgId: v.string(),
    pageKey: v.string(),
    category: v.optional(v.string()),
    label: v.optional(v.string()),
    visible: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    customLabel: v.optional(v.string()),
    customIcon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, pageKey, ...updates } = args;

    const existing = await ctx.db
      .query("page_configs")
      .withIndex("by_org_page", (q) => q.eq("orgId", orgId).eq("pageKey", pageKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...updates,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const defaultConfig = DEFAULT_PAGE_CONFIGS.find(c => c.pageKey === pageKey);

    return await ctx.db.insert("page_configs", {
      orgId,
      pageKey,
      category: updates.category || defaultConfig?.category || "General",
      label: updates.label || defaultConfig?.label || pageKey,
      icon: updates.customIcon || defaultConfig?.icon,
      sortOrder: updates.sortOrder ?? defaultConfig?.sortOrder ?? 100,
      visible: updates.visible ?? defaultConfig?.visible ?? true,
      customLabel: updates.customLabel,
      customIcon: updates.customIcon,
      updatedAt: Date.now(),
    });
  },
});

export const batchUpdate = mutation({
  args: {
    orgId: v.string(),
    pages: v.array(v.object({
      pageKey: v.string(),
      category: v.optional(v.string()),
      label: v.optional(v.string()),
      visible: v.optional(v.boolean()),
      sortOrder: v.optional(v.number()),
      customLabel: v.optional(v.string()),
      customIcon: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { orgId, pages }) => {
    for (const page of pages) {
      const existing = await ctx.db
        .query("page_configs")
        .withIndex("by_org_page", (q) => q.eq("orgId", orgId).eq("pageKey", page.pageKey))
        .first();

      if (existing) {
        const updates: any = { updatedAt: Date.now() };
        if (page.category !== undefined) updates.category = page.category;
        if (page.label !== undefined) updates.label = page.label;
        if (page.visible !== undefined) updates.visible = page.visible;
        if (page.sortOrder !== undefined) updates.sortOrder = page.sortOrder;
        if (page.customLabel !== undefined) updates.customLabel = page.customLabel;
        if (page.customIcon !== undefined) updates.customIcon = page.customIcon;

        await ctx.db.patch(existing._id, updates);
      } else {
        const defaultConfig = DEFAULT_PAGE_CONFIGS.find(c => c.pageKey === page.pageKey);
        await ctx.db.insert("page_configs", {
          orgId,
          pageKey: page.pageKey,
          category: page.category || defaultConfig?.category || "General",
          label: page.label || defaultConfig?.label || page.pageKey,
          icon: defaultConfig?.icon,
          sortOrder: page.sortOrder ?? defaultConfig?.sortOrder ?? 100,
          visible: page.visible ?? defaultConfig?.visible ?? true,
          customLabel: page.customLabel,
          customIcon: page.customIcon,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

export const hidePage = mutation({
  args: { orgId: v.string(), pageKey: v.string() },
  handler: async (ctx, { orgId, pageKey }) => {
    const existing = await ctx.db
      .query("page_configs")
      .withIndex("by_org_page", (q) => q.eq("orgId", orgId).eq("pageKey", pageKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { visible: false, updatedAt: Date.now() });
      return existing._id;
    }

    const defaultConfig = DEFAULT_PAGE_CONFIGS.find(c => c.pageKey === pageKey);
    return await ctx.db.insert("page_configs", {
      orgId,
      pageKey,
      category: defaultConfig?.category || "General",
      label: defaultConfig?.label || pageKey,
      icon: defaultConfig?.icon,
      sortOrder: defaultConfig?.sortOrder ?? 100,
      visible: false,
      updatedAt: Date.now(),
    });
  },
});

export const showPage = mutation({
  args: { orgId: v.string(), pageKey: v.string() },
  handler: async (ctx, { orgId, pageKey }) => {
    const existing = await ctx.db
      .query("page_configs")
      .withIndex("by_org_page", (q) => q.eq("orgId", orgId).eq("pageKey", pageKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { visible: true, updatedAt: Date.now() });
      return existing._id;
    }

    const defaultConfig = DEFAULT_PAGE_CONFIGS.find(c => c.pageKey === pageKey);
    return await ctx.db.insert("page_configs", {
      orgId,
      pageKey,
      category: defaultConfig?.category || "General",
      label: defaultConfig?.label || pageKey,
      icon: defaultConfig?.icon,
      sortOrder: defaultConfig?.sortOrder ?? 100,
      visible: true,
      updatedAt: Date.now(),
    });
  },
});

export const resetToDefaults = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const existing = await ctx.db
      .query("page_configs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    for (const config of existing) {
      await ctx.db.delete(config._id);
    }

    const now = Date.now();
    for (const config of DEFAULT_PAGE_CONFIGS) {
      await ctx.db.insert("page_configs", {
        orgId,
        ...config,
        updatedAt: now,
      });
    }

    return { success: true, count: DEFAULT_PAGE_CONFIGS.length };
  },
});

export const seedDefaults = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const existing = await ctx.db
      .query("page_configs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    if (existing) {
      return { skipped: true, reason: "already seeded" };
    }

    const now = Date.now();
    for (const config of DEFAULT_PAGE_CONFIGS) {
      await ctx.db.insert("page_configs", {
        orgId,
        ...config,
        updatedAt: now,
      });
    }

    return { success: true, count: DEFAULT_PAGE_CONFIGS.length };
  },
});

export const syncFromAPI = action({
  args: {
    deploymentId: v.optional(v.string()),
    orgId: v.string(),
  },
  handler: async (ctx, { deploymentId, orgId }) => {
    const provisionApiUrl = process.env.VITE_API_URL;
    const effectiveDeploymentId = deploymentId || process.env.DEPLOYMENT_ID;

    if (!provisionApiUrl) {
      return { success: false, error: "No API URL" };
    }

    if (!effectiveDeploymentId) {
      return { success: false, error: "No deployment ID" };
    }

    try {
      const response = await fetch(`${provisionApiUrl}/api/public/deployments/${effectiveDeploymentId}/pages/visible`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `API returned ${response.status}` };
      }

      const data = await response.json();
      const pages = data.items || data;

      if (pages.length > 0) {
        await ctx.runMutation(internal.pageConfigs.syncFromProvisioning, {
          orgId,
          pages: pages.map((p: any) => ({
            pageKey: p.pageKey,
            category: p.category,
            label: p.label,
            icon: p.icon,
            sortOrder: p.sortOrder,
            visible: p.visible,
            customLabel: p.customLabel,
            customIcon: p.customIcon,
          })),
        });
      }

      return { success: true, count: pages.length };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

export const syncFromProvisioning = internalMutation({
  args: {
    orgId: v.string(),
    pages: v.array(v.object({
      pageKey: v.string(),
      category: v.string(),
      label: v.string(),
      icon: v.optional(v.string()),
      sortOrder: v.number(),
      visible: v.boolean(),
      customLabel: v.optional(v.string()),
      customIcon: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { orgId, pages }) => {
    const now = Date.now();

    for (const page of pages) {
      const existing = await ctx.db
        .query("page_configs")
        .withIndex("by_org_page", (q) => q.eq("orgId", orgId).eq("pageKey", page.pageKey))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          category: page.category,
          label: page.label,
          icon: page.icon,
          sortOrder: page.sortOrder,
          visible: page.visible,
          customLabel: page.customLabel,
          customIcon: page.customIcon,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("page_configs", {
          orgId,
          ...page,
          updatedAt: now,
        });
      }
    }

    return { success: true, count: pages.length };
  },
});