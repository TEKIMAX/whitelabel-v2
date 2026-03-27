/**
 * Example Venture Seed Data
 * 
 * A realistic "Whitelabel SaaS Platform" startup used as the template
 * when new users choose "Start with Example" during onboarding.
 * 
 * All fields match the Convex schema exactly.
 */

// ============================
// PROJECT
// ============================
export const PROJECT = {
    name: "Adaptive Whitelabel Platform",
    hypothesis:
        "We help SaaS founders solve the go-to-market delay problem by providing a fully branded, provisioned whitelabel platform with AI-powered business tools, using our proprietary deployment automation as our unfair advantage.",
    foundingDate: Date.now() - 7 * 365 * 24 * 60 * 60 * 1000, // 7 years ago
    revenueModelSettings: JSON.stringify({
        businessModelType: "SaaS",
        startingUsers: 12,
        monthlyGrowthRate: 15,
        churnRate: 5,
        cac: 250,
        modelDescription: "Tiered SaaS subscription model with Pro ($29/mo), Enterprise ($99/mo), and API Add-on ($19/mo). Growth driven by content marketing and accelerator partnerships. Targeting 15% month-over-month growth with 5% churn. Customer acquisition cost of $250 through a mix of paid and organic channels.",
    }),
    milestones: [
        // Year 1 — Inception
        { id: "ms_1", title: "Company Founded", date: Date.now() - 7 * 365 * 24 * 60 * 60 * 1000, type: "Launch", description: "Incorporated as an LLC in Delaware. Two co-founders, bootstrapped with $15K personal savings.", isMonumental: true, isFeatured: true, tractionType: "Traction", source: "HUMAN" },
        { id: "ms_2", title: "First MVP Shipped", date: Date.now() - 6.5 * 365 * 24 * 60 * 60 * 1000, type: "Product", description: "Launched a basic Lean Canvas tool with manual deployment. 3 beta testers from local startup meetup.", isMonumental: false, tractionType: "Traction", source: "HUMAN" },
        // Year 2 — Early Traction
        { id: "ms_3", title: "Pivoted from Consulting to Product", date: Date.now() - 6 * 365 * 24 * 60 * 60 * 1000, type: "Pivot", description: "Stopped offering consulting services to focus 100% on the platform. Revenue dropped 60% but conviction was high.", isMonumental: true, isFeatured: true, tractionType: "Pivot", source: "HUMAN" },
        { id: "ms_4", title: "First 10 Paying Users", date: Date.now() - 5.5 * 365 * 24 * 60 * 60 * 1000, type: "Metric", description: "Hit $290 MRR with 10 Pro subscribers. Validated core pricing at $29/mo.", isMonumental: false, tractionType: "Traction", source: "HUMAN" },
        // Year 3 — Growth
        { id: "ms_5", title: "Pre-Seed: $150K from Angels", date: Date.now() - 5 * 365 * 24 * 60 * 60 * 1000, type: "Funding", description: "Raised $150K from a syndicate of 4 angel investors. Valued at $1.5M pre-money.", isMonumental: true, isFeatured: true, tractionType: "Traction", source: "HUMAN" },
        { id: "ms_6", title: "Hired First Employee (UX Lead)", date: Date.now() - 4.5 * 365 * 24 * 60 * 60 * 1000, type: "Hiring", description: "Brought on Priya Patel as UX Lead. First non-founder hire, equity-based compensation.", isMonumental: false, tractionType: "Traction", source: "HUMAN" },
        // Year 4 — Product Maturation
        { id: "ms_7", title: "Launched AI Copilot (Gemini Integration)", date: Date.now() - 4 * 365 * 24 * 60 * 60 * 1000, type: "Product", description: "Integrated Google Gemini as the AI backbone. Market research, financial modeling, and chat all AI-powered.", isMonumental: true, isFeatured: true, tractionType: "Traction", source: "HUMAN" },
        { id: "ms_8", title: "$2K MRR Milestone", date: Date.now() - 3.5 * 365 * 24 * 60 * 60 * 1000, type: "Metric", description: "Crossed $2,000 monthly recurring revenue. 45 active ventures on the platform.", isMonumental: false, tractionType: "Traction", source: "HUMAN" },
        // Year 5 — Scaling
        { id: "ms_9", title: "Pivoted to Whitelabel Model", date: Date.now() - 3 * 365 * 24 * 60 * 60 * 1000, type: "Pivot", description: "Shifted from single-tenant to whitelabel provisioning. Each customer gets their own branded instance. Churn dropped 40%.", isMonumental: true, isFeatured: true, tractionType: "Pivot", source: "HUMAN" },
        { id: "ms_10", title: "First Enterprise Client (LaunchPad Accelerator)", date: Date.now() - 2.5 * 365 * 24 * 60 * 60 * 1000, type: "Metric", description: "Signed first Enterprise deal at $99/mo for 20 seats. Deployed a fully branded portal for their cohort.", isMonumental: true, tractionType: "Traction", source: "HUMAN" },
        // Year 6 — Infrastructure
        { id: "ms_11", title: "Automated Provisioning Pipeline Shipped", date: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000, type: "Product", description: "One-click deployment: Convex backend + Cloudflare Pages + WorkOS auth. Reduced provisioning time from 2 hours to 3 minutes.", isMonumental: true, isFeatured: true, tractionType: "Traction", source: "HUMAN" },
        { id: "ms_12", title: "Hired Head of Sales", date: Date.now() - 1.5 * 365 * 24 * 60 * 60 * 1000, type: "Hiring", description: "Sam Okafor joined as Head of Sales. First dedicated go-to-market hire.", isMonumental: false, tractionType: "Traction", source: "HUMAN" },
        // Year 7 — Current
        { id: "ms_13", title: "Launched NAICS & API Marketplace", date: Date.now() - 90 * 24 * 60 * 60 * 1000, type: "Product", description: "Shipped the API selection feature: NAICS code lookup, OCR, and deployment-scoped auth. API add-on revenue stream unlocked.", isMonumental: true, isFeatured: true, tractionType: "Traction", source: "HUMAN" },
        { id: "ms_14", title: "Published SDK to npm (tekimax-ts@0.3.0)", date: Date.now() - 7 * 24 * 60 * 60 * 1000, type: "Product", description: "Open-sourced the TypeScript SDK with ProvisionPlugin for deployment-scoped API access.", isMonumental: false, tractionType: "Traction", source: "HUMAN" },
        { id: "ms_15", title: "100 Active Ventures on Platform", date: Date.now() - 14 * 24 * 60 * 60 * 1000, type: "Metric", description: "Crossed 100 active ventures. $4.2K MRR. NRR at 108%.", isMonumental: true, isFeatured: true, tractionType: "Traction", source: "HUMAN" },
    ],
    expenseLibrary: [
        { id: "exp_1", name: "Cloud Hosting (AWS/GCP)", amount: 1200, frequency: "monthly", category: "Infrastructure", source: "Human" },
        { id: "exp_2", name: "Convex Backend", amount: 25, frequency: "monthly", category: "Infrastructure", source: "Human" },
        { id: "exp_3", name: "Cloudflare Pro", amount: 20, frequency: "monthly", category: "Infrastructure", source: "Human" },
        { id: "exp_4", name: "Domain & SSL Certificates", amount: 120, frequency: "yearly", category: "Infrastructure", source: "Human" },
        { id: "exp_5", name: "Legal & Incorporation", amount: 2500, frequency: "one-time", category: "Legal", source: "Human" },
        { id: "exp_6", name: "Figma (Design)", amount: 15, frequency: "monthly", category: "Tools", source: "Human" },
        { id: "exp_7", name: "GitHub Team", amount: 44, frequency: "monthly", category: "Tools", source: "Human" },
        { id: "exp_8", name: "Marketing (Google Ads Pilot)", amount: 500, frequency: "monthly", category: "Marketing", source: "Human" },
    ],
};

