# Convex Schema — Ventures & Related Tables

**File:** `convex/schema.ts`

## `projects` Table

The root entity. Each venture = one project record.

```typescript
projects: defineTable({
  // Identity
  orgId: v.string(),                    // WorkOS tenant org ID
  userId: v.string(),                   // Creator (WorkOS tokenIdentifier)
  creatorId: v.optional(v.id("users")), // Convex user ID of creator
  orgFounderId: v.optional(v.string()), // tokenIdentifier of org founder
  deploymentId: v.optional(v.string()), // CF Pages deployment ID

  // Metadata
  name: v.string(),
  hypothesis: v.string(),
  slug: v.optional(v.string()),         // URL slug
  logo: v.optional(v.string()),
  localId: v.optional(v.string()),      // Legacy local storage migration ID
  status: v.optional(v.string()),       // "Active" | "Deleted"
  foundingDate: v.optional(v.number()),
  businessStructure: v.optional(v.string()),
  organizationDetails: v.optional(v.string()), // JSON

  // Canvas (deprecated fields — moved to canvases table)
  problem: v.optional(v.string()),
  solution: v.optional(v.string()),
  // ... other lean canvas fields

  // Timestamps
  updatedAt: v.number(),
  updatedBy: v.optional(v.string()),

  // Pointers
  currentCanvasId: v.optional(v.id("canvases")),
})
  .index("by_org", ["orgId"])
  .index("by_localId", ["localId"])
  .index("by_creator", ["userId"])
  .index("by_slug", ["slug"])
  .index("by_deployment", ["deploymentId"])
  .index("by_org_deployment", ["orgId", "deploymentId"])
```

## `canvases` Table

Each canvas is a version of the lean business model canvas for a venture.

```typescript
canvases: defineTable({
  projectId: v.id("projects"),
  orgId: v.string(),
  name: v.string(),
  // Lean canvas fields
  problem: v.optional(v.string()),
  solution: v.optional(v.string()),
  keyMetrics: v.optional(v.string()),
  uniqueValueProposition: v.optional(v.string()),
  unfairAdvantage: v.optional(v.string()),
  channels: v.optional(v.string()),
  customerSegments: v.optional(v.string()),
  costStructure: v.optional(v.string()),
  revenueStreams: v.optional(v.string()),
  updatedAt: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_org", ["orgId"])
```

## `team_members` Table

```typescript
team_members: defineTable({
  projectId: v.id("projects"),
  orgId: v.string(),
  name: v.string(),
  email: v.string(),
  role: v.string(),                     // "Founder" | "Admin" | "Member" | "Viewer"
  joinedAt: v.number(),
  pictureUrl: v.optional(v.string()),
  acceptedRole: v.optional(v.boolean()),
  status: v.optional(v.string()),
})
  .index("by_project", ["projectId"])
  .index("by_org", ["orgId"])
```

## `users` Table

```typescript
users: defineTable({
  tokenIdentifier: v.string(),          // WorkOS token identifier
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  pictureUrl: v.optional(v.string()),
  orgIds: v.array(v.string()),          // WorkOS org IDs user belongs to
  roles: v.optional(v.array(v.object({
    orgId: v.string(),
    role: v.string(),
  }))),
  currentOrgId: v.optional(v.string()),
})
  .index("by_token", ["tokenIdentifier"])
```

## Key Indexes for Venture Queries

| Index | Table | Use case |
|---|---|---|
| `by_org` | projects | List all ventures for a tenant org |
| `by_org_deployment` | projects | List ventures for a specific deployment |
| `by_deployment` | projects | Find all ventures in a deployment (cross-org) |
| `by_project` | canvases | Get all canvas versions for a venture |
| `by_slug` | projects | Public URL lookup (e.g. `/p/:slug`) |
