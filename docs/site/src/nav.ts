export interface NavItem  { title: string; href: string }
export interface NavGroup { title: string; items: NavItem[] }

export const navigation: NavGroup[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Overview',          href: '/' },
      { title: 'Architecture',      href: '/architecture' },
      { title: 'Local Development', href: '/local-dev' },
      { title: 'Deployment',        href: '/deployment' },
    ],
  },
  {
    title: 'Authentication',
    items: [
      { title: 'Auth Flow',            href: '/auth/flow' },
      { title: 'CustomAuthProvider',   href: '/auth/provider' },
      { title: 'CF Functions (Auth)',   href: '/auth/functions' },
      { title: 'Org Auto-Select',      href: '/auth/org-select' },
    ],
  },
  {
    title: 'Ventures & Workspaces',
    items: [
      { title: 'Org / Venture Isolation', href: '/ventures/isolation' },
      { title: 'Create & Manage',         href: '/ventures/manage' },
      { title: 'Convex Schema',           href: '/ventures/schema' },
    ],
  },
  {
    title: 'Convex Backend',
    items: [
      { title: 'Overview',          href: '/convex/overview' },
      { title: 'Users & Roles',     href: '/convex/users' },
      { title: 'Projects',          href: '/convex/projects' },
      { title: 'AI Modules',        href: '/convex/ai' },
      { title: 'Billing & Stripe',  href: '/convex/billing' },
      { title: 'Files & Storage',   href: '/convex/files' },
    ],
  },
  {
    title: 'CF Pages Functions',
    items: [
      { title: 'Auth Endpoints',    href: '/functions/auth' },
      { title: 'Org Membership',    href: '/functions/membership' },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'AI Chat',           href: '/features/ai-chat' },
      { title: 'Business Canvas',   href: '/features/canvas' },
      { title: 'Pitch Deck',        href: '/features/deck' },
      { title: 'Market Sizing',     href: '/features/market' },
      { title: 'Documents',         href: '/features/documents' },
      { title: 'Blog CMS',          href: '/features/blog' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { title: 'Environment Variables', href: '/config/env' },
      { title: 'Branding',              href: '/config/branding' },
    ],
  },
  {
    title: 'Security',
    items: [
      { title: 'Security Overview',     href: '/security' },
    ],
  },
]
