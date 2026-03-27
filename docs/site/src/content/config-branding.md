# Branding

## Overview

The whitelabel app supports full visual customization per-deployment. Branding is provided at runtime via `BrandingProvider` — no rebuild required.

## BrandingProvider (`components/BrandingProvider.tsx`)

Wraps the app and provides branding values via context:

```typescript
interface Branding {
  logoUrl?: string
  primaryColor?: string
  appName?: string
  tagline?: string
  onboardingCoverUrl?: string
}

const branding = useBranding()
```

Branding is loaded from the Convex `page_configs` table for the current org.

## Setting Branding

Branding is configured via the provisioner portal's **Personality / Sync** settings, or directly in the app's **Branding Settings** panel:

```typescript
await ctx.runMutation(api.pageConfigs.set, {
  orgId,
  pageKey: "branding",
  config: {
    logoUrl: "https://your-cdn.com/logo.png",
    primaryColor: "#C5A065",
    appName: "Acme AI",
    tagline: "Build faster with AI",
  }
})
```

## Usage in Components

```typescript
// In any component
const branding = useBranding()

return (
  <button style={{ backgroundColor: branding.primaryColor || '#C5A065' }}>
    Get Started
  </button>
)
```

## Auth Page Branding

The `AuthPage` component uses `useBranding()` for:
- Logo image
- Primary color (buttons, links, focus rings)
- App name in page title

The default fallback values are the Adaptive Startup brand colors (`#C5A065` gold).

## BrandingSettings Component

`components/BrandingSettings.tsx` provides a settings panel for editing branding values. Changes are saved to Convex and take effect immediately across all active sessions (no reload needed, because Convex queries are live).