// ============================
// LEAN CANVAS
// ============================
export const CANVAS = {
    name: "Main",
    problem:
        "• SaaS founders spend 3-6 months building custom dashboards before validating their idea\n• Non-technical founders can't launch branded products without dev teams\n• Existing no-code tools lack AI integration and feel generic",
    solution:
        "• One-click provisioned whitelabel SaaS platform with AI copilot\n• Pre-built modules: Canvas, Financials, OKRs, Customer Discovery, Pitch Deck\n• Fully branded — custom domain, logo, colors — deployed in minutes",
    uniqueValueProposition:
        "Launch your branded SaaS startup toolkit in minutes, not months. AI-powered, fully customizable, zero infrastructure overhead.",
    unfairAdvantage:
        "• Proprietary automated provisioning pipeline (Convex + Cloudflare + WorkOS)\n• AI engine trained on 1,000+ startup frameworks\n• Network effects: shared anonymized benchmarks across ventures",
    customerSegments:
        "• Solo founders validating B2B SaaS ideas (primary)\n• Startup accelerators & incubators needing branded tools\n• Small business consultants offering client portals",
    keyMetrics:
        "• Monthly Active Ventures (MAV)\n• Time-to-First-Canvas (T2FC) < 5 minutes\n• 30-day retention rate > 60%\n• Net Revenue Retention > 110%",
    channels:
        "• Product Hunt & Indie Hackers launch\n• Content marketing (founder playbooks)\n• Strategic partnerships with accelerators\n• Referral program (free month per invite)",
    costStructure:
        "• Cloud infrastructure: ~$1,300/mo\n• AI API costs: ~$200/mo (Gemini)\n• Team salaries: $0 (bootstrapped, equity-only)\n• Marketing: $500/mo pilot budget",
    revenueStreams:
        "• Pro Plan: $29/mo per venture\n• Enterprise Plan: $99/mo (multi-seat, custom branding)\n• API Access Add-on: $19/mo (NAICS, OCR endpoints)",
};

