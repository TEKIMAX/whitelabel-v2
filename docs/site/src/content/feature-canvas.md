# Feature — Business Model Canvas

## Overview

The Business Model Canvas implements a **Lean Canvas 2.0** — a one-page business model template adapted for early-stage startups.

## Canvas Fields

| Field | Description |
|---|---|
| Problem | Top 3 problems being solved |
| Solution | Top 3 features / solutions |
| Unique Value Proposition | Single, clear, compelling message |
| Unfair Advantage | Cannot be easily copied or bought |
| Customer Segments | Target customers and users |
| Key Metrics | Key activities you measure |
| Channels | Path to customers |
| Cost Structure | Fixed and variable costs |
| Revenue Streams | Revenue model and pricing |

## Components

- **`components/CanvasLanding.tsx`** — Canvas home (select/create version)
- **`components/CanvasStack.tsx`** — Canvas editor with all 9 sections

## Convex Backend

- **`convex/canvas.ts`** — Canvas CRUD (create, update, get versions)
- Each canvas version is a separate document in the `canvases` table
- `projects.currentCanvasId` points to the active version

## Canvas Versioning

Every time a canvas is saved, a new version can be created:

```typescript
// Save current canvas
await ctx.runMutation(api.canvas.update, {
  canvasId,
  problem: "...",
  solution: "...",
  // ...
})

// Create a new version
const newCanvasId = await ctx.runMutation(api.canvas.createVersion, {
  projectId,
  name: "v2 — Post-pivot",
})
await ctx.runMutation(api.projects.setCurrentCanvas, { projectId, canvasId: newCanvasId })
```

## AI Canvas Analysis

The `analysisActions.ts` AI module can analyze the canvas and provide feedback:

```typescript
await ctx.runAction(api.aiModules.analysisActions.analyzeCanvas, {
  projectId,
  canvasId,
})
```

Returns strengths, weaknesses, and suggested improvements for each canvas section.
