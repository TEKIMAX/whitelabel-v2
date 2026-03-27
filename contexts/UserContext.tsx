import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useConvexAuth } from "convex/react";

// Entitlements type from permissions.ts
export interface Entitlements {
    canUseAIChat: boolean;
    aiModel: "canvas" | "advanced" | "enterprise";
    aiRateLimited: boolean;
    canUseMarketResearch: boolean;
    canUseFinancialModeling: boolean;
    maxActiveProjects: number;
    canAccessSpecialistTools: boolean;
    canAccessDedicatedBackend: boolean;
    tierName: "Explorer" | "Founder" | "Enterprise";
}

// Define the shape of the User object based on your schema
// This matches the return type of api.users.getUser
export interface ConvexUser {
    _id: string;
    _creationTime: number;
    tokenIdentifier: string;
    name?: string;
    email?: string;
    status?: string;
    pictureUrl?: string;
    orgIds: string[];
    currentOrgId?: string;
    roles?: Array<{ orgId: string; role: string }>;
    invitations?: Array<{
        id?: string;
        orgId: string;
        role?: string;
        status: string;
        token?: string;
        acceptUrl?: string;
        orgName?: string;
        inviterName?: string;
        date?: number;
    }>;
    subscriptionStatus?: string;
    endsOn?: number;
    tokenLimit?: number;
    subscriptionTier?: string;
    seatCount?: number;
    isFounder?: boolean;
    onboardingStep: number;
    onboardingData?: {
        role?: string;
        orgSize?: string;
        yearsInBusiness?: string;
        industry?: string;
        startupName?: string;
        hypothesis?: string;
        foundingYear?: string;
        aiInteractionStyle?: string;
    };
    onboardingCompleted: boolean;
    stripeCustomerId?: string;
    subscriptionInterval?: string;
    referralCode?: string;
    referralCount?: number;
    hasReceivedReferralSetupCredit?: boolean;
    publicKey?: string;
    instanceUrl?: string;
    instanceProjectSlug?: string;
    // Added by getUser query
    role: string;
    entitlements: Entitlements;
}

interface UserContextType {
    user: ConvexUser | null | undefined; // undefined = loading, null = not found/logged out
    isLoading: boolean;
    isAuthenticated: boolean;
    /** The active org id — persisted in Convex. Defaults to orgIds[0] if unset. */
    currentOrgId: string | undefined;
    /** Switch the active org. Persisted to Convex so it survives page reloads. */
    switchOrg: (orgId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useConvexAuth();

    // Centralized user fetching
    const user = useQuery(api.users.getUser, isAuthenticated ? {} : "skip");
    const setCurrentOrgMutation = useMutation(api.users.setCurrentOrg);

    // Derive currentOrgId: prefer persisted value, fallback to first orgId
    const currentOrgId = user?.currentOrgId || user?.orgIds?.[0] || undefined;

    const switchOrg = useCallback((orgId: string) => {
        setCurrentOrgMutation({ orgId }).catch((err) => {
            console.error('[UserContext] switchOrg failed:', err);
        });
    }, [setCurrentOrgMutation]);

    const value = {
        user,
        isLoading: isAuthenticated && user === undefined,
        isAuthenticated,
        currentOrgId,
        switchOrg,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
