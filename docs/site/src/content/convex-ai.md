# Convex — AI Modules

## Overview

AI is built on the **Vercel AI SDK** (`ai` package) with Convex Actions as the execution layer.

Supported models (configured per-deployment by provisioner):
- **Google Gemini** (Pro, Flash) — primary
- **Ollama** — local models via `convex/ollamaService.ts`
- Model selection stored in `convex/model_config.ts`

## AI Chat (`convex/ai.ts`, `convex/aiChat.ts`)

Multi-turn chat with streaming responses.

```typescript
// Send a message
await ctx.runAction(api.aiChat.sendMessage, {
  projectId,
  message: "Help me write a value proposition",
  modelId: "gemini-1.5-pro",
})
```

Responses are streamed to the Convex database as chunks — the React UI live-subscribes and renders in real-time.

`aiChatWorkflow.ts` uses `@convex-dev/workflow` for complex multi-step AI flows that persist across interruptions.

## AI Agents (`convex/aiAgents.ts`)

Specialized agents for domain-specific tasks. Each agent has a system prompt, tools, and a specific scope (market research, financial modeling, etc.).

Agents are invoked from the `AgentDirectory` component.

## AI Modules (`convex/aiModules/`)

19 specialized action modules. Each handles a specific domain:

| Module | File | Purpose |
|---|---|---|
| Analysis | `analysisActions.ts` | General business analysis |
| Customers | `customerActions.ts` | Customer discovery insights |
| Discovery | `discoveryActions.ts` | Market discovery |
| Documents | `documentActions.ts` | NDA, IP, contract generation |
| Financial | `financialActions.ts` | Revenue projections, modeling |
| Interviews | `interviewActions.ts` | Customer interview analysis |
| Market | `marketActions.ts` | TAM/SAM/SOM research |
| Pitch Deck | `pitchDeckActions.ts` | Slide content generation |
| Reports | `reportActions.ts` | Business report generation |
| Adaptive | `adaptiveActions.ts` | Personalized recommendations |
| Canvas | `market/canvas.ts` | Canvas analysis |
| Competitors | `market/competitors.ts` | Competitive intelligence |
| Planning | `market/planning.ts` | Strategic planning |
| Research | `market/research.ts` | Deep market research |
| Sizing | `market/sizing.ts` | Market size calculator AI |

## Model Configuration

Each deployment has its own model config set by the provisioner:

```typescript
// convex/model_config.ts
const config = await ctx.db
  .query("model_configs")
  .withIndex("by_org", q => q.eq("orgId", orgId))
  .first()

// Access active model
const activeModel = config?.selectedModels?.[0] ?? "gemini-1.5-pro"
```

Model selection is synced via `/api/sync-config` after provisioning.

## Adaptive Learning (`convex/adaptive.ts`)

The adaptive learning system personalizes AI recommendations based on user behavior and progress. It tracks:
- Which features a user has engaged with
- Assessment scores and feedback
- Learning progression patterns

The `useActiveModel` hook in React reads the configured model for the current deployment.

## Usage Tracking

Token usage is tracked in `convex/usage.ts` and reported to Stripe Metering via `externalUsage.ts`. A cron job runs periodically to flush usage records.

```typescript
// Each AI call records usage
await ctx.runMutation(internal.usage.record, {
  orgId,
  model: modelId,
  inputTokens,
  outputTokens,
  timestamp: Date.now(),
})
```
