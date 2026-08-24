import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").order("desc").collect();

    const normalizedEmail = args.userEmail?.trim().toLowerCase();
    const isAdmin =
      args.userRole === "admin" ||
      normalizedEmail === "admin@ultimate.cr";

    let visibleTasks = tasks;

    if (!isAdmin) {
      if (!normalizedEmail) {
        return [];
      }
      visibleTasks = tasks.filter((t) => {
        const assigned = t.assignedTo?.trim().toLowerCase();
        const created = t.createdBy?.trim().toLowerCase();

        return (
          assigned === normalizedEmail ||
          (!assigned && created === normalizedEmail) ||
          created === normalizedEmail
        );
      });
    }

    // Sort pinned tasks to top
    return visibleTasks.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("baja"), v.literal("media"), v.literal("alta")),
    ),
    pinned: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assignedTo = args.assignedTo || args.createdBy;
    const assignedToName = args.assignedToName || args.createdByName;

    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      category: args.category || "General",
      priority: args.priority || "media",
      status: "pendiente",
      createdAt: new Date().toISOString(),
      pinned: args.pinned ?? false,
      imageUrl: args.imageUrl,
      assignedTo,
      assignedToName,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("baja"), v.literal("media"), v.literal("alta")),
    ),
    pinned: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const toggleStatus = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return;

    const newStatus = task.status === "pendiente" ? "realizada" : "pendiente";
    const completedAt =
      newStatus === "realizada" ? new Date().toISOString() : undefined;

    await ctx.db.patch(args.id, {
      status: newStatus,
      completedAt,
    });
  },
});

export const togglePinned = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return;

    await ctx.db.patch(args.id, {
      pinned: !task.pinned,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});
