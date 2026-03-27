# Feature — Blog CMS

## Overview

Each venture has a built-in blog CMS. Blog posts are publicly accessible at `/p/:slug/blog` and `/p/:slug/blog/:postId`. An RSS feed is automatically generated.

## Components

- **`components/Blog/BlogPost.tsx`** — Post editor
- **`components/Blog/PostList.tsx`** — Post list management
- **`components/BlogDetailPage.tsx`** — Full post view
- **`components/BlogCustomizationSheet.tsx`** — Theme / branding settings for the blog

## Convex Backend

- **`convex/blog.ts`** — Blog settings per venture
- **`convex/blog_posts.ts`** — Post CRUD
- **`convex/blog_pages.ts`** — Custom blog pages
- **`convex/blog_rss.ts`** — RSS feed generation
- **`convex/blog_stats.ts`** — View counts, analytics

## Blog Customization

Each venture's blog is customizable:

```typescript
await ctx.runMutation(api.blog.updateSettings, {
  projectId,
  settings: {
    title: "Acme Blog",
    description: "Updates from Acme",
    coverImage: "https://...",
    themeColor: "#C5A065",
    sidebarTextColor: "#ffffff",
    mainHeroImage: "https://...",
  }
})
```

## Post Lifecycle

```typescript
// Create a post (draft)
const postId = await ctx.runMutation(api.blog_posts.create, {
  projectId,
  title: "Our Launch Story",
  content: "...",  // markdown
  status: "draft",
})

// Publish
await ctx.runMutation(api.blog_posts.update, {
  postId,
  status: "published",
  publishedAt: Date.now(),
})
```

## Public Routes

The React router handles blog public routes:

```
/p/:slug/blog           → PostList (public)
/p/:slug/blog/:postId   → BlogDetailPage (public)
```

No auth required for public blog routes. The venture's `slug` is used as the public identifier.

## RSS Feed

Generated automatically at `/p/:slug/blog/rss.xml` by `blog_rss.ts`. Contains title, description, publication date, and canonical URL for each published post.

## SEO

Blog posts support:
- `<title>` and `<meta description>` via post metadata
- Open Graph tags for social sharing
- Canonical URLs
