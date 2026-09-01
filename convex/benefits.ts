import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ----------------------------------------------------
// 1. BUSINESSES (Comercios Asociados)
// ----------------------------------------------------
export const getBusinesses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("partnerBusinesses").order("desc").collect();
  },
});

export const createBusiness = mutation({
  args: {
    name: v.string(),
    pin: v.string(),
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("activo"), v.literal("inactivo"))),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    const cleanPin = args.pin.trim();

    if (!trimmedName) {
      throw new Error("El nombre del comercio es requerido.");
    }
    if (!cleanPin || cleanPin.length < 4) {
      throw new Error("El PIN debe contener al menos 4 caracteres.");
    }

    return await ctx.db.insert("partnerBusinesses", {
      name: trimmedName,
      pin: cleanPin,
      category: args.category?.trim() || undefined,
      status: args.status || "activo",
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateBusiness = mutation({
  args: {
    id: v.id("partnerBusinesses"),
    name: v.optional(v.string()),
    pin: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("activo"), v.literal("inactivo"))),
  },
  handler: async (ctx, { id, ...args }) => {
    const patchData: Record<string, any> = {};
    if (args.name !== undefined) patchData.name = args.name.trim();
    if (args.pin !== undefined) patchData.pin = args.pin.trim();
    if (args.category !== undefined) patchData.category = args.category.trim();
    if (args.status !== undefined) patchData.status = args.status;

    await ctx.db.patch(id, patchData);
  },
});

export const removeBusiness = mutation({
  args: { id: v.id("partnerBusinesses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ----------------------------------------------------
// 2. BENEFITS (Beneficios y Descuentos)
// ----------------------------------------------------
export const getBenefits = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("allyBenefits").order("desc").collect();
  },
});

export const createBenefit = mutation({
  args: {
    businessId: v.optional(v.id("partnerBusinesses")),
    businessName: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    applicablePackage: v.union(
      v.literal("all"),
      v.literal("vip"),
      v.literal("elite"),
    ),
    frequency: v.union(
      v.literal("monthly"),
      v.literal("once"),
      v.literal("unlimited"),
    ),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const businessName = args.businessName.trim();
    if (!title) throw new Error("El título del beneficio es requerido.");
    if (!businessName) throw new Error("El nombre del comercio es requerido.");

    return await ctx.db.insert("allyBenefits", {
      businessId: args.businessId,
      businessName,
      title,
      description: args.description?.trim() || undefined,
      applicablePackage: args.applicablePackage,
      frequency: args.frequency,
      active: args.active,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateBenefit = mutation({
  args: {
    id: v.id("allyBenefits"),
    businessId: v.optional(v.id("partnerBusinesses")),
    businessName: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    applicablePackage: v.optional(
      v.union(v.literal("all"), v.literal("vip"), v.literal("elite")),
    ),
    frequency: v.optional(
      v.union(v.literal("monthly"), v.literal("once"), v.literal("unlimited")),
    ),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    const patchData: Record<string, any> = {};
    if (args.businessId !== undefined) patchData.businessId = args.businessId;
    if (args.businessName !== undefined)
      patchData.businessName = args.businessName.trim();
    if (args.title !== undefined) patchData.title = args.title.trim();
    if (args.description !== undefined)
      patchData.description = args.description.trim();
    if (args.applicablePackage !== undefined)
      patchData.applicablePackage = args.applicablePackage;
    if (args.frequency !== undefined) patchData.frequency = args.frequency;
    if (args.active !== undefined) patchData.active = args.active;

    await ctx.db.patch(id, patchData);
  },
});

export const removeBenefit = mutation({
  args: { id: v.id("allyBenefits") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ----------------------------------------------------
// 3. REDEMPTIONS & VERIFICATION (Canjes de Beneficios)
// ----------------------------------------------------
export const getRedemptions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("allyBenefitRedemptions").order("desc").collect();
  },
});

export const getBenefitsForAlly = query({
  args: { allyCode: v.string() },
  handler: async (ctx, args) => {
    const cleanCode = args.allyCode.trim().toUpperCase().replace(/^#/, "");
    if (!cleanCode) return { ally: null, benefits: [] };

    const ally = await ctx.db
      .query("allies")
      .withIndex("by_code", (q) => q.eq("code", cleanCode))
      .first();

    if (!ally) return { ally: null, benefits: [] };

    const allBenefits = await ctx.db
      .query("allyBenefits")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const redemptions = await ctx.db
      .query("allyBenefitRedemptions")
      .withIndex("by_allyId", (q) => q.eq("allyId", ally._id))
      .collect();

    const currentPeriod = getCurrentPeriod();

    const mappedBenefits = allBenefits
      .filter((b) => {
        if (b.applicablePackage === "all") return true;
        return b.applicablePackage === ally.package;
      })
      .map((b) => {
        let isRedeemed = false;
        let lastRedeemedAt: string | undefined = undefined;
        let lastRedeemedBusiness: string | undefined = undefined;

        if (b.frequency === "monthly") {
          const found = redemptions.find(
            (r) => r.benefitId === b._id && r.period === currentPeriod,
          );
          if (found) {
            isRedeemed = true;
            lastRedeemedAt = found.redeemedAt;
            lastRedeemedBusiness = found.businessName;
          }
        } else if (b.frequency === "once") {
          const found = redemptions.find((r) => r.benefitId === b._id);
          if (found) {
            isRedeemed = true;
            lastRedeemedAt = found.redeemedAt;
            lastRedeemedBusiness = found.businessName;
          }
        }

        return {
          _id: b._id,
          title: b.title,
          businessName: b.businessName,
          businessId: b.businessId,
          description: b.description,
          frequency: b.frequency,
          applicablePackage: b.applicablePackage,
          isRedeemed,
          lastRedeemedAt,
          lastRedeemedBusiness,
        };
      });

    return {
      ally: {
        _id: ally._id,
        fullName: ally.fullName,
        code: ally.code || cleanCode,
        package: ally.package,
        status: ally.status,
        paymentStatus: ally.paymentStatus,
        createdAt: ally.createdAt,
      },
      benefits: mappedBenefits,
    };
  },
});

export const redeemBenefit = mutation({
  args: {
    allyCode: v.string(),
    benefitId: v.id("allyBenefits"),
    pin: v.string(),
    businessId: v.optional(v.id("partnerBusinesses")),
  },
  handler: async (ctx, args) => {
    const cleanCode = args.allyCode.trim().toUpperCase().replace(/^#/, "");
    const cleanPin = args.pin.trim();

    // 1. Verify ally
    const ally = await ctx.db
      .query("allies")
      .withIndex("by_code", (q) => q.eq("code", cleanCode))
      .first();

    if (!ally) {
      throw new Error("Afiliado no encontrado.");
    }

    const isPaid =
      ally.status === "pagado" ||
      ally.paymentStatus === "pagado" ||
      ally.status === "activo";

    if (!isPaid) {
      throw new Error("El afiliado cuenta con un estado pendiente de pago.");
    }

    // 2. Verify benefit
    const benefit = await ctx.db.get(args.benefitId);
    if (!benefit || !benefit.active) {
      throw new Error("El beneficio no existe o no se encuentra activo.");
    }

    // 3. Verify PIN against partner business or fallback
    let partnerBusiness = null;
    if (args.businessId) {
      partnerBusiness = await ctx.db.get(args.businessId);
    } else if (benefit.businessId) {
      partnerBusiness = await ctx.db.get(benefit.businessId);
    }

    if (partnerBusiness) {
      if (partnerBusiness.pin !== cleanPin) {
        throw new Error("El PIN de autorización del comercio es incorrecto.");
      }
    } else {
      // Find any business matching PIN or benefit's businessName
      const businessByName = await ctx.db
        .query("partnerBusinesses")
        .withIndex("by_name", (q) => q.eq("name", benefit.businessName))
        .first();

      if (businessByName && businessByName.pin !== cleanPin) {
        throw new Error("El PIN de autorización del comercio es incorrecto.");
      }
    }

    // 4. Prevent duplicate redemption
    const currentPeriod = getCurrentPeriod();

    if (benefit.frequency === "monthly") {
      const existing = await ctx.db
        .query("allyBenefitRedemptions")
        .withIndex("by_period", (q) => q.eq("period", currentPeriod))
        .filter((q) =>
          q.and(
            q.eq(q.field("allyId"), ally._id),
            q.eq(q.field("benefitId"), benefit._id),
          ),
        )
        .first();

      if (existing) {
        throw new Error(
          `Este beneficio ya fue canjeado en el periodo actual (${currentPeriod}).`,
        );
      }
    } else if (benefit.frequency === "once") {
      const existing = await ctx.db
        .query("allyBenefitRedemptions")
        .withIndex("by_allyId", (q) => q.eq("allyId", ally._id))
        .filter((q) => q.eq(q.field("benefitId"), benefit._id))
        .first();

      if (existing) {
        throw new Error(
          "Este beneficio es de uso único y ya fue canjeado previamente.",
        );
      }
    }

    // 5. Insert redemption
    const redeemedAt = new Date().toISOString();
    const businessName =
      partnerBusiness?.name || benefit.businessName || "Comercio Aliado";

    const redemptionId = await ctx.db.insert("allyBenefitRedemptions", {
      allyId: ally._id,
      allyCode: ally.code || cleanCode,
      allyName: ally.fullName,
      benefitId: benefit._id,
      benefitTitle: benefit.title,
      businessId: partnerBusiness?._id || benefit.businessId,
      businessName,
      period: currentPeriod,
      redeemedAt,
    });

    return {
      success: true,
      redemptionId,
      redeemedAt,
      businessName,
      benefitTitle: benefit.title,
    };
  },
});
