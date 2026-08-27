import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("castingLeads").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("nuevo"),
        v.literal("contactado"),
        v.literal("evaluado"),
        v.literal("descartado"),
      ),
    ),
    createdAt: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name?.trim();
    if (trimmedName) {
      // Check if a lead with the same name already exists to prevent accidental duplicate entries
      const allLeads = await ctx.db.query("castingLeads").collect();
      const existing = allLeads.find(
        (lead) =>
          lead.name?.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (existing) {
        // Update existing lead instead of creating duplicate
        const patch: Record<string, any> = {};
        if (args.phone && args.phone.trim()) patch.phone = args.phone.trim();
        if (args.email && args.email.trim()) patch.email = args.email.trim();
        if (args.description && args.description.trim())
          patch.description = args.description.trim();
        if (args.status) patch.status = args.status;
        if (args.birthDate && args.birthDate.trim())
          patch.birthDate = args.birthDate.trim();
        if (args.photoUrl && args.photoUrl.trim())
          patch.photoUrl = args.photoUrl.trim();

        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existing._id, patch);
        }
        return existing._id;
      }
    }

    const createdAt = args.createdAt || new Date().toISOString().slice(0, 10);
    const status = args.status || "nuevo";
    return await ctx.db.insert("castingLeads", {
      ...args,
      status,
      createdAt,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("castingLeads"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("nuevo"),
        v.literal("contactado"),
        v.literal("evaluado"),
        v.literal("descartado"),
      ),
    ),
    birthDate: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("castingLeads") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await ctx.db.delete(args.id);
    }
  },
});

export const cleanDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    const allLeads = await ctx.db.query("castingLeads").collect();
    const map = new Map<string, typeof allLeads>();

    for (const lead of allLeads) {
      const key = (lead.name || "").trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(lead);
    }

    let deletedCount = 0;
    for (const [, list] of map.entries()) {
      if (list.length > 1) {
        // Pick the most complete record
        list.sort((a, b) => {
          const scoreA =
            (a.phone ? 3 : 0) +
            (a.photoUrl ? 3 : 0) +
            (a.email ? 2 : 0) +
            (a.description ? 1 : 0) +
            (a.birthDate ? 1 : 0);
          const scoreB =
            (b.phone ? 3 : 0) +
            (b.photoUrl ? 3 : 0) +
            (b.email ? 2 : 0) +
            (b.description ? 1 : 0) +
            (b.birthDate ? 1 : 0);
          return scoreB - scoreA;
        });

        const keeper = list[0];
        const patch: Record<string, any> = {};

        for (let i = 1; i < list.length; i++) {
          const dup = list[i];
          if (!keeper.phone && dup.phone) {
            keeper.phone = dup.phone;
            patch.phone = dup.phone;
          }
          if (!keeper.email && dup.email) {
            keeper.email = dup.email;
            patch.email = dup.email;
          }
          if (!keeper.description && dup.description) {
            keeper.description = dup.description;
            patch.description = dup.description;
          }
          if (!keeper.photoUrl && dup.photoUrl) {
            keeper.photoUrl = dup.photoUrl;
            patch.photoUrl = dup.photoUrl;
          }
          if (!keeper.birthDate && dup.birthDate) {
            keeper.birthDate = dup.birthDate;
            patch.birthDate = dup.birthDate;
          }

          await ctx.db.delete(dup._id);
          deletedCount++;
        }

        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(keeper._id, patch);
        }
      }
    }

    return { deletedCount };
  },
});
