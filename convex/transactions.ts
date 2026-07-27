import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("cancelled")),
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
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("cancelled")),
    local: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await ctx.db.patch(id, args);

    // Sincronización bidireccional con el pago de cliente en Clientes si está vinculado
    const payments = await ctx.db
      .query("clientPayments")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", id))
      .collect();

    for (const payment of payments) {
      const paymentStatus: "paid" | "pending" = args.status === "paid" ? "paid" : "pending";
      await ctx.db.patch(payment._id, {
        amount: args.amount,
        date: args.date,
        status: paymentStatus,
      });

      // Recalcular el estado de pago del servicio si existe
      if (payment.serviceId) {
        const service = await ctx.db.get(payment.serviceId);
        if (service) {
          const servicePayments = await ctx.db
            .query("clientPayments")
            .withIndex("by_serviceId", (q) => q.eq("serviceId", payment.serviceId))
            .collect();

          const totalPaid = servicePayments
            .filter((p) => (p._id === payment._id ? paymentStatus === "paid" : p.status === "paid"))
            .reduce((sum, p) => sum + (p._id === payment._id ? args.amount : p.amount), 0);

          let newServiceStatus: "pagado" | "parcial" | "pendiente" | "sin_pago" = "pendiente";
          if (totalPaid >= service.amount && service.amount > 0) {
            newServiceStatus = "pagado";
          } else if (totalPaid > 0) {
            newServiceStatus = "parcial";
          }

          await ctx.db.patch(payment.serviceId, { paymentStatus: newServiceStatus });
        }
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing) {
      // Eliminar y recalcular el pago de cliente vinculado si existe
      const payments = await ctx.db
        .query("clientPayments")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", args.id))
        .collect();

      for (const payment of payments) {
        const serviceId = payment.serviceId;
        await ctx.db.delete(payment._id);

        if (serviceId) {
          const service = await ctx.db.get(serviceId);
          if (service) {
            const remainingPayments = await ctx.db
              .query("clientPayments")
              .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
              .collect();

            const totalPaid = remainingPayments
              .filter((p) => p._id !== payment._id && p.status === "paid")
              .reduce((sum, p) => sum + p.amount, 0);

            let newServiceStatus: "pagado" | "parcial" | "pendiente" | "sin_pago" = "pendiente";
            if (totalPaid >= service.amount && service.amount > 0) {
              newServiceStatus = "pagado";
            } else if (totalPaid > 0) {
              newServiceStatus = "parcial";
            }

            await ctx.db.patch(serviceId, { paymentStatus: newServiceStatus });
          }
        }
      }

      await ctx.db.delete(args.id);
    }
  },
});
