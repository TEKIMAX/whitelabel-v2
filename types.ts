

export enum CanvasSection {
  PROBLEM = 'Problem',
  CUSTOMER_SEGMENTS = 'Customer Segments',
  UNIQUE_VALUE_PROPOSITION = 'Unique Value Proposition',
  SOLUTION = 'Solution',
  UNFAIR_ADVANTAGE = 'Unfair Advantage',
  REVENUE_STREAMS = 'Revenue Streams',
  COST_STRUCTURE = 'Cost Structure',
  KEY_METRICS = 'Key Metrics',
  CHANNELS = 'Channels',
}

export const CANVAS_ORDER = [
  CanvasSection.PROBLEM,
  CanvasSection.CUSTOMER_SEGMENTS,
  CanvasSection.UNIQUE_VALUE_PROPOSITION,
  CanvasSection.SOLUTION,
  CanvasSection.UNFAIR_ADVANTAGE,
  CanvasSection.CHANNELS,
  CanvasSection.KEY_METRICS,
  CanvasSection.COST_STRUCTURE,
  CanvasSection.REVENUE_STREAMS,
];

export interface Slide {
  id: string;
  title: string;
  content: string;
  items?: CanvasItem[];
  notes: string;
  imagePrompt?: string; // Concept for an image
  imageUrl?: string; // User uploaded image
}

export interface DeckTheme {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: 'serif' | 'sans';
}

export interface DeckVersion {
  id: string;
  name: string;
  timestamp: number;
  slides: Slide[];
  theme?: DeckTheme;
}

export interface CanvasVersion {
  id: string;
  name: string;
  timestamp: number;
  data: Record<CanvasSection, string>;
}

// Customer Development Types
export type CustomerStatus = 'Networking' | 'Outreach Sent' | 'Scheduled' | 'Interviewed' | 'Follow-up Needed' | 'Subscriber' | 'Potential Fit' | 'Not Yet Closed' | 'Abandoned';

export interface CustomerInterview {
  id: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  aiAnalysis?: string; // Summary/Tags
  customerStatus?: CustomerStatus;
  [key: string]: any; // Dynamic fields
}

// Agile Engineering Types
export type FeatureStatus = 'Backlog' | 'In Progress' | 'Done';
export type StackLayer = 'Frontend' | 'Backend' | 'Database' | 'Infrastructure' | 'API' | 'Design' | 'Other';

export interface Feature {
  id: string;
  _id?: string;
  _creationTime?: number;
  title: string;
  description: string;
  status: FeatureStatus;
  priority: 'Low' | 'Medium' | 'High';
  systemId?: string; // Links to an Architecture Node ID
  stackLayer?: StackLayer; // e.g., Frontend, Backend
  eisenhowerQuadrant?: EisenhowerQuadrant; // For Eisenhower Matrix
  assignedTo?: string[]; // Array of User IDs
  tags?: string[];
  source?: string;
  connectedGoalId?: string; // Links to a Goal
  connectedKeyResultId?: string; // Links to a Key Result
  creatorProfile?: {
    name: string;
    avatarUrl?: string;
    userId: string;
  };
}

// Revenue Model Types
export type CostFrequency = 'Monthly' | 'One-time' | 'Yearly';

export interface RevenueStreamItem {
  id: string;
  name: string;
  price: number;
  frequency: 'Monthly' | 'One-time'; // For simplicity
}

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  frequency: CostFrequency;
  category?: string;
  growthRate?: number;
  source?: 'Human' | 'AI';
}

export interface RevenueModelData {
  businessModelType: string; // SaaS, Marketplace, E-commerce, etc.
  modelDescription?: string; // Narrative explanation of the model
  revenueStreams: RevenueStreamItem[];
  costStructure: CostItem[];
  startingUsers: number;
  monthlyGrowthRate: number; // Percentage
  churnRate: number; // Percentage
  cac: number; // Cost per acquisition
  savedTemplates?: Record<string, Partial<RevenueModelData>>; // Custom saved templates
}

