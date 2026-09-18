import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

type BudgetStatus = "pending" | "in_progress" | "completed" | "cancelled";

type BudgetFields = {
  concept: string;
  amount: number;
  date: string;
  category: string;
  status: BudgetStatus;
  notes?: string;
};

function expensePayload(fields: BudgetFields) {
  return {
    concept: fields.concept,
    amount: fields.amount,
    date: fields.date,
    category: fields.category,
    type: "expense" as const,
    status: "paid" as const,
    local: "Presupuesto",
  };
}

async function createExpenseFromBudget(
  ctx: MutationCtx,
  fields: BudgetFields,
): Promise<Id<"transactions">> {
  return await ctx.db.insert("transactions", expensePayload(fields));
}

async function syncExpenseFromBudget(
  ctx: MutationCtx,
  transactionId: Id<"transactions"> | undefined,
  fields: BudgetFields,
): Promise<Id<"transactions"> | undefined> {
  if (fields.status !== "completed") {
    if (transactionId) {
      const existing = await ctx.db.get(transactionId);
      if (existing) {
        await ctx.db.delete(transactionId);
      }
    }
    return undefined;
  }

  if (transactionId) {
    const existing = await ctx.db.get(transactionId);
    if (existing) {
      await ctx.db.patch(transactionId, expensePayload(fields));
      return transactionId;
    }
  }

  return await createExpenseFromBudget(ctx, fields);
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("budgetItems").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    concept: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transactionId = await syncExpenseFromBudget(ctx, undefined, args);
    return await ctx.db.insert("budgetItems", {
      ...args,
      createdAt: new Date().toISOString(),
      ...(transactionId ? { transactionId } : {}),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("budgetItems"),
    concept: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;

    const transactionId = await syncExpenseFromBudget(
      ctx,
      existing.transactionId,
      args,
    );

    await ctx.db.replace(id, {
      concept: args.concept,
      amount: args.amount,
      date: args.date,
      category: args.category,
      status: args.status,
      ...(args.notes ? { notes: args.notes } : {}),
      ...(existing.createdAt ? { createdAt: existing.createdAt } : {}),
      ...(transactionId ? { transactionId } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("budgetItems") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;

    if (existing.transactionId) {
      const linked = await ctx.db.get(existing.transactionId);
      if (linked) {
        await ctx.db.delete(existing.transactionId);
      }
    }

    await ctx.db.delete(args.id);
  },
});
