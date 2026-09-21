import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export function todayYmd(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Costa_Rica",
  });
}

export function dateOnly(iso?: string): string {
  if (!iso) return todayYmd();
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return todayYmd();
  return parsed.toLocaleDateString("en-CA", {
    timeZone: "America/Costa_Rica",
  });
}

export function addMonthsYmd(ymd: string, months: number): string {
  const [year, month, day] = dateOnly(ymd).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function computeNextPaidUntil(
  paymentDate: string,
  currentPaidUntil?: string,
): string {
  const today = todayYmd();
  const current = currentPaidUntil ? dateOnly(currentPaidUntil) : "";
  const base = current && current >= today ? current : dateOnly(paymentDate);
  return addMonthsYmd(base, 1);
}

export function isAllyPaid(ally: {
  status?: string;
  paymentStatus?: string;
}): boolean {
  return (
    ally.status === "pagado" ||
    ally.paymentStatus === "pagado" ||
    ally.status === "activo"
  );
}

export function getAllyExpiration(ally: {
  paidUntil?: string;
  lastPaidAt?: string;
  createdAt?: string;
  _creationTime?: number;
}): string {
  if (ally.paidUntil) return dateOnly(ally.paidUntil);
  const start = ally.lastPaidAt || ally.createdAt;
  if (start) return addMonthsYmd(dateOnly(start), 1);
  if (ally._creationTime) {
    return addMonthsYmd(dateOnly(new Date(ally._creationTime).toISOString()), 1);
  }
  return addMonthsYmd(todayYmd(), 1);
}

export function isAllyMembershipValid(ally: {
  status?: string;
  paymentStatus?: string;
  paidUntil?: string;
  lastPaidAt?: string;
  createdAt?: string;
  _creationTime?: number;
}): boolean {
  return isAllyPaid(ally) && todayYmd() <= getAllyExpiration(ally);
}

function allyReplaceFields(
  ally: Doc<"allies">,
  patch: Partial<
    Pick<Doc<"allies">, "status" | "paymentStatus" | "lastPaidAt" | "paidUntil">
  > & { clearPaymentDates?: boolean } = {},
) {
  const lastPaidAt = patch.clearPaymentDates
    ? undefined
    : (patch.lastPaidAt ?? ally.lastPaidAt);
  const paidUntil = patch.clearPaymentDates
    ? undefined
    : (patch.paidUntil ?? ally.paidUntil);

  return {
    fullName: ally.fullName,
    idCard: ally.idCard,
    phone: ally.phone,
    email: ally.email,
    whatsappOptIn: ally.whatsappOptIn,
    package: ally.package,
    packageAmount: ally.packageAmount,
    createdAt: ally.createdAt,
    ...(patch.status !== undefined
      ? { status: patch.status }
      : ally.status
        ? { status: ally.status }
        : {}),
    ...(patch.paymentStatus !== undefined
      ? { paymentStatus: patch.paymentStatus }
      : ally.paymentStatus
        ? { paymentStatus: ally.paymentStatus }
        : {}),
    ...(ally.notes ? { notes: ally.notes } : {}),
    ...(ally.code ? { code: ally.code } : {}),
    ...(lastPaidAt ? { lastPaidAt } : {}),
    ...(paidUntil ? { paidUntil } : {}),
  };
}

export async function refreshAllyFromPayments(
  ctx: MutationCtx,
  allyId: Id<"allies">,
) {
  const ally = await ctx.db.get(allyId);
  if (!ally) return;

  const payments = await ctx.db
    .query("allyPayments")
    .withIndex("by_allyId", (q) => q.eq("allyId", allyId))
    .collect();

  if (payments.length === 0) {
    await ctx.db.replace(
      allyId,
      allyReplaceFields(ally, {
        status: "no_pagado",
        paymentStatus: "no_pagado",
        clearPaymentDates: true,
      }),
    );
    return;
  }

  const latestByDate = [...payments].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b._creationTime - a._creationTime;
  })[0];

  const paidUntil = payments.reduce(
    (max, payment) => (payment.validUntil > max ? payment.validUntil : max),
    payments[0].validUntil,
  );

  await ctx.db.replace(
    allyId,
    allyReplaceFields(ally, {
      status: "pagado",
      paymentStatus: "pagado",
      lastPaidAt: latestByDate.date,
      paidUntil,
    }),
  );
}