export const calculateARPU = (revenueModel?: RevenueModelData): number => {
  if (!revenueModel || !revenueModel.revenueStreams || revenueModel.revenueStreams.length === 0) return 1000;
  const totalYearlyRevenue = revenueModel.revenueStreams.reduce((sum, s) => {
    const price = typeof s.price === 'string' ? parseFloat(s.price) : s.price;
    const yearlyAmount = s.frequency === 'Monthly' ? (price || 0) * 12 : (price || 0);
    return sum + yearlyAmount;
  }, 0);
  return totalYearlyRevenue || 1000;
};

export interface RevenueModelVersion {
  id: string;
  name: string;
  timestamp: number;
  data: RevenueModelData;
}

// Market Research Types
export interface MarketData {
  tam: number; // Total Addressable Market
  sam: number; // Serviceable Available Market
  som: number; // Serviceable Obtainable Market
  reportContent: string; // The "Deep Research" white paper
  keywords?: string[]; // Tags for deep research
  tags?: string[]; // Metadata tags (e.g. AI Assisted)
  creatorProfile?: {
    name: string;
    avatarUrl?: string;
    userId: string;
  };
  source?: string;
  naicsCode?: string; // Cache for entity resolution
  workflowId?: string;
  status?: string; // 'analyzing' | 'completed' | 'failed'
  updatedAt?: number; // Last updated timestamp
}

export interface MarketVersion {
  id: string;
  name: string;
  timestamp: number;
  data: MarketData;
}

// Competitor Analysis Types
export interface Competitor {
  id: string;
  name: string;
  tabId?: string;
  source?: string;
  tags?: string[];
  creatorProfile?: {
    name: string;
    avatarUrl?: string;
    userId: string;
  };
  [key: string]: any; // Dynamic attributes
}

export interface CompetitorSubTab {
  id: string;
  name: string; // e.g. "General", "Niche", "Details"
  attributes: string[];
  competitors: Competitor[];
  analysisSummary?: string;
}

export interface CompetitorAnalysisData {
  attributes: string[]; // Legacy/Default
  competitors: Competitor[]; // Legacy/Default
  analysisSummary: string; // Legacy/Default
  subTabs?: CompetitorSubTab[]; // New: Multiple tabs support
}

// Grant & Data Audit Types
export interface DataSource {
  id: string;
  name: string;
  type: 'Canvas' | 'Report' | 'Interview' | 'Upload' | 'Manual';
  source: 'AI' | 'Human';
  content?: string;
  wordCount: number;
  tags: string[];
  timestamp: number;
}

export interface OrganizationDetails {
  legalDocs: Record<string, boolean>;
  govContracting: Record<string, 'Pending' | 'Completed' | 'Not Started'>;
  cmmcLevel: string;
  compliance: Record<string, boolean>;
}

// Team & Access Types
export type Role = 'Founder' | 'Member' | 'Investor' | 'Employee' | 'Advisor' | 'Board of Directors' | 'Board of Advisors';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  equity?: number; // Estimated equity percentage if applicable
  pictureUrl?: string;
  education?: string;
  schools?: string;
  acceptedRole?: boolean;
  allowedPages?: PageAccess[];
}



// SAFE Agreement Types
export interface SafeData {
  amountRaising: number;
  valuationCap: number;
  discountRate: number; // Percentage (e.g., 20)
  postMoney: boolean; // True for Post-Money SAFE, False for Pre-Money
  proRataRights: boolean; // Does investor get pro-rata?
  companyAddress: string;
  stateOfIncorporation: string;
  repName: string; // Representative Name (CEO)
  investorId?: string; // Linked to TeamMember
  investorName?: string; // Fallback or manual entry
  isSigned?: boolean;
  signedTimestamp?: number;
}

export interface VestingSettings {
  cliffMonths: number; // e.g. 12
  vestingMonths: number; // e.g. 48
  commencementDate?: number; // timestamp
  repName?: string;
  repTitle?: string;
  acceleration?: 'Single Trigger' | 'Double Trigger' | 'None';
}