// ============================
// OKRs (Goals + Key Results)
// ============================
export const GOALS = [
    {
        title: "Achieve $5K MRR by Q2",
        description: "Grow monthly recurring revenue to $5,000 through paid subscriptions and API add-ons.",
        type: "Strategic",
        timeframe: "Q2 2026",
        status: "In Progress",
        keyResults: [
            { description: "Acquire 50 paying Pro subscribers", target: 50, current: 12, unit: "subscribers", status: "In Progress" },
            { description: "Convert 5 Enterprise accounts", target: 5, current: 1, unit: "accounts", status: "In Progress" },
            { description: "Launch API add-on and get 10 paying users", target: 10, current: 0, unit: "users", status: "Not Started" },
        ],
    },
    {
        title: "Ship Production-Ready Platform",
        description: "Complete core platform features and ensure stability for paying customers.",
        type: "Objective",
        timeframe: "Q1 2026",
        status: "In Progress",
        keyResults: [
            { description: "99.5% uptime over 30 days", target: 99.5, current: 98.2, unit: "%", status: "In Progress" },
            { description: "Deploy automated provisioning pipeline", target: 1, current: 1, unit: "complete", status: "Done" },
            { description: "Pass security audit (SOC 2 prep)", target: 100, current: 35, unit: "%", status: "In Progress" },
        ],
    },
    {
        title: "Validate Product-Market Fit",
        description: "Conduct enough customer discovery to confirm or pivot the core hypothesis.",
        type: "Strategic",
        timeframe: "Q1 2026",
        status: "In Progress",
        keyResults: [
            { description: "Complete 20 customer interviews", target: 20, current: 7, unit: "interviews", status: "In Progress" },
            { description: "Achieve NPS score > 40", target: 40, current: 32, unit: "NPS", status: "In Progress" },
            { description: "Get 3 paying customers from referrals", target: 3, current: 1, unit: "referrals", status: "In Progress" },
        ],
    },
];

// ============================
// TEAM MEMBERS
// ============================
export const TEAM_MEMBERS = [
    { name: "Alex Chen", email: "alex@example.com", role: "CEO / Co-Founder", education: "MBA, Stanford GSB", status: "Active" },
    { name: "Jordan Rivera", email: "jordan@example.com", role: "CTO / Co-Founder", education: "MS CS, Georgia Tech", status: "Active" },
    { name: "Sam Okafor", email: "sam@example.com", role: "Head of Sales", education: "BA Business, Howard University", status: "Active" },
    { name: "Priya Patel", email: "priya@example.com", role: "UX Lead", education: "BFA Design, RISD", status: "Active" },
];

// ============================
// FEATURES / PRIORITY MATRIX (Eisenhower)
// ============================
export const FEATURES = [
    // Do (Urgent + Important)
    { title: "Stripe Billing Integration", description: "Connect Stripe for subscription billing, invoices, and payment collection.", status: "In Progress", priority: "P0", eisenhowerQuadrant: "Do", tags: ["billing", "core"] },
    { title: "Automated Provisioning API", description: "One-click deploy of whitelabel instances with custom domains and branding.", status: "Done", priority: "P0", eisenhowerQuadrant: "Do", tags: ["infrastructure", "core"] },
    // Schedule (Not Urgent + Important)
    { title: "Team Collaboration (Multi-seat)", description: "Allow multiple team members to work on the same venture with role-based access.", status: "Planned", priority: "P1", eisenhowerQuadrant: "Schedule", tags: ["collaboration"] },
    { title: "AI-Powered Market Research", description: "Auto-generate market sizing reports with TAM/SAM/SOM using Gemini.", status: "In Progress", priority: "P1", eisenhowerQuadrant: "Schedule", tags: ["ai", "research"] },
    { title: "Export to PDF (Pitch Deck + Canvas)", description: "Download professional PDF exports of pitch decks and lean canvas.", status: "Planned", priority: "P1", eisenhowerQuadrant: "Schedule", tags: ["export"] },
    // Delegate
    { title: "Blog / Content CMS", description: "Built-in blog system for each venture to publish content marketing.", status: "Planned", priority: "P2", eisenhowerQuadrant: "Delegate", tags: ["content", "marketing"] },
    { title: "Custom Email Templates", description: "Pre-built outreach templates for customer discovery interviews.", status: "Planned", priority: "P2", eisenhowerQuadrant: "Delegate", tags: ["email", "outreach"] },
    // Eliminate
    { title: "Desktop App (Electron)", description: "Native desktop wrapper — low ROI for current stage.", status: "Backlog", priority: "P3", eisenhowerQuadrant: "Eliminate", tags: ["native"] },
];

