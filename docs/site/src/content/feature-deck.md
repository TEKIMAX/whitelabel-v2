# Feature — Pitch Deck Builder

## Overview

The Pitch Deck Builder generates AI-powered slide decks from venture data. Decks are stored in Convex and rendered as interactive slides.

## Components

- **`components/DeckBuilder.tsx`** (45KB) — Main deck editor
- **`components/DeckHome.tsx`** — Deck list and creation
- **`components/SlideCanvasItem.tsx`** — Individual slide renderer

## Hooks

- **`hooks/useDeckBuilderLogic.ts`** (25KB) — Full deck builder state and logic

## Convex Backend

- **`convex/deck.ts`** / **`convex/decks.ts`** — Deck and slide CRUD
- **`convex/aiModules/pitchDeckActions.ts`** — AI slide generation

## Creating a Deck

```typescript
const deckId = await ctx.runMutation(api.decks.create, {
  projectId,
  name: "Seed Round Deck",
})
```

## Generating Slides with AI

```typescript
await ctx.runAction(api.aiModules.pitchDeckActions.generateDeck, {
  projectId,
  deckId,
  style: "investor",  // "investor" | "customer" | "partner"
})
```

The AI reads the venture's canvas, market research, and financial model to generate contextually relevant slides:

1. Problem
2. Solution
3. Market Size (TAM/SAM/SOM)
4. Product / Demo
5. Business Model
6. Traction
7. Team
8. Financials
9. The Ask

## Slide Structure

Each slide is a Convex document:

```typescript
{
  deckId: Id<"decks">
  index: number           // slide order
  title: string
  content: string         // markdown or rich HTML
  type: "title" | "content" | "chart" | "image"
  notes?: string          // speaker notes
}
```

## Export

Decks can be exported to PDF (browser print) or shared via a public link using `shareLinks.ts`.