export interface CapTableScenario {
  id: string;
  name: string;
  amountRaising: number;
  valuationCap: number;
}

// Goals / OKRs Types
export interface KeyResult {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string; // e.g., "Users", "$", "%"
  updateType?: string; // 'manual' | 'automatic'
  metricSource?: string;
  lastUpdated?: number;
  status?: 'Not Started' | 'In Progress' | 'Done';
}

export type GoalStatus = 'Upcoming' | 'In Progress' | 'Completed';

export interface Goal {
  id: string;
  title: string;
  description?: string; // New field for text-based explanation
  type: string; // broadened from specific union to string to support categories like "Product", "Fundraising"
  timeframe: string; // broadened to string to support dates
  keyResults: KeyResult[];
  status: GoalStatus; // Updated to match Kanban
  linkedCustomerIds?: string[]; // Links to CustomerInterviews
  createdAt?: number;
  archived?: boolean;
  // Quarterly Roadmap fields
  quarter?: string;   // "Q1" | "Q2" | "Q3" | "Q4"
  year?: number;      // e.g. 2026
  health?: string;    // "on_track" | "at_risk" | "behind"
  targetDate?: number;
  linkedGoalIds?: string[];  // Cross-quarter dependencies
}

// Equity Slicing Pie Types
export interface EquityContribution {
  id: string;
  memberId: string; // Links to TeamMember
  type: 'Time' | 'Cash' | 'IP' | 'Equipment' | 'Relationships' | 'Other';
  description: string;
  value: number; // Fair Market Value
  multiplier: number; // Risk Multiplier (e.g. 2x for Time, 4x for Cash)
  date: number;
}

export interface StartupData {
  id: string; // Unique ID for the project
  orgId?: string; // Organization ID
  name: string;
  slug?: string; // URL-friendly identifier
  hypothesis: string; // The one-liner or initial idea
  createdAt: number;
  lastModified: number;
  currentCanvasId?: string;
  canvas: Record<CanvasSection, string>;
  canvasVersions: CanvasVersion[]; // Snapshots of the entire business model
  deckVersions: DeckVersion[]; // Snapshots of the deck
  logoStorageId?: string; // Raw storage ID for editing

  // New Modules
  customerInterviews: CustomerInterview[];
  features: Feature[];
  revenueModel: RevenueModelData;
  revenueModelVersions?: RevenueModelVersion[];
  currentRevenueModelId?: string;

  market: MarketData;
  marketVersions: MarketVersion[];
  bottomUpSizing: MarketData;

  // Market Research Configuration
  marketConfig?: {
    samPercentage: number;
    somPercentage: number;
    naicsCode?: string;
    naicsTitle?: string;
    geography?: string;
    selectedSegments: string[];
    yearRange?: { start: number; end: number };
  };

  competitorAnalysis: CompetitorAnalysisData;

  // White Paper
  whitePaperContent?: string;

  // Business Plan
  businessPlanContent?: string;
  expenseLibrary?: CostItem[];
  lastStrategyGeneratedAt?: number;
  strategyFrequencyDays?: number;
  memoFrequencyDays?: number;
  customerDiscoveryTitle?: string;
  businessStructure?: string;
  organizationDetails?: OrganizationDetails;



  // Journey Story
  journeyStoryContent?: string;
  journeyStoryVersions?: {
    id: string;
    content: string;
    createdAt: number;
    name?: string;
  }[];
  journeyStorySource?: 'AI' | 'HUMAN_EDITED';


  // Data Audit
  dataSources: DataSource[];

  // Team
  teamMembers: TeamMember[];

  // SAFE Agreement
  safeAgreement?: any;
  vestingSettings?: any;
  totalShares?: number;
  capTableScenarios?: string;

  // OKRs
  goals: Goal[];

  // Equity Calculator
  equityContributions: EquityContribution[];

  // Feature Flags
  canvasEnabled?: boolean;
  marketResearchEnabled?: boolean;

  // Journey / Timeline
  milestones: Milestone[];
  foundingDate?: number;