// ============================
// REVENUE STREAMS
// ============================
export const REVENUE_STREAMS = [
    { name: "Pro Plan ($29/mo)", price: 29, frequency: "Monthly" },
    { name: "Enterprise Plan ($99/mo)", price: 99, frequency: "Monthly" },
    { name: "API Add-on ($19/mo)", price: 19, frequency: "Monthly" },
];

// ============================
// COST ITEMS
// ============================
export const COSTS = [
    { name: "Cloud Hosting", amount: 1200, frequency: "Monthly" },
    { name: "AI API (Gemini)", amount: 200, frequency: "Monthly" },
    { name: "Domain & DNS", amount: 120, frequency: "Yearly" },
    { name: "Marketing Pilot", amount: 500, frequency: "Monthly" },
    { name: "Legal Setup", amount: 2500, frequency: "One-Time" },
];

// ============================
// CUSTOMER INTERVIEWS
// ============================
export const INTERVIEWS = [
    {
        customerStatus: "Interviewed",
        willingnessToPay: "$29/mo",
        sentiment: "Positive",
        customData: JSON.stringify({
            name: "Marcus Thompson",
            company: "GreenTech Solutions",
            role: "Solo Founder",
            notes: "Loved the one-click provisioning. Said he spent 4 months building his own dashboard before giving up. Would pay immediately for Pro plan. Wants PDF export for investor meetings.",
            painPoints: ["Building dashboards from scratch", "No AI tools in existing solutions", "Can't brand no-code tools"],
        }),
        tags: ["solo-founder", "saas", "early-adopter"],
        segment: "Solo Founders",
        churnRisk: "low",
    },
    {
        customerStatus: "Interviewed",
        willingnessToPay: "$99/mo",
        sentiment: "Very Positive",
        customData: JSON.stringify({
            name: "Dr. Lisa Park",
            company: "LaunchPad Accelerator",
            role: "Program Director",
            notes: "Runs a 12-week accelerator with 20 startups per cohort. Currently uses spreadsheets + Notion. Wants branded portal for each cohort. Interested in Enterprise with 20+ seats. Would be a great case study.",
            painPoints: ["Managing 20 startups on spreadsheets", "No branded portal for cohorts", "Manual progress tracking"],
        }),
        tags: ["accelerator", "enterprise", "high-value"],
        segment: "Accelerators",
        churnRisk: "low",
    },
    {
        customerStatus: "Not Yet Closed",
        willingnessToPay: "No",
        sentiment: "Neutral",
        customData: JSON.stringify({
            name: "Jake Williams",
            company: "Freelance Dev",
            role: "Freelancer",
            notes: "Interesting concept but doesn't see the value for a solo freelancer. Prefers to build custom tools. Not our ICP — too technical and doesn't need the no-code aspect.",
            painPoints: ["None specific — prefers custom builds"],
        }),
        tags: ["freelancer", "not-icp"],
        segment: "Other",
        churnRisk: "high",
    },
];

// ============================
// UPCOMING MEETINGS
// ============================
export const SCHEDULES = [
    {
        title: "Follow-up: LaunchPad Accelerator (Enterprise Demo)",
        description: "Demo the multi-seat Enterprise features for Dr. Lisa Park. Prepare branded mockup for their accelerator.",
        duration: 45,
        status: "scheduled",
        daysFromNow: 3,
    },
    {
        title: "Customer Discovery: FinTech Founder",
        description: "Initial discovery call with a FinTech founder building a lending platform. Explore if our financial modeling tools fit their needs.",
        duration: 30,
        status: "scheduled",
        daysFromNow: 7,
    },
];
