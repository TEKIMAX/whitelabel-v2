import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

// --- Queries ---

export const getPost = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const post = await ctx.db
            .query("posts")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
        return post;
    },
});

export const getPostById = query({
    args: { id: v.id("posts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getPublicPost = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const post = await ctx.db
            .query("posts")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!post) return null;

        // Visibility Check
        // If published is false, strictly denied for public
        if (!post.published) return null;

        // If visibility is explicitly 'internal', deny public access
        if (post.visibility === 'internal') return null;

        let author = null;
        if (post.authorId) {
            author = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", post.authorId as string))
                .first();
        }

        return { ...post, author };
    },
});

export const getAuthorizedPost = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const post = await ctx.db
            .query("posts")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!post) return null;

        // For authorized users, we verify they have access (e.g. implicitly if they are logged in for now)
        // We return the post + author similarly to getPublicPost

        let author = null;
        if (post.authorId) {
            author = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", post.authorId as string))
                .first();
        }

        return { ...post, author };
    },
});

export const listPosts = query({
    args: {
        orgId: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
    },
    handler: async (ctx, args) => {
        let posts;
        // If scoped by project, return project posts
        if (args.projectId) {
            posts = await ctx.db
                .query("posts")
                .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
                .order("desc")
                .collect();
        } else if (args.orgId) {
            posts = await ctx.db
                .query("posts")
                .withIndex("by_org", (q) => q.eq("orgId", args.orgId!))
                .order("desc")
                .collect();
        } else {
            // Fallback/Legacy: return all (Careful with data leaks, but keeping for backward compt if needed)
            posts = await ctx.db.query("posts").order("desc").collect();
        }

        // Enrich with author info
        const postsWithAuthor = await Promise.all(posts.map(async (post) => {
            let author = null;
            if (post.authorId) {
                author = await ctx.db
                    .query("users")
                    .withIndex("by_token", (q) => q.eq("tokenIdentifier", post.authorId as string))
                    .first();
            }
            return { ...post, author };
        }));

        return postsWithAuthor;
    },
});

export const listPublicPosts = query({
    args: {
        projectSlug: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        let posts;

        if (args.projectSlug) {
            const project = await ctx.db
                .query("projects")
                .withIndex("by_slug", (q) => q.eq("slug", args.projectSlug as string))
                .first();

            if (!project) return [];

            // Fetch by project and filter in memory/DB for published public posts
            // (Using by_project index is efficient for filtering by project first)
            posts = await ctx.db
                .query("posts")
                .withIndex("by_project", (q) => q.eq("projectId", project._id))
                .filter((q) => q.and(
                    q.eq(q.field("published"), true),
                    q.neq(q.field("visibility"), "internal")
                ))
                .order("desc")
                .collect();
        } else {
            // Global public posts
            posts = await ctx.db
                .query("posts")
                .withIndex("by_published", (q) => q.eq("published", true))
                .filter((q) => q.neq(q.field("visibility"), "internal"))
                .order("desc")
                .collect();
        }

        // Enrich with author info
        const postsWithAuthor = await Promise.all(posts.map(async (post) => {
            let author = null;
            if (post.authorId) {
                author = await ctx.db
                    .query("users")
                    .withIndex("by_token", (q) => q.eq("tokenIdentifier", post.authorId as string))
                    .first();
            }
            return { ...post, author };
        }));

        return postsWithAuthor;
    },
});


// --- Mutations ---

export const createPost = mutation({
    args: {
        title: v.string(),
        content: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        coverImageStorageId: v.optional(v.id("_storage")),
        projectId: v.optional(v.id("projects")),
        orgId: v.optional(v.string()),
        visibility: v.optional(v.string()), // 'public' | 'internal'
        published: v.optional(v.boolean()),
        tags: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Check slug uniqueness
        const existing = await ctx.db
            .query("posts")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (existing) {
            throw new Error("Slug already exists");
        }

        let orgId = args.orgId;
        if (!orgId && args.projectId) {
            const project = await ctx.db.get(args.projectId);
            if (project) {
                orgId = project.orgId;
            }
        }

        const postId = await ctx.db.insert("posts", {
            title: args.title,
            content: args.content,
            slug: args.slug,
            description: args.description || "",
            coverImage: args.coverImage,
            coverImageStorageId: args.coverImageStorageId,
            projectId: args.projectId,
            orgId: orgId,
            authorId: identity.subject,
            published: args.published ?? false, // Default to draft
            visibility: args.visibility || "internal",
            tags: args.tags || [],
            category: args.category || "Uncategorized",
            date: new Date().toISOString().split('T')[0],
            lastSyncedAt: Date.now(),
        });

        return postId;
    },
});

export const updatePost = mutation({
    args: {
        id: v.id("posts"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        coverImageStorageId: v.optional(v.id("_storage")),
        published: v.optional(v.boolean()),
        visibility: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // TODO: Verify ownership via orgId/projectId if strict security needed

        const updates: any = {
            lastSyncedAt: Date.now(),
        };
        if (args.title !== undefined) updates.title = args.title;
        if (args.content !== undefined) updates.content = args.content;
        if (args.slug !== undefined) updates.slug = args.slug;
        if (args.description !== undefined) updates.description = args.description;
        if (args.coverImage !== undefined) updates.coverImage = args.coverImage;
        if (args.coverImageStorageId !== undefined) updates.coverImageStorageId = args.coverImageStorageId;
        if (args.published !== undefined) updates.published = args.published;
        if (args.visibility !== undefined) updates.visibility = args.visibility;
        if (args.visibility !== undefined) updates.visibility = args.visibility;
        if (args.tags !== undefined) updates.tags = args.tags;
        if (args.category !== undefined) updates.category = args.category;

        await ctx.db.patch(args.id, updates);
    },
});

export const deletePost = mutation({
    args: { id: v.id("posts") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        await ctx.db.delete(args.id);
    },
});

// ... existing code ...
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const listCategories = query({
    args: {
        orgId: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
    },
    handler: async (ctx, args) => {
        if (!args.orgId && !args.projectId) return [];

        let q = ctx.db.query("blog_categories");

        if (args.projectId) {
            return await q.withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();
        }

        if (args.orgId) {
            return await q.withIndex("by_org", q => q.eq("orgId", args.orgId!)).collect();
        }

        return [];
    },
});

export const createCategory = mutation({
    args: {
        name: v.string(),
        color: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        orgId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        let orgId = args.orgId;
        if (!orgId && args.projectId) {
            const project = await ctx.db.get(args.projectId);
            if (project) {
                orgId = project.orgId;
            }
        }

        if (!orgId) throw new Error("Missing orgId");

        // allow uniqueness check if desired, but for now simple insert
        const existing = await ctx.db
            .query("blog_categories")
            .withIndex("by_org", q => q.eq("orgId", orgId!))
            .filter(q => q.eq(q.field("name"), args.name))
            .first();

        if (existing) return existing._id;

        return await ctx.db.insert("blog_categories", {
            name: args.name,
            color: args.color,
            projectId: args.projectId,
            orgId: orgId!,
        });
    },
});

export const updateCategory = mutation({
    args: {
        id: v.id("blog_categories"),
        name: v.string(),
        color: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        await ctx.db.patch(args.id, {
            name: args.name,
            color: args.color,
        });
    },
});

export const deleteCategory = mutation({
    args: { id: v.id("blog_categories") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        await ctx.db.delete(args.id);
    },
});