  // Pending Invite Fields
  isPending?: boolean;
  targetHumanRatio?: number;
  invitationData?: {
    id?: string;
    orgName: string;
    inviterName?: string;
    acceptUrl?: string;
    token?: string;
    date: number;
    email?: string;
  };

  // Stripe Connect
  stripeAccountId?: string;
  stripeData?: string;
}

export interface AISettings {
  provider: 'google' | 'openai' | 'ollama' | 'openrouter';
  modelName: string;
  apiKey: string; // Stored in local storage
  googleApiKey?: string;
  openaiApiKey?: string;
  ollamaApiKey?: string;
  projectId?: string;
  thinkingLevel?: 'none' | 'low' | 'high'; // none=fast (2.0-flash), low=thinking (2.5-flash), high=deep (2.5-pro)
}

export interface Folder {
  _id: string;
  name: string;
  parentId?: string;
  tags?: { name: string; color: string }[];
  createdAt: number;
}

// Startup Journey / Timeline Types
export type MilestoneType = 'Launch' | 'Funding' | 'Pivot' | 'Metric' | 'Hiring' | 'Product' | 'Legal' | 'Other';
export type TractionType = 'Traction' | 'Pivot' | 'No Traction';

export interface MilestoneDocument {
  id: string;
  name: string;
  type: 'Legal' | 'File' | 'Link';
  url?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: number; // Timestamp
  type: MilestoneType;
  description: string;
  isMonumental: boolean; // "Shift of startup monument"
  isFeatured?: boolean; // Display Prominently on Timeline (Gold)
  tags?: string[];
  imageUrl?: string; // Logo or image
  tractionType?: TractionType; // Defines color coding
  theme?: string; // Year Theme color/mood
  documents?: MilestoneDocument[];
  // Attribution
  creatorProfile?: {
    name: string;
    avatarUrl?: string;
    userId: string;
  };
  source?: 'AI' | 'HUMAN';
}

export interface File {
  _id: string;
  name: string;
  title?: string;
  description?: string;
  tags?: { name: string; color: string }[];
  type: string;
  storageId: string;
  size: number;
  url?: string;
  createdAt: number;
  // Security
  creatorId?: string;
  isLocked?: boolean;
  collaborators?: string[]; // User IDs
  signers?: {
    userId: string;
    role?: string;
    status: string;
    signedAt?: number;
    ipAddress?: string;
  }[];
}

export type FieldType = 'Signature' | 'Text' | 'Date' | 'Checkbox' | 'Initials';

export interface LegalField {
  id: string;
  type: FieldType;
  label: string;
  value?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  assignedRole?: string;
  assignedTo?: string; // User ID or 'external'
}

export type DocumentType = 'NDA' | 'Advisor Agreement' | 'IP Assignment' | 'Custom Upload';

export interface LegalDocument {
  id: string;
  _id?: string;
  type: string;
  recipientId?: string;
  status: string; // 'Draft' | 'Pending Signature' | 'Signed'
  content?: string;
  attachmentUrl?: string;
  fields?: LegalField[];
  createdAt: number;
  signedAt?: number;
  variables?: Record<string, any>;
  accessKey?: string;
  recipientEmail?: string;
  // Legacy fields
  name?: string;
  fileId?: string;
  fileUrl?: string;
}

export type ViewState = 'ONBOARDING' | 'CANVAS' | 'CANVAS_LANDING' | 'STARTUP_OVERVIEW' | 'CALENDAR' | 'NOTIFICATIONS' | 'JOURNEY' | 'MARKET' | 'MARKET_RESEARCH' | 'BOTTOM_UP_SIZING' | 'COMPETITORS' | 'COMPETITIVE_MATRIX' | 'CUSTOMERS' | 'REVENUE' | 'STRIPE_DASHBOARD' | 'REPORT' | 'BUSINESS_PLAN' | 'BUSINESS_PLAN_BUILDER' | 'GOALS' | 'ENGINEERING' | 'LEGAL' | 'GRANT' | 'SAFE' | 'VESTING' | 'TEAM' | 'FILES' | 'SETTINGS' | 'EISENHOWER' | 'LANDING_PAGE' | 'IDEATION' | 'WORKSPACE' | 'WIKI' | 'DECK' | 'AI_ASSISTANT' | 'INITIATIVES' | 'ADAPTIVE_LEARNING' | 'HUMAN_AI_COOPERATION' | 'LEARN_BMC' | 'AI_DIAGNOSTIC' | 'FORECASTING' | 'REVENUE_OPS' | 'TOKEN_PRICING' | 'EXPENSES' | 'SUBSCRIPTION' | 'CALCULATOR_AI' | 'AGENTS';

