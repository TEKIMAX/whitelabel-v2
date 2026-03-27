

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Projects: The root entity
  projects: defineTable({
    orgId: v.string(), // Clerk/WorkOS Organization ID
    userId: v.string(), // Creator (WorkOS ID - tokenIdentifier)
    creatorId: v.optional(v.id("users")), // Creator (Convex User ID)
    orgFounderId: v.optional(v.string()), // ID of the person that was the organization founder
    name: v.string(),
    hypothesis: v.string(),
    slug: v.optional(v.string()), // URL-friendly identifier
    logo: v.optional(v.string()), // Project Logo URL
    localId: v.optional(v.string()), // For migration: matches localStorage ID
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()), // User ID of last modifier
    currentCanvasId: v.optional(v.id("canvases")), // Pointer to active canvas version
    // Canvas Fields (Deprecated - moving to 'canvases' table)
    problem: v.optional(v.string()),
    solution: v.optional(v.string()),
    keyMetrics: v.optional(v.string()),
    uniqueValueProposition: v.optional(v.string()),
    unfairAdvantage: v.optional(v.string()),
    channels: v.optional(v.string()),
    customerSegments: v.optional(v.string()),
    costStructure: v.optional(v.string()),
    revenueStreams: v.optional(v.string()),
    revenueModelSettings: v.optional(v.string()), // JSON: { businessModelType, startingUsers, growth, churn, cac, description }
    revenueModelVersions: v.optional(v.string()), // JSON: Array of RevenueModelVersion
    currentRevenueModelId: v.optional(v.string()),
    whitePaperContent: v.optional(v.string()),
    scoreWhitePaperContent: v.optional(v.number()), // 0-100 score
    businessPlanContent: v.optional(v.string()),
    scoreBusinessPlanContent: v.optional(v.number()), // 0-100 score
    customerDiscoveryTitle: v.optional(v.string()),

    safeAgreement: v.optional(v.string()), // JSON
    vestingSettings: v.optional(v.string()), // JSON: { cliffMonth, vestingMonths, startDate }
    totalShares: v.optional(v.number()),
    equityContributions: v.optional(v.string()), // JSON
    capTableScenarios: v.optional(v.string()), // JSON
    businessStructure: v.optional(v.string()), // LLC, C-Corp, etc.
    organizationDetails: v.optional(v.string()), // JSON: legalDocs, govContracting, cmmc, compliance

    milestones: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      date: v.number(),
      type: v.string(),
      description: v.string(),
      isMonumental: v.boolean(),
      isFeatured: v.optional(v.boolean()),
      tags: v.optional(v.array(v.string())),
      imageUrl: v.optional(v.string()),
      tractionType: v.optional(v.string()),
      theme: v.optional(v.string()),
      documents: v.optional(v.array(v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(), // 'Legal', 'File', 'Link'
        url: v.optional(v.string())
      }))),
      // Attribution
      creatorProfile: v.optional(v.object({
        name: v.string(),
        avatarUrl: v.optional(v.string()),
        userId: v.string()
      })),
      source: v.optional(v.string()) // 'AI' | 'HUMAN'
    }))),
    // AI Strategic Insights Tracking
    lastStrategyGeneratedAt: v.optional(v.number()),
    strategyFrequencyDays: v.optional(v.number()), // Default to 14
    memoFrequencyDays: v.optional(v.number()), // Default to 1
    journeyStoryContent: v.optional(v.string()), // New: Generated Journey Story (HTML format for TipTap)
    journeyStoryVersions: v.optional(v.array(v.object({
      id: v.string(),
      content: v.string(),
      createdAt: v.number(),
      name: v.optional(v.string())
    }))),
    journeyStorySource: v.optional(v.string()), // 'AI' | 'HUMAN_EDITED'
    foundingDate: v.optional(v.number()),
    targetHumanRatio: v.optional(v.number()), // Target Truthfulness Index (e.g. 50)

    // Stripe Connect Integration (Project Level)
    stripeAccountId: v.optional(v.string()), // Connected Account ID
    stripeConnectedAt: v.optional(v.number()),
    stripeData: v.optional(v.string()), // JSON cache of recent data

    // Feature Flags
    marketResearchEnabled: v.optional(v.boolean()),
    status: v.optional(v.string()), // Active, Deleted
    deletedAt: v.optional(v.number()), // Timestamp when soft-deleted

    expenseLibrary: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      amount: v.number(),
      frequency: v.string(),
      category: v.optional(v.string()),
      growthRate: v.optional(v.number()),
      source: v.optional(v.string()) // 'Human' | 'AI'
    }))),

    // Blog Customization Settings
    blogSettings: v.optional(v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      coverImage: v.optional(v.string()),
      themeColor: v.optional(v.string()),
      sidebarTextColor: v.optional(v.string()),
      mainHeroImage: v.optional(v.string())
    })),
    /** CF Pages deployment ID — set by provisioner; scopes venture to this deployment */
    deploymentId: v.optional(v.string()),
  }).index("by_org", ["orgId"]).index("by_localId", ["localId"]).index("by_creator", ["userId"]).index("by_slug", ["slug"]).index("by_deployment", ["deploymentId"]).index("by_org_deployment", ["orgId", "deploymentId"]),

  // New Table: Canvases (Versions)
  canvases: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(), // e.g. "Main", "Draft 1", "Pivot 2"
    // Canvas Data
    problem: v.optional(v.string()),
    solution: v.optional(v.string()),
    keyMetrics: v.optional(v.string()),
    uniqueValueProposition: v.optional(v.string()),
    unfairAdvantage: v.optional(v.string()),
    channels: v.optional(v.string()),
    customerSegments: v.optional(v.string()),
    costStructure: v.optional(v.string()),
    revenueStreams: v.optional(v.string()),
    source: v.optional(v.string()), // 'AI' | 'Human'
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  canvas_versions: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    data: v.string(), // JSON stringified Record<CanvasSection, string>
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 2. Goals (OKRs)
  goals: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    title: v.string(),
    description: v.optional(v.string()), // New field
    type: v.string(), // Strategic, Objective
    timeframe: v.string(), // Q1, Monthly
    status: v.string(), // Upcoming, In Progress, Completed
    linkedCustomerIds: v.optional(v.array(v.string())),
    source: v.optional(v.string()), // 'AI' | 'Human'
    createdAt: v.number(),
    archived: v.optional(v.boolean()),
    // Quarterly Roadmap fields
    quarter: v.optional(v.string()),   // "Q1" | "Q2" | "Q3" | "Q4"
    year: v.optional(v.number()),      // e.g. 2026
    health: v.optional(v.string()),    // "on_track" | "at_risk" | "behind"
    targetDate: v.optional(v.number()),
    linkedGoalIds: v.optional(v.array(v.string())),  // Cross-quarter dependencies
  }).index("by_project", ["projectId"]),

  key_results: defineTable({
    goalId: v.id("goals"),
    projectId: v.id("projects"),
    description: v.string(),
    target: v.number(),
    current: v.number(),
    unit: v.string(),
    updateType: v.optional(v.string()), // 'manual', 'automatic'
    metricSource: v.optional(v.string()),
    lastUpdated: v.optional(v.number()),
    status: v.optional(v.string()), // 'Not Started', 'In Progress', 'Done'
  }).index("by_goal", ["goalId"]),

  // 3. Market Research
  market_data: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    tam: v.number(),
    sam: v.number(),
    som: v.number(),
    reportContent: v.string(),
    keywords: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    creatorProfile: v.optional(v.object({
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      userId: v.string()
    })),
    source: v.optional(v.string()),
    sources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
    naicsCode: v.optional(v.string()),
    workflowId: v.optional(v.string()), // Workflow Run ID
    status: v.optional(v.string()), // 'analyzing', 'completed', 'failed'
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  bottom_up_data: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    tam: v.number(),
    sam: v.number(),
    som: v.number(),
    reportContent: v.string(),
    keywords: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    creatorProfile: v.optional(v.object({
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      userId: v.string()
    })),
    source: v.optional(v.string()),
    sources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
    naicsCode: v.optional(v.string()),
    workflowId: v.optional(v.string()), // Workflow Run ID
    status: v.optional(v.string()), // 'analyzing', 'completed', 'failed'
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 4. Competitor Analysis
  competitor_config: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    attributes: v.array(v.string()), // Dynamic columns e.g. ["Price", "Features"]
    analysisSummary: v.optional(v.string()),
    subTabs: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      attributes: v.array(v.string())
    }))),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  competitors: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    attributesData: v.string(), // JSON string for dynamic cols
    tabId: v.optional(v.string()), // Optional tab ID
    source: v.optional(v.string()), // 'AI' | 'Human'
    tags: v.optional(v.array(v.string())),
    creatorProfile: v.optional(v.object({
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      userId: v.string()
    }))
  }).index("by_project", ["projectId"]),

  // 5. Customer Development
  interviews: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    customerStatus: v.string(),
    customerId: v.optional(v.string()), // Optional link to a specific customer record if we separate them
    willingnessToPay: v.optional(v.string()), // "$50", "No", "Yes", etc.
    sentiment: v.optional(v.string()),
    aiAnalysis: v.optional(v.string()),
    customData: v.string(),
    source: v.optional(v.string()), // 'AI' | 'Human'
    tags: v.optional(v.array(v.string())), // Customer segments/tags
    segment: v.optional(v.string()), // Primary segment
    churnRisk: v.optional(v.string()), // 'low', 'medium', 'high'
    lastContactAt: v.optional(v.number()), // Last contact timestamp
    nextFollowUpAt: v.optional(v.number()), // Next scheduled follow-up
    createdAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_segment", ["projectId", "segment"])
    .index("by_tags", ["projectId", "tags"]),

  // Interview Templates
  interview_templates: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    questions: v.array(v.object({
      id: v.string(),
      question: v.string(),
      category: v.optional(v.string()), // 'discovery', 'validation', 'pricing', etc.
      order: v.number(),
    })),
    targetSegment: v.optional(v.string()), // Which segment this template is for
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // Interview Schedules
  interview_schedules: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    interviewId: v.optional(v.id("interviews")), // Link to interview record
    title: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.number(), // Unix timestamp
    duration: v.optional(v.number()), // Duration in minutes
    status: v.string(), // 'scheduled', 'completed', 'cancelled', 'rescheduled'
    location: v.optional(v.string()), // Zoom link, address, etc.
    notes: v.optional(v.string()),
    reminderSent: v.optional(v.boolean()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  }).index("by_project", ["projectId"])
    .index("by_scheduled", ["projectId", "scheduledAt"]),

  // Email Outreach Templates
  email_templates: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    subject: v.string(),
    body: v.string(), // Markdown/HTML content with {{placeholders}}
    type: v.string(), // 'cold_outreach', 'follow_up', 'thank_you', 'scheduling', etc.
    variables: v.optional(v.array(v.string())), // e.g., ['name', 'company', 'product']
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // Email Outreach Logs
  email_outreach: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    interviewId: v.optional(v.id("interviews")),
    templateId: v.optional(v.id("email_templates")),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    status: v.string(), // 'draft', 'sent', 'opened', 'replied', 'bounced'
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    repliedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  }).index("by_project", ["projectId"])
    .index("by_interview", ["interviewId"]),

  // 6. Features / Roadmap
  features: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.string(),
    priority: v.string(),
    stackLayer: v.optional(v.string()),
    eisenhowerQuadrant: v.optional(v.string()), // Do, Schedule, Delegate, Eliminate
    assignedTo: v.optional(v.array(v.string())), // User IDs
    tags: v.optional(v.array(v.string())),
    systemId: v.optional(v.string()),
    source: v.optional(v.string()), // 'AI' | 'Human'
    creatorProfile: v.optional(v.object({
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      userId: v.string()
    })),
    connectedGoalId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 7. Revenue Model
  revenue_streams: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    price: v.number(),
    frequency: v.string(),
    source: v.optional(v.string()), // 'AI' | 'Human'
  }).index("by_project", ["projectId"]),

  costs: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    amount: v.number(),
    frequency: v.string(),
    source: v.optional(v.string()), // 'AI' | 'Human'
  }).index("by_project", ["projectId"]),

  revenue_versions: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    data: v.string(), // JSON snapshot
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 8. Deck
  deck_slides: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    title: v.string(),
    content: v.string(),
    notes: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imagePrompt: v.optional(v.string()), // Added this field
    items: v.optional(v.string()), // JSON array of CanvasItem[]
    order: v.number(),
  }).index("by_project", ["projectId"]),

  deck_versions: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    slidesData: v.string(), // JSON array of slides
    theme: v.optional(v.string()), // JSON string of DeckTheme
    createdAt: v.number(),
    createdBy: v.optional(v.string()), // User ID
    createdByPicture: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // 9. Documents (White Paper, Business Plan)
  documents: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    folderId: v.optional(v.union(v.id("folders"), v.null())), // Added for nesting
    title: v.optional(v.string()), // Added for user-defined title
    type: v.string(), // 'WhitePaper' | 'BusinessPlan' | 'doc'
    content: v.string(),
    tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))), // Added
    updatedAt: v.number(),
    // Security & Signatures
    isLocked: v.optional(v.boolean()),
    creatorId: v.optional(v.string()),
    collaborators: v.optional(v.array(v.string())),
    signers: v.optional(v.array(v.object({
      userId: v.string(),
      role: v.optional(v.string()),
      status: v.string(), // 'pending' | 'signed'
      signedAt: v.optional(v.number()),
      ipAddress: v.optional(v.string())
    }))),
  }).index("by_project_type", ["projectId", "type"])
    .index("by_project_folder", ["projectId", "folderId"]),

  // 10. Audit Log
  data_sources: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    type: v.string(),
    source: v.string(), // AI | Human
    content: v.optional(v.string()),
    wordCount: v.number(),
    tags: v.array(v.string()),
    timestamp: v.number(),
  }).index("by_project", ["projectId"]),

  // 11. Team & SAFE
  team_members: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    joinedAt: v.number(),
    pictureUrl: v.optional(v.string()),
    education: v.optional(v.string()),
    schools: v.optional(v.string()),
    acceptedRole: v.optional(v.boolean()),
    allowedPages: v.optional(v.array(v.string())),
    status: v.optional(v.string()), // Pending, Active, Inactive
    workosInvitationId: v.optional(v.string()),
    source: v.optional(v.string()), // 'AI' | 'Human'
  }).index("by_project", ["projectId"])
    .index("by_workosInvitationId", ["workosInvitationId"])
    .index("by_email", ["email"]),

  equity_contributions: defineTable({
    projectId: v.id("projects"),
    memberId: v.id("team_members"),
    orgId: v.string(),
    type: v.string(), // Time | Money | IP
    value: v.number(),
    multiplier: v.number(),
    description: v.string(),
    date: v.number(),
  }).index("by_project", ["projectId"]),

  safe_settings: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    valuationCap: v.number(),
    amountRaising: v.number(),
    discountRate: v.number(),
    postMoney: v.boolean(),
    companyAddress: v.string(),
    stateOfIncorporation: v.string(),
    repName: v.string(),
    investorName: v.string(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 12. Video Interviews
  video_interviews: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    waiverFileId: v.optional(v.id("_storage")),
    videoFileId: v.optional(v.id("_storage")),
    linkedInterviewId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 12. Users & Organizations
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
    orgIds: v.array(v.string()),
    currentOrgId: v.optional(v.string()),
    roles: v.optional(v.array(v.object({
      orgId: v.string(),
      role: v.string()
    }))),
    invitations: v.optional(v.array(v.object({
      id: v.optional(v.string()), // WorkOS Invitation ID (Optional for backward compatibility)
      orgId: v.string(),
      role: v.optional(v.string()),
      status: v.string(), // 'pending'
      token: v.optional(v.string()),
      acceptUrl: v.optional(v.string()),
      orgName: v.optional(v.string()),
      inviterName: v.optional(v.string()),
      date: v.optional(v.number())
    }))),
    subscriptionStatus: v.optional(v.string()), // 'active', 'trialing', 'past_due', 'canceled', 'unpaid'
    endsOn: v.optional(v.number()), // Timestamp for trial end or subscription end
    tokenLimit: v.optional(v.number()), // Monthly token limit
    subscriptionTier: v.optional(v.string()), // 'starter', 'pro', 'enterprise'
    seatCount: v.optional(v.number()), // Number of purchased seats
    isFounder: v.optional(v.boolean()), // True if user is a paying founder (can create ventures)
    // Onboarding Fields
    onboardingStep: v.optional(v.number()), // 1, 2, 3, 4
    onboardingData: v.optional(v.object({
      role: v.optional(v.string()), // CEO, Founder...
      orgSize: v.optional(v.string()),
      yearsInBusiness: v.optional(v.string()),
      industry: v.optional(v.string()),
      startupName: v.optional(v.string()),
      hypothesis: v.optional(v.string()),
      foundingYear: v.optional(v.string()),
      aiInteractionStyle: v.optional(v.string()), // 'Strategist', 'Executive', 'Visionary'
      enableR2Storage: v.optional(v.boolean()),    // Whether user enabled Files & Assets storage
    })),
    onboardingCompleted: v.optional(v.boolean()),
    hasSeedData: v.optional(v.boolean()), // True if example seed data loaded
    seedProjectId: v.optional(v.string()), // ID of the seeded project for cascade delete
    stripeCustomerId: v.optional(v.string()), // Stripe Customer ID for billing portal
    subscriptionInterval: v.optional(v.string()), // 'month' or 'year'
    // Referral Program
    referralCode: v.optional(v.string()),
    referralCount: v.optional(v.number()),
    hasReceivedReferralSetupCredit: v.optional(v.boolean()),
    publicKey: v.optional(v.string()), // Ed25519 Public Key
    instanceUrl: v.optional(v.string()), // URL of the provisioned backend
    instanceProjectSlug: v.optional(v.string()), // Slug of the provisioned project
  }).index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_referral_code", ["referralCode"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    creatorId: v.id("users"),
  }).index("by_slug", ["slug"]),

  architecture_nodes: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    type: v.string(), // 'techNode'
    position: v.object({ x: v.number(), y: v.number() }),
    data: v.string(), // JSON string for label, category, logo
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 13. File Organization
  folders: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    parentId: v.optional(v.union(v.id("folders"), v.null())), // null for root
    tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
    createdAt: v.number(),
  }).index("by_project_parent", ["projectId", "parentId"]),

  files: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    folderId: v.optional(v.union(v.id("folders"), v.null())),
    name: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
    type: v.string(),
    storageId: v.optional(v.id("_storage")),  // Convex storage (internal docs)
    r2Key: v.optional(v.string()),             // R2 object key (external uploads)
    storageBackend: v.optional(v.string()),    // "convex" | "r2"
    size: v.number(),
    createdAt: v.number(),
    initiativeId: v.optional(v.id("initiatives")),
    watermarkEnabled: v.optional(v.boolean()),
    collaborators: v.optional(v.array(v.string())), // User token identifiers
  }).index("by_project_folder", ["projectId", "folderId"])
    .index("by_initiative", ["initiativeId"])
    .searchIndex("search_by_name", { searchField: "name", filterFields: ["projectId", "type"] }),

  legal_documents: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    type: v.optional(v.string()),
    recipientId: v.optional(v.string()),
    status: v.string(),
    content: v.optional(v.string()),
    attachmentUrl: v.optional(v.string()),
    fields: v.optional(v.string()),
    createdAt: v.number(),
    signedAt: v.optional(v.number()),
    variables: v.optional(v.string()),
    accessKey: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    source: v.optional(v.string()),
    name: v.optional(v.string()),
    fileId: v.optional(v.id("files")),
  }).index("by_project", ["projectId"]).index("by_access_key", ["accessKey"]),

  // 14. Custom Roles
  roles: defineTable({
    projectId: v.string(), // Can be local ID or convex ID
    orgId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    allowedPages: v.array(v.string()),
    isSystem: v.boolean(),
    permissions: v.optional(v.object({
      global: v.object({
        view: v.boolean(),
        create: v.boolean(),
        edit: v.boolean(),
        delete: v.boolean(),
      }),
      project: v.optional(v.object({
        create: v.boolean(),
        delete: v.boolean(),
      })),
      canvas: v.optional(v.object({
        create: v.boolean(),
        update: v.boolean(),
      }))
    })),
  }).index("by_project", ["projectId"]),

  // 15. Usage Metering
  usage: defineTable({
    userId: v.string(),
    orgId: v.optional(v.string()), // Organization-level tracking (from WorkOS JWT org_id)
    date: v.string(), // YYYY-MM-DD
    tokens: v.number(),
    requests: v.number(),
    model: v.string(),
  }).index("by_user_date", ["userId", "date"])
    .index("by_org_date", ["orgId", "date"]),

  // 16. Ideation Workspaces
  ideation_workspaces: defineTable({
    projectId: v.optional(v.string()), // Can be linked to a project or global? User said "saved on the convex project", so usually projectId. MAKING OPTIONAL for now if they are standalone in this view. But logically should be v.id("projects") if strict. Let's start with v.string() or v.optional(v.id("projects")) for flexibility. Actually user said "created workspace is saved on the convex project". So it implies a link. But Ideation/Home seems to list them independently? The Home.tsx lists "projects" which look like workspaces. Let's assume these ARE the workspaces.
    // Wait, the "Ideation" tab is *inside* a project in App.tsx?
    // In App.tsx: viewState === 'IDEATION' -> IdeationHome.
    // It seems 'IDEATION' is top level view?
    // Let's look at App.tsx again.
    // viewState === 'IDEATION' is a sibling to 'CANVAS', 'MARKET', etc.
    // And IdeationHome seems to have its own list of "Projects".
    // This is slightly confusing naming. User calls them "Workspaces" in the context of Ideation.
    // Let's call the table `ideation_workspaces`.
    orgId: v.string(),
    userId: v.string(), // Creator
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")), // For cascading deletes
    coverColor: v.optional(v.string()), // For presets like yellow/blue/green
    items: v.string(), // JSON stringified CanvasItem[]
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]).index("by_user", ["userId"]), // Index by org to show all in org? Or User?

  // 17. Waitlist
  waitlist: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // 18. Presence (Real-time)
  presence: defineTable({
    user: v.string(),
    room: v.string(),
    updated: v.number(),
    data: v.any(),
  })
    // Index for fetching checking who is recently active in a room
    .index("by_room_updated", ["room", "updated"])
    // Index for updating a specific user's presence
    .index("by_room_user", ["room", "user"]),

  // 19. Blog System (Markdown Site Port)
  posts: defineTable({
    // IDs & Scoping
    slug: v.string(),
    projectId: v.optional(v.id("projects")),
    orgId: v.optional(v.string()),
    authorId: v.optional(v.string()),

    // Content
    title: v.string(),
    description: v.string(),
    content: v.string(), // HTML/Tiptap JSON

    // Metadata
    coverImage: v.optional(v.string()), // URL or Base64 (prefer URL from storage)
    coverImageStorageId: v.optional(v.id("_storage")),
    tags: v.array(v.string()),
    category: v.optional(v.string()),
    readTime: v.optional(v.string()), // e.g. "5 min read"

    // Publishing Status
    published: v.boolean(),
    visibility: v.optional(v.string()), // 'public' | 'internal' | 'draft' (defaults to 'draft' or 'public' based on published bool legacy)
    date: v.string(), // YYYY-MM-DD
    lastSyncedAt: v.number(),

    // Legacy/Duplicate fields cleanup (keeping for compatibility if needed, but prefer coverImage)
    image: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_date", ["date"])
    .index("by_published", ["published"])
    .index("by_project", ["projectId"])
    .index("by_org", ["orgId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["published"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["published"],
    }),

  blog_categories: defineTable({
    projectId: v.optional(v.id("projects")),
    orgId: v.string(),
    name: v.string(),
    color: v.optional(v.string()), // For UI badges
  }).index("by_project", ["projectId"]).index("by_org", ["orgId"]),

  // Static pages (about, projects, contact, etc.)
  pages: defineTable({
    slug: v.string(),
    title: v.string(),
    content: v.string(),
    published: v.boolean(),
    order: v.optional(v.number()), // Display order in nav
    lastSyncedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published"]),

  // View counts for analytics
  viewCounts: defineTable({
    slug: v.string(),
    count: v.number(),
  }).index("by_slug", ["slug"]),

  // Site configuration (about content, links, etc.)
  siteConfig: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  // Page view events for analytics (event records pattern)
  pageViews: defineTable({
    path: v.string(),
    pageType: v.string(), // "blog" | "page" | "home" | "stats"
    sessionId: v.string(),
    timestamp: v.number(),
  })
    .index("by_path", ["path"])
    .index("by_timestamp", ["timestamp"])
    .index("by_session_path", ["sessionId", "path"]),

  // Active sessions for real-time visitor tracking
  activeSessions: defineTable({
    sessionId: v.string(),
    currentPath: v.string(),
    lastSeen: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_lastSeen", ["lastSeen"]),

  // 20. Business Plans (New)
  business_plans: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    content: v.string(), // JSON string (Tiptap content)
    version: v.number(),
    isLatest: v.boolean(),
    name: v.optional(v.string()),
    source: v.optional(v.string()), // 'AI' | 'Human'
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(), // User ID
  })
    .index("by_project", ["projectId"])
    .index("by_project_latest", ["projectId", "isLatest"]),

  business_plan_versions: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    content: v.string(), // JSON snapshot
    version: v.number(),
    name: v.string(), // e.g., "v1 - Initial Draft"
    source: v.optional(v.string()), // 'AI' | 'Human'
    createdAt: v.number(),
    createdBy: v.string(),
  }).index("by_project", ["projectId"]),

  // 21. Branding (White Label)
  branding: defineTable({
    orgId: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    logoUrl: v.optional(v.string()),
    isLogoTransparent: v.optional(v.boolean()),
    appName: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),




  // 22. Story Progress
  story_progress: defineTable({
    userId: v.string(),
    completed: v.boolean(),
    completedAt: v.number(),
    lastStepId: v.optional(v.number()), // To resume?
  }).index("by_user", ["userId"]),

  // 23. AI Chat & Custom Agents
  ai_agents: defineTable({
    projectId: v.optional(v.id("projects")), // The project this agent belongs to
    orgId: v.string(), // For organization-wide scoped agents
    name: v.string(),
    role: v.optional(v.string()), // e.g. "Finance", "Customer Discovery"
    systemMessage: v.string(), // The custom prompt/directive
    objective: v.optional(v.string()), // The goal for the agent
    modelName: v.optional(v.string()), // e.g. "ollama", "gemini-2.0-flash"
    createdAt: v.number(),
    createdBy: v.string(), // User ID
  }).index("by_org", ["orgId"]).index("by_project", ["projectId"]),

  chats: defineTable({
    projectId: v.optional(v.id("projects")),
    orgId: v.string(),
    userId: v.string(),
    agentId: v.optional(v.id("ai_agents")), // Optional link to a custom agent handling this chat
    title: v.string(),
    channel: v.optional(v.string()), // 'adaptive' | 'calculator' — discriminator to prevent cross-tool leakage
    lastMessageAt: v.number(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]).index("by_user", ["userId"]).index("by_project", ["projectId"]).index("by_agent", ["agentId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    role: v.string(), // 'user' | 'assistant'
    content: v.string(),
    reasoning: v.optional(v.string()), // New field for thinking process
    toolResults: v.optional(v.string()), // JSON string
    groundingMetadata: v.optional(v.string()), // JSON string
    createdAt: v.number(),
    order: v.optional(v.number()), // Deterministic per-chat ordering (Convex agent pattern)
    status: v.optional(v.string()), // 'pending' | 'streaming' | 'complete' | 'error'
  }).index("by_chat", ["chatId"])
    .index("by_chat_order", ["chatId", "order"]),

  // 24. Webhooks (WorkOS Vault Secured)
  webhooks: defineTable({
    orgId: v.string(),
    url: v.string(),
    vaultSecretId: v.string(), // Key ID or Secret ID from WorkOS Vault
    eventTypes: v.array(v.string()), // e.g., ['canvas.saved', 'journey.milestone']
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),

  // 26. WorkOS Events API Cursor
  workos_cursors: defineTable({
    cursor: v.optional(v.string()), // The 'after' cursor
    lastSyncedAt: v.number(),
  }),

  // 25. Initiatives & Divisions
  divisions: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    leadId: v.optional(v.string()), // User ID of division lead
    color: v.optional(v.string()), // UI color
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  initiatives: defineTable({
    projectId: v.id("projects"),
    divisionId: v.id("divisions"),
    orgId: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.string(), // 'Planning', 'In Progress', 'Paused', 'Completed', 'Canceled'
    priority: v.string(), // 'Low', 'Medium', 'High', 'Critical'
    assignedIds: v.optional(v.array(v.string())), // User IDs
    startDate: v.optional(v.number()),
    targetDate: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_division", ["divisionId"]).index("by_project", ["projectId"]),

  initiative_comments: defineTable({
    initiativeId: v.id("initiatives"),
    userId: v.string(),
    userName: v.string(),
    userPicture: v.optional(v.string()),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_initiative", ["initiativeId"]),

  // 26. API Keys
  api_keys: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    name: v.string(),
    key: v.string(), // Hashed API Key
    preview: v.string(), // First/Last characters
    scopes: v.array(v.string()), // e.g., ["usage:write"]
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.string(), // User ID
  })
    .index("by_project", ["projectId"])
    .index("by_key", ["key"]),

  // 27. External usage logging
  external_usage: defineTable({
    projectId: v.id("projects"),
    apiKeyId: v.id("api_keys"),
    externalUserId: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.optional(v.number()),
    metadata: v.optional(v.string()), // JSON
    timestamp: v.number(),
  }).index("by_project_date", ["projectId", "timestamp"]),

  // 26. Human-AI Cooperation Reports
  cooperation_reports: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    content: v.string(), // Markdown
    stats: v.object({
      humanRatio: v.number(),
      aiRatio: v.number(),
      humanCount: v.number(),
      aiCount: v.number(),
    }),
    createdAt: v.number(),
    createdBy: v.string(),
  }).index("by_project", ["projectId"]),

  // 27. Activity Log (Audit Trail)
  activity_log: defineTable({
    projectId: v.optional(v.id("projects")),
    orgId: v.string(),
    userId: v.string(), // Who performed the action
    userName: v.optional(v.string()),
    action: v.string(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'SIGN' | 'INVITE' | 'ROLE_CHANGE'
    entityType: v.string(), // 'project' | 'document' | 'feature' | 'team_member' | 'safe'
    entityId: v.string(),
    entityName: v.optional(v.string()), // Human-readable name of the entity
    changes: v.optional(v.string()), // JSON diff of changes
    metadata: v.optional(v.string()), // Additional context (JSON)
    ipAddress: v.optional(v.string()),
    signature: v.optional(v.string()), // Cryptographic Signature (Ed25519)
    publicKey: v.optional(v.string()), // Public Key used for signature
    timestamp: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_org", ["orgId"]),

  // 28. Trial Requests (Landing Page Form)
  trial_requests: defineTable({
    name: v.string(),
    email: v.string(),
    organizationType: v.string(),
    organizationName: v.string(),
    employeeCount: v.string(),
    phoneNumber: v.string(),
    details: v.optional(v.string()),
    status: v.optional(v.string()), // 'pending' | 'contacted' | 'converted' | 'rejected'
    createdAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_status", ["status"]),

  // 27. Calendar
  calendar_events: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    start: v.number(),
    end: v.number(),
    type: v.string(), // 'meeting', 'task', 'milestone', or custom
    customType: v.optional(v.string()),
    locationType: v.optional(v.string()), // 'in-person' | 'online'
    meetingUrl: v.optional(v.string()),
    allDay: v.boolean(),
    source: v.optional(v.string()), // 'AI' | 'Human'
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // 28. AI Daily Memos
  daily_memos: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    content: v.string(),
    date: v.string(), // YYYY-MM-DD
    isRead: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_project_date", ["projectId", "date"]),

  // 29. Notifications
  notifications: defineTable({
    projectId: v.id("projects"),
    orgId: v.string(),
    userId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    type: v.string(), // 'SYSTEM', 'AI', 'GOAL', 'TEAM', 'CALENDAR'
    isRead: v.boolean(),
    createdAt: v.number(),
    metadata: v.optional(v.string()), // JSON for links/actions
  }).index("by_project", ["projectId"])
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_read", ["isRead"])
    .index("by_created", ["createdAt"]),

  // 30. Billing Config (Per-Org Stripe Pricing)
  billing_config: defineTable({
    orgId: v.string(),
    // Stripe Connect
    stripeAccountId: v.optional(v.string()),
    // Price IDs (created on tenant's Stripe account)
    basePriceId: v.optional(v.string()),         // Monthly subscription
    yearlyPriceId: v.optional(v.string()),       // Annual subscription
    seatPriceId: v.optional(v.string()),         // Per-seat monthly
    seatPriceIdYearly: v.optional(v.string()),   // Per-seat yearly
    tokenPackPriceId: v.optional(v.string()),    // Token pack one-time
    // Default pricing (what tenant charges their users, in cents)
    basePrice: v.optional(v.number()),           // e.g. 2900 = $29
    yearlyPrice: v.optional(v.number()),         // e.g. 29000 = $290
    seatPrice: v.optional(v.number()),           // e.g. 1000 = $10
    seatPriceYearly: v.optional(v.number()),     // e.g. 10000 = $100
    tokenPackPrice: v.optional(v.number()),      // e.g. 1000 = $10
    // Status
    setupComplete: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  // 31. Model Config (Per-Org AI Model Selection)
  model_config: defineTable({
    orgId: v.string(),
    selectedModels: v.array(v.object({
      provider: v.string(),      // "gemini" | "ollama" | "openai" | "anthropic"
      modelId: v.string(),       // "gemini-2.0-flash" | "gpt-4o" | etc
      isDefault: v.boolean(),    // which model is the primary
    })),
    billingCycle: v.optional(v.string()), // "monthly" | "yearly" — from rate card selection
    // API keys are NOT stored here — they're set as env vars on the Convex deployment
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  // 31.5 API Tools Config (Per-Org Enabled AI Tools)
  api_tools_config: defineTable({
    orgId: v.string(),
    toolIds: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  // 32. Page Configs (Per-Org Menu Visibility)
  page_configs: defineTable({
    orgId: v.string(),
    pageKey: v.string(),
    category: v.string(),
    label: v.string(),
    icon: v.optional(v.string()),
    sortOrder: v.number(),
    visible: v.boolean(),
    customLabel: v.optional(v.string()),
    customIcon: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"])
    .index("by_org_page", ["orgId", "pageKey"]),

  // 33. Share Links (Secure external download links)
  shareLinks: defineTable({
    storageId: v.id("_storage"),
    token: v.string(),        // Unique download token
    fileName: v.string(),
    createdBy: v.string(),    // User token identifier
    expiresAt: v.optional(v.number()),  // Unix timestamp
    maxUses: v.optional(v.number()),
    useCount: v.number(),     // Current download count
    password: v.optional(v.string()),
    r2Key: v.optional(v.string()),        // Cloudflare R2 object key (if cloned)
    contentType: v.optional(v.string()),  // MIME type for R2 serving
    createdAt: v.number(),
  }).index("by_token", ["token"])
    .index("by_storageId", ["storageId"]),

  // 34. Download Analytics Events
  downloadEvents: defineTable({
    shareLinkId: v.id("shareLinks"),
    token: v.string(),
    downloadedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    country: v.optional(v.string()),
  }).index("by_shareLink", ["shareLinkId"])
    .index("by_token", ["token"]),

  // 35. File Version History
  fileVersions: defineTable({
    fileId: v.id("files"),
    storageId: v.id("_storage"),
    name: v.string(),
    size: v.number(),
    uploadedBy: v.string(),
    createdAt: v.number(),
  }).index("by_file", ["fileId"]),

  // 36. Storage Quota & Usage Tracking
  storageQuota: defineTable({
    orgId: v.string(),                          // Organization identifier
    r2BucketName: v.optional(v.string()),       // Dedicated R2 bucket name
    enabled: v.boolean(),                       // Whether R2 storage is enabled
    allocatedBytes: v.number(),                 // Storage quota in bytes (e.g., 5GB = 5368709120)
    usedBytes: v.number(),                      // Current usage in bytes
    fileCount: v.number(),                      // Number of files stored
    planTier: v.optional(v.string()),           // 'starter' | 'pro' | 'enterprise'
    overageAmountCents: v.optional(v.number()), // Overage cost in cents (from Go API)
    lastReportedAt: v.optional(v.number()),     // When last reported to Go API
    lastReportedPeriod: v.optional(v.string()), // Period string e.g. "2026-03"
    lastCalculatedAt: v.number(),               // Timestamp of last usage recalculation
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),
  // 37. Workspace Personality / LLM Governance (.md files)
  workspace_personality: defineTable({
    orgId: v.string(),
    workspaceId: v.optional(v.string()), // Optional: per-workspace personality, or global if empty
    title: v.optional(v.string()),       // e.g. "Sales Agent Personality"
    content: v.string(),                 // Raw .md content
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),   // Who last edited
  }).index("by_org", ["orgId"])
    .index("by_org_workspace", ["orgId", "workspaceId"]),

  // 38. Provisioning status — pushed by Go worker after deployment succeeds
  deploymentStatus: defineTable({
    deploymentId: v.string(),            // Matches Go deployment UUID
    status: v.string(),                  // "provisioning" | "succeeded" | "failed"
    projectName: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    convexUrl: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_deploymentId", ["deploymentId"]),

  // 39. Venture Workspaces — provisioner-created workspaces under a parent org
  //     Replaces the old pattern of creating WorkOS orgs per venture.
  //     parentOrgId = the WorkOS org linked to the deployment.
  venture_workspaces: defineTable({
    parentOrgId: v.string(),             // WorkOS org ID (the parent org linked to deployment)
    deploymentId: v.optional(v.string()), // Customer Portal deployment ID
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),               // User ID of the provisioner who created this
    members: v.optional(v.array(v.object({
      userId: v.string(),
      email: v.string(),
      role: v.string(),                  // "admin" | "member"
      addedAt: v.number(),
    }))),
    files: v.optional(v.array(v.object({
      id: v.string(),
      filename: v.string(),
      assignedUserId: v.optional(v.string()),
      assignedEmail: v.optional(v.string()),
      uploadedAt: v.number(),
    }))),
    modelConfig: v.optional(v.array(v.object({
      provider: v.string(),
      modelId: v.string(),
      isDefault: v.boolean(),
    }))),
    status: v.optional(v.string()),      // "active" | "archived"
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_parentOrg", ["parentOrgId"])
    .index("by_deployment", ["deploymentId"]),

  // Custom AI External Integrations
  custom_api_integrations: defineTable({
    orgId: v.string(),
    name: v.string(),      // e.g. "Acme Search"
    endpoint: v.string(),  // e.g. "https://api.acme.com/v1/query"
    apiKey: v.optional(v.string()), // Optional encrypted or plaintext token
    method: v.optional(v.string()), // GET, POST
    description: v.string(), // Instructions for the AI (e.g. "Fetch latest financial data")
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),
});
