import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export function todayYmd(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Costa_Rica",
  });
}

export function currentMonthYm(): string {
  return todayYmd().slice(0, 7);
}

export const get = query({
  args: {
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetMonth = args.month || currentMonthYm();
    const expenses = await ctx.db.query("fixedExpenses").order("desc").collect();
    const payments = await ctx.db
      .query("fixedExpensePayments")
      .withIndex("by_month", (q) => q.eq("month", targetMonth))
      .collect();

    const paymentMap = new Map(
      payments.map((p) => [p.fixedExpenseId.toString(), p]),
    );

    return expenses.map((expense) => {
      const payment = paymentMap.get(expense._id.toString()) || null;
      const isPaid = payment?.status === "paid";
      return {
        ...expense,
        monthPayment: payment,
        isPaidThisMonth: isPaid,
        paymentStatus: isPaid ? ("paid" as const) : ("pending" as const),
        paidAt: payment?.paidAt,
      };
    });
  },
});

export const create = mutation({
  args: {
    concept: v.string(),
    amount: v.number(),
    category: v.string(),
    dueDay: v.number(),
    active: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fixedExpenses", {
      concept: args.concept.trim(),
      amount: args.amount,
      category: args.category.trim(),
      dueDay: Math.min(31, Math.max(1, args.dueDay)),
      active: args.active,
      notes: args.notes?.trim() || undefined,
      createdAt: todayYmd(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("fixedExpenses"),
    concept: v.string(),
    amount: v.number(),
    category: v.string(),
    dueDay: v.number(),
    active: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;

    await ctx.db.replace(id, {
      concept: args.concept.trim(),
      amount: args.amount,
      category: args.category.trim(),
      dueDay: Math.min(31, Math.max(1, args.dueDay)),
      active: args.active,
      notes: args.notes?.trim() || undefined,
      createdAt: existing.createdAt || todayYmd(),
    });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("fixedExpenses") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    await ctx.db.patch(args.id, {
      active: !existing.active,
    });
  },
});

export const togglePayment = mutation({
  args: {
    fixedExpenseId: v.id("fixedExpenses"),
    month: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending")),
    paidDate: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.fixedExpenseId);
    if (!expense) return;

    const existingPayments = await ctx.db
      .query("fixedExpensePayments")
      .withIndex("by_fixedExpenseId", (q) =>
        q.eq("fixedExpenseId", args.fixedExpenseId),
      )
      .collect();

    const currentMonthPayment = existingPayments.find(
      (p) => p.month === args.month,
    );

    const paymentDate = args.paidDate || todayYmd();
    const paymentAmount = args.amount !== undefined ? args.amount : expense.amount;

    // Si había alguna transacción vinculada anteriormente, la eliminamos para no afectar Finanzas (Beta independiente)
    if (currentMonthPayment?.transactionId) {
      const linkedTx = await ctx.db.get(currentMonthPayment.transactionId);
      if (linkedTx) {
        await ctx.db.delete(currentMonthPayment.transactionId);
      }
    }

    if (args.status === "paid") {
      if (currentMonthPayment) {
        await ctx.db.replace(currentMonthPayment._id, {
          fixedExpenseId: args.fixedExpenseId,
          month: args.month,
          status: "paid",
          paidAt: paymentDate,
          amount: paymentAmount,
        });
      } else {
        await ctx.db.insert("fixedExpensePayments", {
          fixedExpenseId: args.fixedExpenseId,
          month: args.month,
          status: "paid",
          paidAt: paymentDate,
          amount: paymentAmount,
        });
      }
    } else {
      // Mark as pending
      if (currentMonthPayment) {
        await ctx.db.delete(currentMonthPayment._id);
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("fixedExpenses") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;

    const payments = await ctx.db
      .query("fixedExpensePayments")
      .withIndex("by_fixedExpenseId", (q) => q.eq("fixedExpenseId", args.id))
      .collect();

    for (const payment of payments) {
      if (payment.transactionId) {
        const linkedTx = await ctx.db.get(payment.transactionId);
        if (linkedTx) {
          await ctx.db.delete(payment.transactionId);
        }
      }
      await ctx.db.delete(payment._id);
    }

    await ctx.db.delete(args.id);
  },
});