export enum PageAccess {
  CANVAS = 'Canvas',
  STARTUP_OVERVIEW = 'STARTUP_OVERVIEW',
  CALENDAR = 'CALENDAR',
  NOTIFICATIONS = 'NOTIFICATIONS',
  JOURNEY = 'Journey',
  MARKET = 'Market Intelligence',
  COMPETITORS = 'Competitor Analysis',
  CUSTOMERS = 'Customer Development',
  REVENUE = 'Revenue Model',
  STRIPE_DASHBOARD = 'Payouts & Invoices',
  TOKEN_PRICING = 'Token Pricing Calculator',
  EXPENSES = 'Operating Expenses',

  SAFE = 'SAFE Generator',
  VESTING = 'Vesting Agreement',
  LEGAL = 'Legal Documents',
  TEAM = 'Team',
  FILES = 'Files',
  SETTINGS = 'Settings',
  LANDING_PAGE = 'Landing Page Builder',
  IDEATION = 'Ideation',
  WORKSPACE = 'Workspace',
  BUSINESS_PLAN_BUILDER = 'Business Plan Builder',
  DECK = 'Pitch Deck Builder',
  GOALS = 'Goals & Objectives',
  AI_ASSISTANT = 'AI Assistant',
  INITIATIVES = 'Initiatives & Divisions',
  ADAPTIVE_LEARNING = 'Adaptive Learning',
  HUMAN_AI_COOPERATION = 'Human-AI Cooperation',
  AI_DIAGNOSTIC = 'AI Diagnostics',
  AGENTS = 'Custom Agents',

  // Missing Pro Features
  GRANT = 'Grant & Funding',
  REPORT = 'White Paper Generator',
  BUSINESS_PLAN = 'Business Plan',
  BOTTOM_UP_SIZING = 'Bottom-Up Market Sizing',
  COMPETITIVE_MATRIX = 'Competitive Matrix',
  CALCULATOR_AI = 'Calculator AI'
}

export const BASIC_PLAN_PAGES = [
  PageAccess.STARTUP_OVERVIEW,
  PageAccess.IDEATION,
  PageAccess.CANVAS,
  PageAccess.GOALS,
  PageAccess.MARKET, // Basic level
  PageAccess.CALENDAR,
  PageAccess.FILES,
  PageAccess.NOTIFICATIONS,
  // PageAccess.LEARN_BMC // Assuming this maps to something exposed
];

export interface RolePermissions {
  global: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  project?: {
    create: boolean;
    delete: boolean;
  };
  canvas?: {
    create: boolean;
    update: boolean;
  };
}

// Agile Engineering Types
export type EisenhowerQuadrant = 'Do' | 'Schedule' | 'Delegate' | 'Eliminate' | 'Uncategorized';

