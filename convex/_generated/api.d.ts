/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adaptive from "../adaptive.js";
import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aiAgents from "../aiAgents.js";
import type * as aiChat from "../aiChat.js";
import type * as aiChatWorkflow from "../aiChatWorkflow.js";
import type * as aiModules_adaptiveActions from "../aiModules/adaptiveActions.js";
import type * as aiModules_analysisActions from "../aiModules/analysisActions.js";
import type * as aiModules_coreActions from "../aiModules/coreActions.js";
import type * as aiModules_customerActions from "../aiModules/customerActions.js";
import type * as aiModules_discoveryActions from "../aiModules/discoveryActions.js";
import type * as aiModules_documentActions from "../aiModules/documentActions.js";
import type * as aiModules_financialActions from "../aiModules/financialActions.js";
import type * as aiModules_interviewActions from "../aiModules/interviewActions.js";
import type * as aiModules_market_canvas from "../aiModules/market/canvas.js";
import type * as aiModules_market_competitors from "../aiModules/market/competitors.js";
import type * as aiModules_market_planning from "../aiModules/market/planning.js";
import type * as aiModules_market_research from "../aiModules/market/research.js";
import type * as aiModules_market_sizing from "../aiModules/market/sizing.js";
import type * as aiModules_marketActions from "../aiModules/marketActions.js";
import type * as aiModules_pitchDeckActions from "../aiModules/pitchDeckActions.js";
import type * as aiModules_prompts from "../aiModules/prompts.js";
import type * as aiModules_reportActions from "../aiModules/reportActions.js";
import type * as aiModules_shared from "../aiModules/shared.js";
import type * as aiModules_tools from "../aiModules/tools.js";
import type * as analytics from "../analytics.js";
import type * as apiIntegrations from "../apiIntegrations.js";
import type * as apiKeys from "../apiKeys.js";
import type * as apiTools from "../apiTools.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as billingActions from "../billingActions.js";
import type * as billingQueries from "../billingQueries.js";
import type * as blog from "../blog.js";
import type * as blog_pages from "../blog_pages.js";
import type * as blog_posts from "../blog_posts.js";
import type * as blog_rss from "../blog_rss.js";
import type * as blog_stats from "../blog_stats.js";
import type * as bottomUp from "../bottomUp.js";
import type * as branding from "../branding.js";
import type * as businessPlans from "../businessPlans.js";
import type * as calendar from "../calendar.js";
import type * as canvas from "../canvas.js";
import type * as cleanup from "../cleanup.js";
import type * as cleanupActions from "../cleanupActions.js";
import type * as cleanupMutations from "../cleanupMutations.js";
import type * as competitors from "../competitors.js";
import type * as context from "../context.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as dailyMemos from "../dailyMemos.js";
import type * as debug from "../debug.js";
import type * as debug_auth from "../debug_auth.js";
import type * as debug_env from "../debug_env.js";
import type * as deck from "../deck.js";
import type * as decks from "../decks.js";
import type * as deploymentStatus from "../deploymentStatus.js";
import type * as documents from "../documents.js";
import type * as engineering from "../engineering.js";
import type * as externalUsage from "../externalUsage.js";
import type * as fileSigning from "../fileSigning.js";
import type * as files from "../files.js";
import type * as filesControl from "../filesControl.js";
import type * as fix_projects from "../fix_projects.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as ideation from "../ideation.js";
import type * as initiatives from "../initiatives.js";
import type * as inspect_account from "../inspect_account.js";
import type * as invites from "../invites.js";
import type * as legal from "../legal.js";
import type * as lib_workos from "../lib/workos.js";
import type * as manual_competitors from "../manual_competitors.js";
import type * as market from "../market.js";
import type * as marketResearch from "../marketResearch.js";
import type * as migrations from "../migrations.js";
import type * as modelConfigActions from "../modelConfigActions.js";
import type * as modelConfigQueries from "../modelConfigQueries.js";
import type * as model_config from "../model_config.js";
import type * as notifications from "../notifications.js";
import type * as ollamaService from "../ollamaService.js";
import type * as pageConfigs from "../pageConfigs.js";
import type * as permissions from "../permissions.js";
import type * as presence from "../presence.js";
import type * as project_actions from "../project_actions.js";
import type * as projects from "../projects.js";
import type * as r2 from "../r2.js";
import type * as referrals from "../referrals.js";
import type * as reset from "../reset.js";
import type * as revenue from "../revenue.js";
import type * as roles from "../roles.js";
import type * as safe from "../safe.js";
import type * as seed_exampleVenture from "../seed/exampleVenture.js";
import type * as seed_seedProject from "../seed/seedProject.js";
import type * as seedModels from "../seedModels.js";
import type * as shareLinks from "../shareLinks.js";
import type * as storageQuota from "../storageQuota.js";
import type * as storageReporter from "../storageReporter.js";
import type * as story from "../story.js";
import type * as stripe from "../stripe.js";
import type * as stripeActions from "../stripeActions.js";
import type * as stripeGateway from "../stripeGateway.js";
import type * as stripeMutations from "../stripeMutations.js";
import type * as team from "../team.js";
import type * as tiptap from "../tiptap.js";
import type * as trialRequests from "../trialRequests.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as ventureWorkspaces from "../ventureWorkspaces.js";
import type * as ventureWorkspaces_internal from "../ventureWorkspaces_internal.js";
import type * as verify_webhook from "../verify_webhook.js";
import type * as voice from "../voice.js";
import type * as waitlist from "../waitlist.js";
import type * as webhooks from "../webhooks.js";
import type * as workos from "../workos.js";
import type * as workos_db from "../workos_db.js";
import type * as workos_events from "../workos_events.js";
import type * as workspace_personality from "../workspace_personality.js";
import type * as zodGenerator from "../zodGenerator.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adaptive: typeof adaptive;
  admin: typeof admin;
  ai: typeof ai;
  aiAgents: typeof aiAgents;
  aiChat: typeof aiChat;
  aiChatWorkflow: typeof aiChatWorkflow;
  "aiModules/adaptiveActions": typeof aiModules_adaptiveActions;
  "aiModules/analysisActions": typeof aiModules_analysisActions;
  "aiModules/coreActions": typeof aiModules_coreActions;
  "aiModules/customerActions": typeof aiModules_customerActions;
  "aiModules/discoveryActions": typeof aiModules_discoveryActions;
  "aiModules/documentActions": typeof aiModules_documentActions;
  "aiModules/financialActions": typeof aiModules_financialActions;
  "aiModules/interviewActions": typeof aiModules_interviewActions;
  "aiModules/market/canvas": typeof aiModules_market_canvas;
  "aiModules/market/competitors": typeof aiModules_market_competitors;
  "aiModules/market/planning": typeof aiModules_market_planning;
  "aiModules/market/research": typeof aiModules_market_research;
  "aiModules/market/sizing": typeof aiModules_market_sizing;
  "aiModules/marketActions": typeof aiModules_marketActions;
  "aiModules/pitchDeckActions": typeof aiModules_pitchDeckActions;
  "aiModules/prompts": typeof aiModules_prompts;
  "aiModules/reportActions": typeof aiModules_reportActions;
  "aiModules/shared": typeof aiModules_shared;
  "aiModules/tools": typeof aiModules_tools;
  analytics: typeof analytics;
  apiIntegrations: typeof apiIntegrations;
  apiKeys: typeof apiKeys;
  apiTools: typeof apiTools;
  audit: typeof audit;
  auth: typeof auth;
  billing: typeof billing;
  billingActions: typeof billingActions;
  billingQueries: typeof billingQueries;
  blog: typeof blog;
  blog_pages: typeof blog_pages;
  blog_posts: typeof blog_posts;
  blog_rss: typeof blog_rss;
  blog_stats: typeof blog_stats;
  bottomUp: typeof bottomUp;
  branding: typeof branding;
  businessPlans: typeof businessPlans;
  calendar: typeof calendar;
  canvas: typeof canvas;
  cleanup: typeof cleanup;
  cleanupActions: typeof cleanupActions;
  cleanupMutations: typeof cleanupMutations;
  competitors: typeof competitors;
  context: typeof context;
  crons: typeof crons;
  customers: typeof customers;
  dailyMemos: typeof dailyMemos;
  debug: typeof debug;
  debug_auth: typeof debug_auth;
  debug_env: typeof debug_env;
  deck: typeof deck;
  decks: typeof decks;
  deploymentStatus: typeof deploymentStatus;
  documents: typeof documents;
  engineering: typeof engineering;
  externalUsage: typeof externalUsage;
  fileSigning: typeof fileSigning;
  files: typeof files;
  filesControl: typeof filesControl;
  fix_projects: typeof fix_projects;
  goals: typeof goals;
  http: typeof http;
  ideation: typeof ideation;
  initiatives: typeof initiatives;
  inspect_account: typeof inspect_account;
  invites: typeof invites;
  legal: typeof legal;
  "lib/workos": typeof lib_workos;
  manual_competitors: typeof manual_competitors;
  market: typeof market;
  marketResearch: typeof marketResearch;
  migrations: typeof migrations;
  modelConfigActions: typeof modelConfigActions;
  modelConfigQueries: typeof modelConfigQueries;
  model_config: typeof model_config;
  notifications: typeof notifications;
  ollamaService: typeof ollamaService;
  pageConfigs: typeof pageConfigs;
  permissions: typeof permissions;
  presence: typeof presence;
  project_actions: typeof project_actions;
  projects: typeof projects;
  r2: typeof r2;
  referrals: typeof referrals;
  reset: typeof reset;
  revenue: typeof revenue;
  roles: typeof roles;
  safe: typeof safe;
  "seed/exampleVenture": typeof seed_exampleVenture;
  "seed/seedProject": typeof seed_seedProject;
  seedModels: typeof seedModels;
  shareLinks: typeof shareLinks;
  storageQuota: typeof storageQuota;
  storageReporter: typeof storageReporter;
  story: typeof story;
  stripe: typeof stripe;
  stripeActions: typeof stripeActions;
  stripeGateway: typeof stripeGateway;
  stripeMutations: typeof stripeMutations;
  team: typeof team;
  tiptap: typeof tiptap;
  trialRequests: typeof trialRequests;
  usage: typeof usage;
  users: typeof users;
  ventureWorkspaces: typeof ventureWorkspaces;
  ventureWorkspaces_internal: typeof ventureWorkspaces_internal;
  verify_webhook: typeof verify_webhook;
  voice: typeof voice;
  waitlist: typeof waitlist;
  webhooks: typeof webhooks;
  workos: typeof workos;
  workos_db: typeof workos_db;
  workos_events: typeof workos_events;
  workspace_personality: typeof workspace_personality;
  zodGenerator: typeof zodGenerator;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workOSAuthKit: {
    lib: {
      enqueueWebhookEvent: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey: string;
          event: string;
          eventId: string;
          eventTypes?: Array<string>;
          logLevel?: "DEBUG";
          onEventHandle?: string;
          updatedAt?: string;
        },
        any
      >;
      getAuthUser: FunctionReference<
        "query",
        "internal",
        { id: string },
        {
          createdAt: string;
          email: string;
          emailVerified: boolean;
          externalId?: null | string;
          firstName?: null | string;
          id: string;
          lastName?: null | string;
          lastSignInAt?: null | string;
          locale?: null | string;
          metadata: Record<string, any>;
          profilePictureUrl?: null | string;
          updatedAt: string;
        } | null
      >;
    };
  };
  stripe: {
    private: {
      handleCheckoutSessionCompleted: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          mode: string;
          stripeCheckoutSessionId: string;
          stripeCustomerId?: string;
        },
        null
      >;
      handleCustomerCreated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleCustomerUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleInvoiceCreated: FunctionReference<
        "mutation",
        "internal",
        {
          amountDue: number;
          amountPaid: number;
          created: number;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
        },
        null
      >;
      handleInvoicePaid: FunctionReference<
        "mutation",
        "internal",
        { amountPaid: number; stripeInvoiceId: string },
        null
      >;
      handleInvoicePaymentFailed: FunctionReference<
        "mutation",
        "internal",
        { stripeInvoiceId: string },
        null
      >;
      handlePaymentIntentSucceeded: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
        },
        null
      >;
      handleSubscriptionCreated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      handleSubscriptionDeleted: FunctionReference<
        "mutation",
        "internal",
        { stripeSubscriptionId: string },
        null
      >;
      handleSubscriptionUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          quantity?: number;
          status: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      updatePaymentCustomer: FunctionReference<
        "mutation",
        "internal",
        { stripeCustomerId: string; stripePaymentIntentId: string },
        null
      >;
      updateSubscriptionQuantityInternal: FunctionReference<
        "mutation",
        "internal",
        { quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
    public: {
      createOrUpdateCustomer: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        string
      >;
      getCustomer: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        } | null
      >;
      getPayment: FunctionReference<
        "query",
        "internal",
        { stripePaymentIntentId: string },
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        } | null
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { stripeSubscriptionId: string },
        {
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      getSubscriptionByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        {
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      listInvoices: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listSubscriptions: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      listSubscriptionsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      updateSubscriptionMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          metadata: any;
          orgId?: string;
          stripeSubscriptionId: string;
          userId?: string;
        },
        null
      >;
      updateSubscriptionQuantity: FunctionReference<
        "action",
        "internal",
        { apiKey: string; quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
  };
  workflow: {
    event: {
      create: FunctionReference<
        "mutation",
        "internal",
        { name: string; workflowId: string },
        string
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          eventId?: string;
          name?: string;
          result:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId?: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        string
      >;
    };
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { shortCircuit?: boolean; workflowId: string },
        {
          blocked?: boolean;
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startSteps: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          steps: Array<{
            retry?:
              | boolean
              | { base: number; initialBackoffMs: number; maxAttempts: number };
            schedulerOptions?: { runAt?: number } | { runAfter?: number };
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
          }>;
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        Array<{
          _creationTime: number;
          _id: string;
          step:
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                functionType: "query" | "mutation" | "action";
                handle: string;
                inProgress: boolean;
                kind?: "function";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workId?: string;
              }
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                handle: string;
                inProgress: boolean;
                kind: "workflow";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workflowId?: string;
              }
            | {
                args: { eventId?: string };
                argsSize: number;
                completedAt?: number;
                eventId?: string;
                inProgress: boolean;
                kind: "event";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
              };
          stepNumber: number;
          workflowId: string;
        }>
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          startAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      listSteps: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          workflowId: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            completedAt?: number;
            eventId?: string;
            kind: "function" | "workflow" | "event";
            name: string;
            nestedWorkflowId?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            stepId: string;
            stepNumber: number;
            workId?: string;
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
  };
  prosemirrorSync: {
    lib: {
      deleteDocument: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        null
      >;
      deleteSnapshots: FunctionReference<
        "mutation",
        "internal",
        { afterVersion?: number; beforeVersion?: number; id: string },
        null
      >;
      deleteSteps: FunctionReference<
        "mutation",
        "internal",
        {
          afterVersion?: number;
          beforeTs: number;
          deleteNewerThanLatestSnapshot?: boolean;
          id: string;
        },
        null
      >;
      getSnapshot: FunctionReference<
        "query",
        "internal",
        { id: string; version?: number },
        { content: null } | { content: string; version: number }
      >;
      getSteps: FunctionReference<
        "query",
        "internal",
        { id: string; version: number },
        {
          clientIds: Array<string | number>;
          steps: Array<string>;
          version: number;
        }
      >;
      latestVersion: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | number
      >;
      submitSnapshot: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          id: string;
          pruneSnapshots?: boolean;
          version: number;
        },
        null
      >;
      submitSteps: FunctionReference<
        "mutation",
        "internal",
        {
          clientId: string | number;
          id: string;
          steps: Array<string>;
          version: number;
        },
        | {
            clientIds: Array<string | number>;
            status: "needs-rebase";
            steps: Array<string>;
          }
        | { status: "synced" }
      >;
    };
  };
  adaptive_learning: {
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
        any
      >;
      approveProposal: FunctionReference<
        "mutation",
        "internal",
        { orgId: string },
        any
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
        any
      >;
      getMemories: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        any
      >;
      getNegativeFeedback: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      getOrgMemoryStats: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        any
      >;
      getOrgNegativeFeedback: FunctionReference<
        "query",
        "internal",
        { limit?: number; orgId: string },
        any
      >;
      getOrgPulse: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        any
      >;
      getProfile: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getWaitlistStatus: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      joinWaitlist: FunctionReference<
        "mutation",
        "internal",
        { email: string; interest?: string; name: string; userId: string },
        any
      >;
      learnFromSession: FunctionReference<
        "action",
        "internal",
        { apiKey: string; orgId: string; transcript: string; userId: string },
        any
      >;
      ping: FunctionReference<"query", "internal", {}, any>;
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
        any
      >;
      reflectiveOptimization: FunctionReference<
        "action",
        "internal",
        { apiKey: string; orgId: string; userId: string },
        any
      >;
      rejectProposal: FunctionReference<
        "mutation",
        "internal",
        { orgId: string },
        any
      >;
      resetAdaptability: FunctionReference<
        "mutation",
        "internal",
        { orgId: string },
        any
      >;
      toggleAdaptability: FunctionReference<
        "mutation",
        "internal",
        { enabled: boolean; orgId: string; userId?: string },
        any
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
        any
      >;
      updateProfileFromAnalysis: FunctionReference<
        "mutation",
        "internal",
        { analysisResult: string; orgId: string; userId: string },
        any
      >;
    };
  };
  convexFilesControl: {
    accessControl: {
      addAccessKey: FunctionReference<
        "mutation",
        "internal",
        { accessKey: string; storageId: string },
        { accessKey: string }
      >;
      removeAccessKey: FunctionReference<
        "mutation",
        "internal",
        { accessKey: string; storageId: string },
        { removed: boolean }
      >;
      updateFileExpiration: FunctionReference<
        "mutation",
        "internal",
        { expiresAt: null | number; storageId: string },
        { expiresAt: null | number }
      >;
    };
    cleanUp: {
      cleanupExpired: FunctionReference<
        "mutation",
        "internal",
        {
          limit?: number;
          r2Config?: {
            accessKeyId: string;
            accountId: string;
            bucketName: string;
            secretAccessKey: string;
          };
        },
        { deletedCount: number; hasMore: boolean }
      >;
      deleteFile: FunctionReference<
        "mutation",
        "internal",
        {
          r2Config?: {
            accessKeyId: string;
            accountId: string;
            bucketName: string;
            secretAccessKey: string;
          };
          storageId: string;
        },
        { deleted: boolean }
      >;
      deleteStorageFile: FunctionReference<
        "action",
        "internal",
        {
          r2Config?: {
            accessKeyId: string;
            accountId: string;
            bucketName: string;
            secretAccessKey: string;
          };
          storageId: string;
          storageProvider: "convex" | "r2";
        },
        null
      >;
    };
    download: {
      consumeDownloadGrantForUrl: FunctionReference<
        "mutation",
        "internal",
        {
          accessKey?: string;
          downloadToken: string;
          password?: string;
          r2Config?: {
            accessKeyId: string;
            accountId: string;
            bucketName: string;
            secretAccessKey: string;
          };
        },
        {
          downloadUrl?: string;
          status:
            | "ok"
            | "not_found"
            | "expired"
            | "exhausted"
            | "file_missing"
            | "file_expired"
            | "access_denied"
            | "password_required"
            | "invalid_password";
        }
      >;
      createDownloadGrant: FunctionReference<
        "mutation",
        "internal",
        {
          expiresAt?: null | number;
          maxUses?: null | number;
          password?: string;
          shareableLink?: boolean;
          storageId: string;
        },
        {
          downloadToken: string;
          expiresAt: null | number;
          maxUses: null | number;
          shareableLink: boolean;
          storageId: string;
        }
      >;
    };
    queries: {
      getFile: FunctionReference<
        "query",
        "internal",
        { storageId: string },
        {
          _id: string;
          expiresAt: number | null;
          storageId: string;
          storageProvider: "convex" | "r2";
          virtualPath: string | null;
        } | null
      >;
      getFileByVirtualPath: FunctionReference<
        "query",
        "internal",
        { virtualPath: string },
        {
          _id: string;
          expiresAt: number | null;
          storageId: string;
          storageProvider: "convex" | "r2";
          virtualPath: string | null;
        } | null
      >;
      hasAccessKey: FunctionReference<
        "query",
        "internal",
        { accessKey: string; storageId: string },
        boolean
      >;
      listAccessKeysPage: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          storageId: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<string>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listDownloadGrantsPage: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _id: string;
            expiresAt: number | null;
            hasPassword: boolean;
            maxUses: null | number;
            storageId: string;
            useCount: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listFilesByAccessKeyPage: FunctionReference<
        "query",
        "internal",
        {
          accessKey: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _id: string;
            expiresAt: number | null;
            storageId: string;
            storageProvider: "convex" | "r2";
            virtualPath: string | null;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listFilesPage: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _id: string;
            expiresAt: number | null;
            storageId: string;
            storageProvider: "convex" | "r2";
            virtualPath: string | null;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
    transfer: {
      transferFile: FunctionReference<
        "action",
        "internal",
        {
          r2Config?: {
            accessKeyId: string;
            accountId: string;
            bucketName: string;
            secretAccessKey: string;
          };
          storageId: string;
          targetProvider: "convex" | "r2";
          virtualPath?: string;
        },
        {
          storageId: string;
          storageProvider: "convex" | "r2";
          virtualPath: string | null;
        }
      >;
    };
    upload: {
      computeR2Metadata: FunctionReference<
        "action",
        "internal",
        {
          r2Config: {
            accessKeyId: string;
            accountId: string;
            bucketName: string;
            secretAccessKey: string;
          };
          storageId: string;
        },
        {
          contentType: string | null;
          sha256: string;
          size: number;
          storageId: string;
        }
      >;
      finalizeUpload: FunctionReference<
        "mutation",
        "internal",
        {
          accessKeys: Array<string>;
          expiresAt?: null | number;
          metadata?: {
            contentType: string | null;
            sha256: string;
            size: number;
          };
          storageId: string;
          uploadToken: string;
          virtualPath?: string;
        },
        {
          expiresAt: null | number;
          metadata: {
            contentType: string | null;
            sha256: string;
            size: number;
            storageId: string;
          } | null;
          storageId: string;
          storageProvider: "convex" | "r2";
          virtualPath: string | null;
        }
      >;
      generateUploadUrl: FunctionReference<
        "mutation",
        "internal",
        {
          provider: "convex" | "r2";
          r2Config?: {
            accessKeyId: string;
            accountId: string;
            bucketName: string;
            secretAccessKey: string;
          };
          virtualPath?: string;
        },
        {
          storageId: string | null;
          storageProvider: "convex" | "r2";
          uploadToken: string;
          uploadTokenExpiresAt: number;
          uploadUrl: string;
        }
      >;
      registerFile: FunctionReference<
        "mutation",
        "internal",
        {
          accessKeys: Array<string>;
          expiresAt?: null | number;
          metadata?: {
            contentType: string | null;
            sha256: string;
            size: number;
          };
          storageId: string;
          storageProvider: "convex" | "r2";
          virtualPath?: string;
        },
        {
          expiresAt: null | number;
          metadata: {
            contentType: string | null;
            sha256: string;
            size: number;
            storageId: string;
          } | null;
          storageId: string;
          storageProvider: "convex" | "r2";
          virtualPath: string | null;
        }
      >;
    };
  };
};
