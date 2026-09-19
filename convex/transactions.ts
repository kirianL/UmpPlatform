import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  insertClientPayment,
  refreshServicePaymentStatus,
  replaceClientService,
  syncServiceReceivable,
} from "./clientFinance";

async function releaseBudgetLink(
  ctx: MutationCtx,
  transactionId: Id<"transactions">,
) {
  const linkedBudgetItems = await ctx.db
    .query("budgetItems")
    .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
    .collect();

  for (const item of linkedBudgetItems) {
    await ctx.db.replace(item._id, {
      concept: item.concept,
      amount: item.amount,
      date: item.date,
      category: item.category,
      status: item.status === "completed" ? "pending" : item.status,
      ...(item.notes ? { notes: item.notes } : {}),
      ...(item.createdAt ? { createdAt: item.createdAt } : {}),
    });
  }
}

async function getLinkedServices(
  ctx: MutationCtx,
  transactionId: Id<"transactions">,
) {
  return await ctx.db
    .query("clientServices")
    .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
    .collect();
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("transactions").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    concept: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("cancelled"),
    ),
    local: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    concept: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("cancelled"),
    ),
    local: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);

    if (args.status === "cancelled") {
      await releaseBudgetLink(ctx, id);
    }

    const payments = await ctx.db
      .query("clientPayments")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", id))
      .collect();

    for (const payment of payments) {
      const paymentStatus: "paid" | "pending" =
        args.status === "paid" ? "paid" : "pending";

      if (args.status === "pending" && payment.serviceId) {
        const service = await ctx.db.get(payment.serviceId);
        const canRestoreReceivable =
          !!service &&
          (!service.transactionId || service.transactionId === id);

        if (canRestoreReceivable && service) {
          await ctx.db.delete(payment._id);
          await ctx.db.patch(id, {
            source: "client_receivable",
            status: "pending",
          });
          await replaceClientService(ctx, service, { transactionId: id });
          await refreshServicePaymentStatus(ctx, payment.serviceId);
          await syncServiceReceivable(ctx, payment.serviceId);
          continue;
        }
      }

      await ctx.db.patch(payment._id, {
        amount: args.amount,
        date: args.date,
        status: paymentStatus,
      });

      if (payment.serviceId) {
        await refreshServicePaymentStatus(ctx, payment.serviceId);
        await syncServiceReceivable(ctx, payment.serviceId);
      }
    }

    const linkedServices = await getLinkedServices(ctx, id);
    for (const service of linkedServices) {
      if (args.status === "paid") {
        await replaceClientService(ctx, service, {
          clearTransactionId: true,
        });
        await insertClientPayment(ctx, {
          clientId: service.clientId,
          serviceId: service._id,
          amount: args.amount,
          date: args.date,
          concept: args.concept,
          status: "paid",
          transactionId: id,
        });
        continue;
      }

      await syncServiceReceivable(ctx, service._id);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      const payments = await ctx.db
        .query("clientPayments")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", args.id))
        .collect();

      for (const payment of payments) {
        const serviceId = payment.serviceId;
        await ctx.db.delete(payment._id);

        if (serviceId) {
          await refreshServicePaymentStatus(ctx, serviceId);
          await syncServiceReceivable(ctx, serviceId);
        }
      }

      const linkedServices = await getLinkedServices(ctx, args.id);
      if (linkedServices.length > 0 && payments.length === 0) {
        return;
      }

      for (const service of linkedServices) {
        await replaceClientService(ctx, service, {
          clearTransactionId: true,
        });
      }

      await ctx.db.delete(args.id);
      await releaseBudgetLink(ctx, args.id);

      for (const service of linkedServices) {
        await syncServiceReceivable(ctx, service._id);
      }
    }
  },
});
