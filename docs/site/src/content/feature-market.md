# Feature — Market Sizing

## Overview

The market sizing module provides TAM/SAM/SOM calculators with AI-assisted research and bottom-up financial modeling.

## Components

- **`components/MarketHub.tsx`** — Market research home
- **`components/BottomUpSizing.tsx`** (50KB) — Bottom-up market calculator

## Hooks

- **`hooks/useMarketResearchLogic.ts`** (9.1KB) — Market research workflows
- **`hooks/useSizingConfigLogic.ts`** (9.4KB) — Sizing configuration

## Convex Backend

- **`convex/market.ts`** — Market data storage
- **`convex/marketResearch.ts`** — Research results
- **`convex/bottomUp.ts`** (19KB) — Bottom-up model computation
- **`convex/aiModules/marketActions.ts`** — AI market research
- **`convex/aiModules/market/sizing.ts`** — AI-assisted sizing
- **`convex/aiModules/market/research.ts`** — Deep market research

## Market Size Calculation

### Top-Down

```typescript
// TAM / SAM / SOM
await ctx.runMutation(api.market.saveTopDown, {
  projectId,
  tam: { value: 50_000_000_000, source: "Gartner 2024" },
  sam: { value: 5_000_000_000, method: "geographic filter" },
  som: { value: 50_000_000, method: "3-year target" },
})
```

### Bottom-Up

```typescript
// Build from customer segments × price × conversion
await ctx.runAction(api.bottomUp.calculate, {
  projectId,
  segments: [
    {
      name: "SMB",
      totalAddressable: 500_000,
      conversionRate: 0.02,
      arpu: 1_200,
    }
  ],
})
```

## AI Market Research

The AI module researches market size using the venture's description and customer segments:

```typescript
await ctx.runAction(api.aiModules.marketActions.researchMarket, {
  projectId,
  query: "B2B SaaS project management for construction firms in North America",
})
```

Returns:
- Market size estimates with sources
- Growth rate projections
- Key market trends
- Competitive landscape overview

## NAICS Code Lookup

`components/NAICSLookup.tsx` + `functions/api/naics/` — helps users identify the correct industry classification for grant applications and market reports.
