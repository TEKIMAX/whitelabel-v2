/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    public: {
      addMemory: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          confidence: number;
          fact: string;
          orgId: string;
          projectId: string;
          source: string;
          sourceId?: string;
        },
        any,
        Name
      >;
      approveProposal: FunctionReference<
        "mutation",
        "internal",
        { orgId: string },
        any,
        Name
      >;
      consolidateMemory: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          modelName?: string;
          orgId: string;
          projectId: string;
          transcript: string;
        },
        any,
        Name
      >;
      getMemories: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        any,
        Name
      >;
      getNegativeFeedback: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any,
        Name
      >;
      getOrgMemoryStats: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        any,
        Name
      >;
      getOrgNegativeFeedback: FunctionReference<
        "query",
        "internal",
        { limit?: number; orgId: string },
        any,
        Name
      >;
      getOrgPulse: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        any,
        Name
      >;
      getProfile: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      getWaitlistStatus: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      joinWaitlist: FunctionReference<
        "mutation",
        "internal",
        { email: string; interest?: string; name: string; userId: string },
        any,
        Name
      >;
      learnFromSession: FunctionReference<
        "action",
        "internal",
        { apiKey: string; orgId: string; transcript: string; userId: string },
        any,
        Name
      >;
      ping: FunctionReference<"query", "internal", {}, any, Name>;
      proposeSystemUpdate: FunctionReference<
        "mutation",
        "internal",
        {
          diffSummary: string;
          newInstruction: string;
          orgId: string;
          reasoning: string;
          userId: string;
        },
        any,
        Name
      >;
      reflectiveOptimization: FunctionReference<
        "action",
        "internal",
        { apiKey: string; orgId: string; userId: string },
        any,
        Name
      >;
      rejectProposal: FunctionReference<
        "mutation",
        "internal",
        { orgId: string },
        any,
        Name
      >;
      resetAdaptability: FunctionReference<
        "mutation",
        "internal",
        { orgId: string },
        any,
        Name
      >;
      toggleAdaptability: FunctionReference<
        "mutation",
        "internal",
        { enabled: boolean; orgId: string; userId?: string },
        any,
        Name
      >;
      trackFeedback: FunctionReference<
        "mutation",
        "internal",
        {
          comment?: string;
          orgId: string;
          projectId?: string;
          rating: number;
          targetId: string;
          targetType: string;
          userId: string;
        },
        any,
        Name
      >;
      updateProfileFromAnalysis: FunctionReference<
        "mutation",
        "internal",
        { analysisResult: string; orgId: string; userId: string },
        any,
        Name
      >;
    };
  };
