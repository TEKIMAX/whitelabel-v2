import overviewMd from '../content/overview.md?raw'
import architectureMd from '../content/architecture.md?raw'
import localDevMd from '../content/local-dev.md?raw'
import deploymentMd from '../content/deployment.md?raw'
import authFlowMd from '../content/auth-flow.md?raw'
import authProviderMd from '../content/auth-provider.md?raw'
import authFunctionsMd from '../content/auth-functions.md?raw'
import authOrgSelectMd from '../content/auth-org-select.md?raw'
import venturesIsolationMd from '../content/ventures-isolation.md?raw'
import venturesManageMd from '../content/ventures-manage.md?raw'
import venturesSchemaMd from '../content/ventures-schema.md?raw'
import convexOverviewMd from '../content/convex-overview.md?raw'
import convexUsersMd from '../content/convex-users.md?raw'
import convexProjectsMd from '../content/convex-projects.md?raw'
import convexAiMd from '../content/convex-ai.md?raw'
import convexBillingMd from '../content/convex-billing.md?raw'
import convexFilesMd from '../content/convex-files.md?raw'
import featureAiChatMd from '../content/feature-ai-chat.md?raw'
import featureCanvasMd from '../content/feature-canvas.md?raw'
import featureDeckMd from '../content/feature-deck.md?raw'
import featureMarketMd from '../content/feature-market.md?raw'
import featureDocumentsMd from '../content/feature-documents.md?raw'
import featureBlogMd from '../content/feature-blog.md?raw'
import configEnvMd from '../content/config-env.md?raw'
import configBrandingMd from '../content/config-branding.md?raw'
import securityMd from '../content/security.md?raw'

export interface PageDef {
  path: string
  content: string
}

export const pages: PageDef[] = [
  { path: '/',                        content: overviewMd },
  { path: '/architecture',            content: architectureMd },
  { path: '/local-dev',               content: localDevMd },
  { path: '/deployment',              content: deploymentMd },
  { path: '/auth/flow',               content: authFlowMd },
  { path: '/auth/provider',           content: authProviderMd },
  { path: '/auth/functions',          content: authFunctionsMd },
  { path: '/auth/org-select',         content: authOrgSelectMd },
  { path: '/ventures/isolation',      content: venturesIsolationMd },
  { path: '/ventures/manage',         content: venturesManageMd },
  { path: '/ventures/schema',         content: venturesSchemaMd },
  { path: '/convex/overview',         content: convexOverviewMd },
  { path: '/convex/users',            content: convexUsersMd },
  { path: '/convex/projects',         content: convexProjectsMd },
  { path: '/convex/ai',               content: convexAiMd },
  { path: '/convex/billing',          content: convexBillingMd },
  { path: '/convex/files',            content: convexFilesMd },
  { path: '/features/ai-chat',        content: featureAiChatMd },
  { path: '/features/canvas',         content: featureCanvasMd },
  { path: '/features/deck',           content: featureDeckMd },
  { path: '/features/market',         content: featureMarketMd },
  { path: '/features/documents',      content: featureDocumentsMd },
  { path: '/features/blog',           content: featureBlogMd },
  { path: '/config/env',              content: configEnvMd },
  { path: '/config/branding',         content: configBrandingMd },
  { path: '/security',                content: securityMd },
]