// Feature interface is defined above (line 74)

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean; // Cannot be deleted if true
  allowedPages: PageAccess[];
  permissions?: RolePermissions;
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'founder',
    name: 'Founder',
    description: 'Full access to all modules and settings.',
    isSystem: true,
    allowedPages: Object.values(PageAccess),
    permissions: {
      global: {
        view: true,
        create: true,
        edit: true,
        delete: true
      },
      project: {
        create: true,
        delete: true
      },
      canvas: {
        create: true,
        update: true
      }
    }
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to all modules and settings, similar to Founder.',
    isSystem: true,
    allowedPages: Object.values(PageAccess),
    permissions: {
      global: {
        view: true,
        create: true,
        edit: true,
        delete: true
      },
      project: {
        create: true,
        delete: true
      },
      canvas: {
        create: true,
        update: true
      }
    }
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Standard access to project tools.',
    isSystem: true,
    allowedPages: [
      PageAccess.STARTUP_OVERVIEW,
      PageAccess.CALENDAR,
      PageAccess.JOURNEY,
      PageAccess.CANVAS,
      PageAccess.MARKET,
      PageAccess.COMPETITORS,
      PageAccess.CUSTOMERS,
      PageAccess.REVENUE,
      PageAccess.STRIPE_DASHBOARD,
      PageAccess.TOKEN_PRICING,
      PageAccess.EXPENSES,
      PageAccess.TEAM,
      PageAccess.FILES,
      PageAccess.AI_ASSISTANT,
      PageAccess.HUMAN_AI_COOPERATION
    ],
    permissions: {
      global: {
        view: true,
        create: false, // Read-only
        edit: false,   // Read-only
        delete: false
      },
      project: {
        create: false,
        delete: false
      },
      canvas: {
        create: false, // Cannot create new versions
        update: false  // Cannot edit canvas content
      }
    }
  }
];

export interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontStyle: string; // Changed from 'serif' | 'sans' to allow more options
}

export interface NavItem {
  id: string;
  label: string;
  target: string;
}

export interface HeaderConfig {
  logoType: 'text' | 'image';
  logoText: string;
  logoUrl: string;
  showNav: boolean;
  navItems: NavItem[];
}

export interface HeroConfig {
  title: string;
  subtitle: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  showMedia: boolean;
  layout: 'default' | 'full-width';
  ctaText: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  image?: string;
}

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

export interface ContentSection {
  id: string;
  title: string;
  content: string;
  type?: 'text' | 'accordion'; // Default to 'text'
  items?: AccordionItem[]; // For accordion type
  layout?: 'default' | 'split'; // Layout options
  paddingX?: 'small' | 'medium' | 'large'; // Horizontal padding options
}

export interface FormConfig {
  title: string;
  description: string;
  fields: {
    email: boolean;
    name: boolean;
    phone: boolean;
  };
  buttonText: string;
  successMessage: string;
}

export interface LandingPageConfig {
  theme: ThemeConfig;
  header: HeaderConfig;
  hero: HeroConfig;
  featuresLayout: 'grid' | 'accordion' | 'list'; // Added layout option
  features: FeatureItem[];
  contentSections: ContentSection[];
  form: FormConfig;
}

export const DEFAULT_CONFIG: LandingPageConfig = {
  theme: {
    primaryColor: '#C5A059',
    backgroundColor: '#F9F8F4',
    textColor: '#1a1a1a',
    fontStyle: 'serif',
  },
  header: {
    logoType: 'text',
    logoText: 'Venture.',
    logoUrl: '',
    showNav: true,
    navItems: [
      { id: 'nav1', label: 'Mission', target: 'hero' },
      { id: 'nav2', label: 'Features', target: 'features' },
      { id: 'nav3', label: 'Join', target: 'form' },
    ],
  },
  hero: {
    title: 'Validate Your Next Big Idea',
    subtitle: 'A minimal, elegant platform to showcase your product and build a waiting list before you write a single line of code.',
    mediaType: 'image',
    mediaUrl: 'https://picsum.photos/1920/1080',
    showMedia: true,
    layout: 'default',
    ctaText: 'Join the Waitlist',
  },
  featuresLayout: 'grid', // Default layout
  features: [
    { id: '1', title: 'Elegant Design', description: 'Timeless aesthetics that build trust immediately.' },
    { id: '2', title: 'Market Validation', description: 'Collect emails and gauge interest effortlessly.' },
    { id: '3', title: 'Fast Deployment', description: 'Launch your page in minutes, not days.' },
  ],
  contentSections: [],
  form: {
    title: 'Join the Waitlist',
    description: 'Be the first to know when we launch. Early access members get exclusive benefits.',
    fields: {
      email: true,
      name: true,
      phone: false,
    },
    buttonText: 'Request Access',
    successMessage: "Thank you! You've been added to the list.",
  },
};

