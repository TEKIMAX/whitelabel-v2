
/*
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function checkAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return { userId: identity.subject, orgId: identity.orgId || "personal" };
}

export const getSlides = query({
  args: { projectId: v.string() },
  handler: async (ctx: any, args: any) => {
    const { orgId } = await checkAuth(ctx);
    const project = await ctx.db.query("projects").withIndex("by_localId", (q: any) => q.eq("localId", args.projectId)).filter((q: any) => q.eq(q.field("orgId"), orgId)).first();
    if (!project) return [];

    const slides = await ctx.db.query("deck_slides").withIndex("by_project", (q: any) => q.eq("projectId", project._id)).collect();
    return slides.sort((a: any, b: any) => a.order - b.order).map((s: any) => ({ ...s, id: s._id }));
  }
});

export const updateSlide = mutation({
  args: {
    projectId: v.string(),
    slideId: v.optional(v.string()), // If null, create new
    title: v.string(),
    content: v.string(),
    notes: v.optional(v.string()),
    order: v.number()
  },
  handler: async (ctx: any, args: any) => {
    const { orgId, userId } = await checkAuth(ctx);
    let project = await ctx.db.query("projects").withIndex("by_localId", (q: any) => q.eq("localId", args.projectId)).filter((q: any) => q.eq(q.field("orgId"), orgId)).first();

    if (!project) {
      const id = await ctx.db.insert("projects", { orgId, userId, name: "Untitled", hypothesis: "", localId: args.projectId, updatedAt: Date.now() });
      project = await ctx.db.get(id);
    }

    if (args.slideId) {
      // Update existing (assuming ID is Convex ID)
      // If ID is local (from frontend mock), we might need mapping or just create new
      // For simplicity here, assuming migration creates fresh IDs
      await ctx.db.patch(args.slideId, { title: args.title, content: args.content, notes: args.notes, order: args.order });
    } else {
      await ctx.db.insert("deck_slides", {
        projectId: project._id,
        orgId,
        title: args.title,
        content: args.content,
        notes: args.notes,
        order: args.order
      });
    }
  }
});
*/
