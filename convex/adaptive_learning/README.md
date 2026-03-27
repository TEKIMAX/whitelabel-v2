
# Tekimax Adaptive Component

This component provides a plug-and-play "Adaptive Learning" layer for Convex applications. It enables your app to:
1.  **Learn** from user feedback (avoiding repetitive mistakes).
2.  **Remember** key project decisions and constraints ("Active Memory").
3.  **Profile** users based on their behavior ("Observer AI").

## Installation

 Copy the `adaptive_learning` folder into your `convex/` directory.

## Configuration

Ensure your `schema.ts` includes the necessary tables:
- `founder_profile` (or `user_profile`)
- `project_memory` (or `app_memory`)
- `feedback_loop`

## usage

```typescript
import { api } from "./_generated/api";

// 1. Analyze Conversation & Store Memory
await ctx.runAction(api.adaptive_learning.api.analyzeConversation, { 
  chatId: "...", 
  projectId: "..." 
});

// 2. Profile User Behavior
await ctx.runAction(api.adaptive_learning.api.updateProfileFromBehavior, { 
  userId: "...", 
  chatId: "..." 
});
```
