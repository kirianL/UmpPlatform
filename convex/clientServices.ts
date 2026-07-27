import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientServices")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clientServices").collect();
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    serviceName: v.string(),
    amount: v.number(),
    paymentStatus: v.union(
      v.literal("pagado"),
      v.literal("pendiente"),
      v.literal("parcial"),
      v.literal("sin_pago")
    ),
    contractDate: v.string(),
  },
  handler: async (ctx, args) => {
    const serviceId = await ctx.db.insert("clientServices", args);

    // Actualizar el número de proyectos en la tabla del cliente
    const client = await ctx.db.get(args.clientId);
    if (client) {
      const services = await ctx.db
        .query("clientServices")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
        .collect();
      await ctx.db.patch(args.clientId, {
        projectCount: services.length,
      });
    }

    return serviceId;
  },
});

export const update = mutation({
  args: {
    id: v.id("clientServices"),
    serviceName: v.string(),
    amount: v.number(),
    paymentStatus: v.union(
      v.literal("pagado"),
      v.literal("pendiente"),
      v.literal("parcial"),
      v.literal("sin_pago")
    ),
    contractDate: v.string(),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);
  },
});

export const remove = mutation({
  args: { id: v.id("clientServices") },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (service) {
      const clientId = service.clientId;
      await ctx.db.delete(args.id);
      
      const client = await ctx.db.get(clientId);
      if (client) {
        const remaining = await ctx.db
          .query("clientServices")
          .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
          .collect();
        await ctx.db.patch(clientId, {
          projectCount: remaining.length,
        });
      }
    }
  },
});
