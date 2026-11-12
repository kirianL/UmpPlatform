import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name || u.email,
      role: u.role || "produccion",
      allowedRoutes: u.allowedRoutes,
    }));
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    allowedRoutes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      throw new Error("El usuario ya existe");
    }

    return await ctx.db.insert("users", {
      ...args,
      email,
    });
  },
});

export const upsert = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    allowedRoutes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        passwordHash: args.passwordHash,
        name: args.name ?? existing.name,
        role: args.role ?? existing.role,
        ...(args.allowedRoutes !== undefined
          ? { allowedRoutes: args.allowedRoutes }
          : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      email,
    });
  },
});

export const updatePermissions = mutation({
  args: {
    userId: v.id("users"),
    allowedRoutes: v.array(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = { allowedRoutes: args.allowedRoutes };
    if (args.role) updateData.role = args.role;
    await ctx.db.patch(args.userId, updateData);
    return true;
  },
});

export const updatePassword = mutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { passwordHash: args.passwordHash });
    return true;
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: args.role });
    return true;
  },
});

export const remove = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.userId);
    return true;
  },
});