// Ideation / Whiteboard Types
export type ToolType = 'select' | 'hand' | 'note' | 'text' | 'shape' | 'line' | 'image' | 'frame' | 'ai';
export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'a4' | 'social' | 'custom';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasItem {
  id: string;
  groupId?: string;
  type: 'note' | 'text' | 'shape' | 'line' | 'image' | 'frame';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  rotation: number;
  zIndex: number;
  style: {
    backgroundColor: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    shapeType?: 'rectangle' | 'circle' | 'triangle';
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    lineType?: 'straight' | 'curved';
    deviceType?: DeviceType;
    boxShadow?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontWeight?: string;
    fontStyle?: string;
    justifyContent?: 'flex-start' | 'center' | 'flex-end';
    alignItems?: 'flex-start' | 'center' | 'flex-end';
    borderRadius?: number;
  };
}

export interface WorkspaceState {
  id: string;
  name: string;
  projectId?: string; // Links back to parent project
  items: CanvasItem[];
  coverColor?: string;
  coverImage?: string;
}

export interface DashboardProps {
  allProjects: StartupData[];
  currentProjectId: string | null;
  onSwitchProject: (id: string) => void;
  onNewProject: () => void;
  onNavigate: (view: ViewState) => void;
  currentView: ViewState;
  allowedPages?: any[];
  permissions?: RolePermissions;
  projectFeatures?: {
    canvasEnabled?: boolean;
    marketResearchEnabled?: boolean;
  };
}

export interface Section {
  id: string;
  title: string;
  description?: string;
}

export type EditorState = {
  isSaving: boolean;
  lastSaved: Date | null;
}


export type CanvasData = CanvasSection[];

export interface OdysseyStep {
  id: number;
  title: string;
  subtitle: string;
  mythDescription: string;
  founderModernParallel: string;
  imagePrompt: string;
  imageUrl?: string;
  layout: 'left' | 'right' | 'top';
  quote: string;
}

export enum OnboardingState {
  INTRO = 'INTRO',
  JOURNEY = 'JOURNEY',
  OUTRO = 'OUTRO'
}

export enum PageType {
  CUSTOMERS = 'Customers',
  MODEL_CANVAS = 'Model Canvas',
  BUSINESS_PLAN = 'Business Plan',
  PITCH_DECK = 'Pitch Deck',
  ANALYTICS = 'Analytics',
  LOGO_GEN = 'Logo Generation',
  BUSINESS_OPERATIONS = 'Business Operations',
  FUNDRAISING = 'Fundraising',
  SUBSCRIPTION = 'Subscription',
  MARKET_RESEARCH = 'Market Research',
  COMPETITOR_ANALYSIS = 'Competitor Analysis',
  REVENUE = 'Revenue Model',
  GOALS = 'Goals & OKRs',
  LEGAL = 'Legal & IP',
  JOURNEY = 'Startup Journey'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  timestamp: Date;
  toolResults?: ToolResult[];
  groundingSources?: GroundingSource[];
  accuracyScore?: number;
  isStreaming?: boolean;
}

export interface ToolResult {
  type: 'chart' | 'table' | 'pitch_deck' | 'image' | 'model_canvas' | 'startup_journey' | 'customer_cards' | 'financial_snapshot' | 'swot_analysis' | 'okr_card' | 'market_sizing' | 'legal_risk' | 'process_flow' | 'action_card' | 'execution_audit' | 'expense_analysis' | 'recommendation' | 'unknown';
  data: any;
}

export interface TableData {
  columns: string[];
  rows: Record<string, any>[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  data: any[];
  title: string;
  xAxis?: string;
  yAxis?: string;
}

export interface PitchDeckSlide {
  title: string;
  content: string;
  imageUrl?: string;
  points?: string[];
}
