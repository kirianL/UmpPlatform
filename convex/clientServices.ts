import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  deleteServiceFinanceLinks,
  insertClientPayment,
  refreshServicePaymentStatus,
  syncServiceReceivable,
} from "./clientFinance";

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
      v.literal("sin_pago"),
    ),
    contractDate: v.string(),
  },
  handler: async (ctx, args) => {
    const serviceId = await ctx.db.insert("clientServices", args);

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

    if (args.paymentStatus === "pagado" && args.amount > 0) {
      await insertClientPayment(ctx, {
        clientId: args.clientId,
        serviceId,
        amount: args.amount,
        date: args.contractDate,
        concept: `Pago completo - ${args.serviceName}`,
        status: "paid",
      });
    } else {
      await refreshServicePaymentStatus(ctx, serviceId);
      await syncServiceReceivable(ctx, serviceId);
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
      v.literal("sin_pago"),
    ),
    contractDate: v.string(),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);

    if (args.paymentStatus === "pagado") {
      const service = await ctx.db.get(id);
      if (service) {
        const payments = await ctx.db
          .query("clientPayments")
          .withIndex("by_serviceId", (q) => q.eq("serviceId", id))
          .collect();
        const covered = payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, args.amount - covered);
        if (remaining > 0) {
          await insertClientPayment(ctx, {
            clientId: service.clientId,
            serviceId: id,
            amount: remaining,
            date: args.contractDate,
            concept: `Pago completo - ${args.serviceName}`,
            status: "paid",
          });
          return;
        }
      }
    }

    await refreshServicePaymentStatus(ctx, id);
    await syncServiceReceivable(ctx, id);
  },
});

export const remove = mutation({
  args: { id: v.id("clientServices") },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (service) {
      const clientId = service.clientId;
      await deleteServiceFinanceLinks(ctx, args.id);
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
