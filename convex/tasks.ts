import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").order("desc").collect();
    // Sort pinned tasks to top
    return tasks.sort((a, b) => {
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
    assignedToUsers: v.optional(
      v.array(
        v.object({
          email: v.string(),
          name: v.string(),
        }),
      ),
    ),
    createdBy: v.optional(v.string()),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let assignedTo = args.assignedTo;
    let assignedToName = args.assignedToName;

    if (args.assignedToUsers && args.assignedToUsers.length > 0) {
      assignedTo = args.assignedToUsers.map((u) => u.email).join(",");
      assignedToName = args.assignedToUsers.map((u) => u.name).join(", ");
    } else {
      assignedTo = assignedTo || args.createdBy;
      assignedToName = assignedToName || args.createdByName;
    }

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
      assignedToUsers: args.assignedToUsers,
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
    assignedToUsers: v.optional(
      v.array(
        v.object({
          email: v.string(),
          name: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, { id, ...args }) => {
    let assignedTo = args.assignedTo;
    let assignedToName = args.assignedToName;

    if (args.assignedToUsers && args.assignedToUsers.length > 0) {
      assignedTo = args.assignedToUsers.map((u) => u.email).join(",");
      assignedToName = args.assignedToUsers.map((u) => u.name).join(", ");
    }

    await ctx.db.patch(id, {
      ...args,
      assignedTo,
      assignedToName,
    });
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
