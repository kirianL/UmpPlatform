import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  clientLabel,
  insertClientPayment,
  linksToFinance,
  refreshServicePaymentStatus,
  syncServiceReceivable,
  unlinkServiceFinance,
} from "./clientFinance";

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientPayments")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clientPayments").collect();
  },
});

export const createPayment = mutation({
  args: {
    clientId: v.id("clients"),
    serviceId: v.optional(v.id("clientServices")),
    amount: v.number(),
    date: v.string(),
    concept: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    return await insertClientPayment(ctx, args);
  },
});

export const updatePayment = mutation({
  args: {
    id: v.id("clientPayments"),
    amount: v.number(),
    date: v.string(),
    concept: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending")),
  },
  handler: async (ctx, { id, ...args }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;

    await ctx.db.patch(id, args);

    const client = await ctx.db.get(existing.clientId);
    if (!linksToFinance(client)) {
      if (existing.serviceId) {
        await refreshServicePaymentStatus(ctx, existing.serviceId);
        await unlinkServiceFinance(ctx, existing.serviceId);
      }
      return;
    }

    if (existing.transactionId) {
      let serviceInfo = "";
      if (existing.serviceId) {
        const service = await ctx.db.get(existing.serviceId);
        if (service) {
          serviceInfo = ` [${service.serviceName}]`;
        }
      }
      const clientInfo = clientLabel(client);
      const fullConcept = args.concept.trim()
        ? `${args.concept.trim()}${serviceInfo} (${clientInfo})`
        : `Pago de cliente${serviceInfo} - ${clientInfo}`;

      const tx = await ctx.db.get(existing.transactionId);
      if (tx) {
        await ctx.db.patch(existing.transactionId, {
          concept: fullConcept,
          amount: args.amount,
          date: args.date,
          status: args.status === "paid" ? "paid" : "pending",
          source: "client_payment",
        });
      }
    }

    if (existing.serviceId) {
      await refreshServicePaymentStatus(ctx, existing.serviceId);
      await syncServiceReceivable(ctx, existing.serviceId);
    }
  },
});

export const removePayment = mutation({
  args: { id: v.id("clientPayments") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      if (existing.transactionId) {
        const tx = await ctx.db.get(existing.transactionId);
        if (tx) {
          await ctx.db.delete(existing.transactionId);
        }
      }
      await ctx.db.delete(args.id);

      if (existing.serviceId) {
        await refreshServicePaymentStatus(ctx, existing.serviceId);
        await syncServiceReceivable(ctx, existing.serviceId);
      }
    }
  },
});