export async function insertAllyPayment(
  ctx: MutationCtx,
  args: {
    allyId: Id<"allies">;
    amount: number;
    date: string;
    concept?: string;
  },
) {
  const ally = await ctx.db.get(args.allyId);
  if (!ally) {
    throw new Error("Aliado no encontrado.");
  }
  if (!(args.amount > 0)) {
    throw new Error("El monto del pago debe ser mayor a 0.");
  }

  const paymentDate = dateOnly(args.date);
  const validUntil = computeNextPaidUntil(paymentDate, ally.paidUntil);
  const pkgLabel = ally.package === "vip" ? "VIP" : "Élite";
  const codeInfo = ally.code ? ` (#${ally.code})` : "";
  const concept =
    args.concept?.trim() ||
    `Membresía ${pkgLabel} - ${ally.fullName}${codeInfo}`;

  const transactionId = await ctx.db.insert("transactions", {
    concept,
    amount: args.amount,
    date: paymentDate,
    category: "Aliados",
    type: "income",
    status: "paid",
    local: ally.fullName,
    source: "ally_payment",
  });

  const paymentId = await ctx.db.insert("allyPayments", {
    allyId: args.allyId,
    amount: args.amount,
    date: paymentDate,
    concept,
    validUntil,
    transactionId,
    createdAt: new Date().toISOString(),
  });

  await refreshAllyFromPayments(ctx, args.allyId);

  return { paymentId, transactionId, validUntil };
}

export async function deleteAllyPayment(
  ctx: MutationCtx,
  payment: Doc<"allyPayments">,
) {
  if (payment.transactionId) {
    const tx = await ctx.db.get(payment.transactionId);
    if (tx) {
      await ctx.db.delete(payment.transactionId);
    }
  }
  await ctx.db.delete(payment._id);
  await refreshAllyFromPayments(ctx, payment.allyId);
}

export async function deletePaymentsForAlly(
  ctx: MutationCtx,
  allyId: Id<"allies">,
) {
  const payments = await ctx.db
    .query("allyPayments")
    .withIndex("by_allyId", (q) => q.eq("allyId", allyId))
    .collect();

  for (const payment of payments) {
    if (payment.transactionId) {
      const tx = await ctx.db.get(payment.transactionId);
      if (tx) {
        await ctx.db.delete(payment.transactionId);
      }
    }
    await ctx.db.delete(payment._id);
  }
}

export async function syncAllyPaymentFromTransaction(
  ctx: MutationCtx,
  transactionId: Id<"transactions">,
  args: { amount: number; date: string; concept: string; status: string },
) {
  const payment = await ctx.db
    .query("allyPayments")
    .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
    .first();

  if (!payment) return;

  if (args.status === "cancelled") {
    await ctx.db.delete(payment._id);
    await refreshAllyFromPayments(ctx, payment.allyId);
    return;
  }

  await ctx.db.patch(payment._id, {
    amount: args.amount,
    date: dateOnly(args.date),
    concept: args.concept,
  });
  await refreshAllyFromPayments(ctx, payment.allyId);
}

export async function removeAllyPaymentByTransaction(
  ctx: MutationCtx,
  transactionId: Id<"transactions">,
) {
  const payment = await ctx.db
    .query("allyPayments")
    .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
    .first();

  if (!payment) return;

  const allyId = payment.allyId;
  await ctx.db.delete(payment._id);
  await refreshAllyFromPayments(ctx, allyId);
}
