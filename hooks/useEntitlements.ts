import React from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Entitlements } from "../convex/permissions";
import { isProOverridden, subscribeToProOverride } from "../lib/pro-override";

export function useEntitlements() {
    const user = useQuery(api.users.getUser);

    // ALL FEATURES FREE — no pro blocking
    return {
        canUseAIChat: true,
        aiModel: "advanced",
        aiRateLimited: false,
        canUseMarketResearch: true,
        canUseFinancialModeling: true,
        maxActiveProjects: 999,
        canAccessSpecialistTools: true,
        canAccessDedicatedBackend: true,
        tierName: "Founder",
        plan: "Pro",
        isLoading: false,
        isLoggedIn: !!user
    };
}

