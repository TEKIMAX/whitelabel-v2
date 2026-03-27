# Feature — AI Chat

## Overview

AI Chat provides multi-turn, streaming conversations with AI. Each venture has its own chat history. The model is configurable per-deployment.

## Components

- **`components/nobel_chat/`** — Main chat UI components
- **`components/CalculatorChat.tsx`** (43KB) — AI chat with built-in financial calculator

## Convex Backend

- `convex/ai.ts` — Base AI utilities
- `convex/aiChat.ts` — Chat message storage and retrieval
- `convex/aiChatWorkflow.ts` — Multi-step AI workflows

## Starting a Chat

```typescript
// Send a message
await ctx.runAction(api.aiChat.sendMessage, {
  projectId,
  sessionId,          // groups messages into a conversation
  message: "...",
})
```

Responses stream back as chunks stored in Convex. React uses a live query to subscribe to chunks and renders the response in real-time.

## Streaming Architecture

```
React sends message
  └─► Convex Action (Node.js)
        └─► AI SDK streamText({ model, messages })
        └─► For each chunk:
              └─► ctx.runMutation(internal.aiChat.appendChunk, { chunk })
  └─► React live query: messages with chunks
        └─► Renders chunks as they arrive
```

## Session Management

Chat sessions are grouped by `sessionId`. Each venture can have multiple sessions (topics). Sessions are stored in the `ai_sessions` table and listed in the chat sidebar.

## Model Selection

The active model for a deployment is read from `model_config` in Convex. Users can switch models in the settings if the deployment config allows it.

```typescript
const activeModel = useQuery(api.modelConfigQueries.getActiveModel, { orgId })
```

## System Prompts

The AI's personality and focus can be customized per-deployment via `workspace_personality.ts`:

```typescript
const personality = await ctx.db
  .query("workspace_personality")
  .withIndex("by_org", q => q.eq("orgId", orgId))
  .first()

const systemPrompt = personality?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
```

This is configured by the provisioner via the "Personality / Sync" settings in the provisioner portal.
