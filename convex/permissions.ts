import { Doc } from "./_generated/dataModel";

// ─── WorkOS Entitlement Feature Slugs ───────────────────────────────────────
// These are defined in the WorkOS dashboard under Features, mapped to Stripe product features.
// They appear in the WorkOS JWT as `entitlements: string[]`.
export const ENTITLEMENT_SLUGS = {
    // Plans
    STANDARD_PLAN: "standard-plan",
    ENTERPRISE_PLAN: "enterprise-plan",

    // Features
    MARKET_RESEARCH: "market-research",
    FINANCIAL_MODELING: "financial-modeling",
    AI_CHAT: "ai-chat",
    SPECIALIST_TOOLS: "specialist-tools",
    DEDICATED_BACKEND: "dedicated-backend",
} as const;

/**
 * Map WorkOS JWT entitlements array to the app Entitlements shape.
 * Used alongside `getEntitlements` — WorkOS entitlements take precedence when present.
 */
export function getEntitlementsFromWorkOS(jwtEntitlements: string[]): Entitlements | null {
    if (!jwtEntitlements || jwtEntitlements.length === 0) return null;

    const has = (slug: string) => jwtEntitlements.includes(slug);

    if (has(ENTITLEMENT_SLUGS.ENTERPRISE_PLAN)) {
        return {
            canUseAIChat: true,
            aiModel: "enterprise",
            aiRateLimited: false,
            canUseMarketResearch: true,
            canUseFinancialModeling: true,
            maxActiveProjects: 5,
            canAccessSpecialistTools: true,
            canAccessDedicatedBackend: true,
            tierName: "Enterprise",
        };
    }

    if (has(ENTITLEMENT_SLUGS.STANDARD_PLAN)) {
        return {
            canUseAIChat: has(ENTITLEMENT_SLUGS.AI_CHAT) || true,
            aiModel: "advanced",
            aiRateLimited: false,
            canUseMarketResearch: has(ENTITLEMENT_SLUGS.MARKET_RESEARCH),
            canUseFinancialModeling: has(ENTITLEMENT_SLUGS.FINANCIAL_MODELING),
            maxActiveProjects: 3,
            canAccessSpecialistTools: has(ENTITLEMENT_SLUGS.SPECIALIST_TOOLS),
            canAccessDedicatedBackend: has(ENTITLEMENT_SLUGS.DEDICATED_BACKEND),
            tierName: "Founder",
        };
    }

    // No recognized plan entitlement
    return null;
}


export type Entitlements = {
    canUseAIChat: boolean;
    aiModel: "canvas" | "advanced" | "enterprise"; // "canvas" = limited, "advanced" = pro, "enterprise" = all
    aiRateLimited: boolean; // true = restricted query count/size
    canUseMarketResearch: boolean;
    canUseFinancialModeling: boolean;
    maxActiveProjects: number;
    canAccessSpecialistTools: boolean;
    canAccessDedicatedBackend: boolean;
    tierName: "Explorer" | "Founder" | "Enterprise";
};

export const TIER_CONSTANTS = {
    STARTER: "starter", // Explorer
    PRO: "pro",         // Founder
    ENTERPRISE: "enterprise" // Enterprise
};

export function getEntitlements(user: Doc<"users">): Entitlements {
    const tier = user.subscriptionTier || TIER_CONSTANTS.STARTER;
    const status = user.subscriptionStatus || "inactive";
    const now = Date.now();

    // Check if trial is active
    const isTrialing = status === "trialing" && user.endsOn && user.endsOn > now;
    const isActive = status === 'active' || isTrialing;

    // Defaults for inactive/expired
    if (!isActive) {
        return {
            canUseAIChat: false,
            aiModel: "canvas",
            aiRateLimited: true,
            canUseMarketResearch: false,
            canUseFinancialModeling: false,
            maxActiveProjects: 0, // Read-only potentially
            canAccessSpecialistTools: false, // "sub access tool"
            canAccessDedicatedBackend: false,
            tierName: "Explorer"
        };
    }

    // Enterprise
    if (tier === TIER_CONSTANTS.ENTERPRISE) {
        return {
            canUseAIChat: true,
            aiModel: "enterprise",
            aiRateLimited: false,
            canUseMarketResearch: true,
            canUseFinancialModeling: true,
            maxActiveProjects: 5,
            canAccessSpecialistTools: true,
            canAccessDedicatedBackend: true,
            tierName: "Enterprise"
        };
    }

    // Founder (Pro) or Active Trial
    if (tier === TIER_CONSTANTS.PRO || isTrialing) {
        return {
            canUseAIChat: true, // "Context-Aware AI Chat"
            aiModel: "advanced",
            aiRateLimited: false,
            canUseMarketResearch: true,
            canUseFinancialModeling: true,
            // Landing page says "1 Active Project" for Explorer. Enterprise "5 Active Projects".
            // We set Founder to 3 projects as a middle ground.
            maxActiveProjects: 3,
            canAccessSpecialistTools: true,
            canAccessDedicatedBackend: false,
            tierName: "Founder"
        };
    }

    // Explorer (Starter) - Default Active/Trial
    return {
        canUseAIChat: true, // "AI Chat App" (Full Access)
        aiModel: "advanced",
        aiRateLimited: true,
        canUseMarketResearch: false, // Restricted
        canUseFinancialModeling: false,
        maxActiveProjects: 1,
        canAccessSpecialistTools: false,
        canAccessDedicatedBackend: false,
        tierName: "Explorer"
    };
}
