import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  employees: defineTable({
    name: v.string(),
    role: v.string(),
    phone: v.string(),
    email: v.string(),
    salary: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    episodeCount: v.number(),
    avatarInitials: v.string(),
    birthDate: v.optional(v.string()),
  }),
  castingLeads: defineTable({
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
  }),
  transactions: defineTable({
    concept: v.string(),
    amount: v.number(),
    date: v.string(), // ISO format YYYY-MM-DD
    category: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("cancelled"),
    ),
    local: v.optional(v.string()),
    clientId: v.optional(v.string()),
  }),
  clients: defineTable({
    name: v.string(),
    company: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.optional(v.union(v.literal("activo"), v.literal("potencial"))),
    lastInteraction: v.optional(v.string()), // ISO format
    projectCount: v.optional(v.number()),
    notes: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  }),
  clientServices: defineTable({
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
  }).index("by_clientId", ["clientId"]),
  clientPayments: defineTable({
    clientId: v.id("clients"),
    serviceId: v.optional(v.id("clientServices")),
    transactionId: v.optional(v.id("transactions")),
    amount: v.number(),
    date: v.string(),
    concept: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending")),
  })
    .index("by_clientId", ["clientId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_transactionId", ["transactionId"]),
  equipment: defineTable({
    name: v.string(),
    serialNumber: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("in-use"),
        v.literal("maintenance"),
      ),
    ),
    location: v.optional(v.string()),
    acquisitionDate: v.optional(v.string()),
  }),
  deals: defineTable({
    title: v.string(),
    client: v.string(),
    value: v.number(),
    currency: v.optional(v.string()),
    stage: v.union(
      v.literal("lead"),
      v.literal("proposal"),
      v.literal("negotiation"),
      v.literal("won"),
      v.literal("lost"),
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdAt: v.string(),
    expectedClose: v.string(),
    description: v.string(),
    contactEmail: v.string(),
  }),
  events: defineTable({
    title: v.string(),
    date: v.string(), // YYYY-MM-DD
    time: v.string(), // HH:mm
    type: v.union(
      v.literal("shooting"),
      v.literal("pre-production"),
      v.literal("post-production"),
      v.literal("meeting"),
      v.literal("delivery"),
    ),
    description: v.string(),
    status: v.union(
      v.literal("upcoming"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  }),
  analyticsStats: defineTable({
    platform: v.union(
      v.literal("all"),
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("facebook"),
    ),
    followers: v.number(),
    followersGrowth: v.string(),
    views: v.number(),
    viewsGrowth: v.string(),
    engagement: v.string(),
    engagementGrowth: v.string(),
    shares: v.number(),
    sharesGrowth: v.string(),
    watchTime: v.string(),
    avgRetention: v.string(),
    monthlyViews: v.optional(
      v.array(
        v.object({
          month: v.string(),
          views: v.number(),
        }),
      ),
    ),
    demographics: v.optional(
      v.object({
        age: v.array(v.object({ label: v.string(), value: v.number() })),
        location: v.array(v.object({ label: v.string(), value: v.number() })),
        gender: v.array(
          v.object({ label: v.string(), value: v.number(), color: v.string() }),
        ),
      }),
    ),
    retentionCurve: v.optional(
      v.array(
        v.object({
          ratio: v.number(),
          retention: v.number(),
        }),
      ),
    ),
    insights: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          type: v.union(
            v.literal("warning"),
            v.literal("tip"),
            v.literal("info"),
          ),
        }),
      ),
    ),
  }),
  topContent: defineTable({
    id: v.optional(v.string()),
    title: v.string(),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("facebook"),
    ),
    views: v.number(),
    likes: v.number(),
    watchTime: v.string(),
    retention: v.string(),
    duration: v.string(),
    date: v.string(),
    thumbnailUrl: v.optional(v.string()),
  }),
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
  }).index("by_email", ["email"]),
  scripts: defineTable({
    title: v.string(),
    episodeOrProject: v.string(),
    version: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("approved"),
    ),
    fileUrl: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.string(),
    fileType: v.string(),
    uploadedAt: v.string(),
    uploadedBy: v.string(),
    shareId: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
  }).index("by_shareId", ["shareId"]),
  scriptComments: defineTable({
    scriptId: v.string(),
    shareId: v.string(),
    authorName: v.string(),
    comment: v.string(),
    createdAt: v.string(),
  })
    .index("by_shareId", ["shareId"])
    .index("by_scriptId", ["scriptId"]),
  actors: defineTable({
    name: v.string(),
    characterName: v.string(),
    characterBio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    phone: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    episodeCount: v.number(),
    shareToken: v.optional(v.string()),
    birthDate: v.optional(v.string()),
  }).index("by_shareToken", ["shareToken"]),
  actorSchedules: defineTable({
    title: v.string(),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:mm
    endTime: v.string(), // HH:mm
    callTime: v.string(), // HH:mm (hora de llamado)
    location: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.string(),
    characterName: v.string(),
    sceneDetails: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("filmed"),
      v.literal("rescheduled"),
      v.literal("cancelled"),
    ),
    shareToken: v.optional(v.string()),
  })
    .index("by_actorName", ["actorName"])
    .index("by_shareToken", ["shareToken"]),
  clientCredentials: defineTable({
    clientId: v.id("clients"),
    platform: v.string(), // "instagram", "facebook", "tiktok", "youtube", "linkedin", "meta_business", "otro"
    username: v.string(),
    password: v.string(),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("needs_relogin"),
        v.literal("inactive"),
      ),
    ),
    updatedAt: v.optional(v.string()),
  }).index("by_clientId", ["clientId"]),
  socialMediaPosts: defineTable({
    clientId: v.id("clients"),
    title: v.string(),
    platform: v.union(
      v.literal("todas"),
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("tiktok"),
      v.literal("youtube"),
      v.literal("linkedin"),
      v.literal("otro"),
    ),
    contentType: v.union(
      v.literal("reel"),
      v.literal("carousel"),
      v.literal("image"),
      v.literal("story"),
      v.literal("video"),
      v.literal("post"),
    ),
    scheduledDate: v.string(), // YYYY-MM-DD
    scheduledTime: v.optional(v.string()), // HH:mm
    status: v.union(
      v.literal("planificado"),
      v.literal("en_proceso"),
      v.literal("publicado"),
      v.literal("cancelado"),
    ),
    postUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    notes: v.optional(v.string()),
    views: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
  }).index("by_clientId", ["clientId"]),
  socialMediaGoals: defineTable({
    clientId: v.id("clients"),
    month: v.string(), // YYYY-MM
    targetPosts: v.number(),
    targetReels: v.optional(v.number()),
    targetStories: v.optional(v.number()),
    targetCarousels: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_clientId", ["clientId"]),
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("baja"), v.literal("media"), v.literal("alta")),
    ),
    status: v.union(v.literal("pendiente"), v.literal("realizada")),
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    createdByName: v.optional(v.string()),
  })
    .index("by_assignedTo", ["assignedTo"])
    .index("by_createdBy", ["createdBy"]),
  brainstormBoards: defineTable({
    title: v.string(),
    clientId: v.optional(v.id("clients")),
    coverUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_clientId", ["clientId"]),
  brainstormItems: defineTable({
    boardId: v.id("brainstormBoards"),
    type: v.union(
      v.literal("note"),
      v.literal("image"),
      v.literal("color"),
      v.literal("checklist"),
      v.literal("link"),
    ),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    url: v.optional(v.string()),
    checklist: v.optional(
      v.array(
        v.object({
          text: v.string(),
          done: v.boolean(),
        }),
      ),
    ),
    createdAt: v.string(),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
  }).index("by_boardId", ["boardId"]),
  allies: defineTable({
    fullName: v.string(),
    idCard: v.string(),
    phone: v.string(),
    email: v.string(),
    whatsappOptIn: v.boolean(),
    package: v.union(v.literal("elite"), v.literal("vip")),
    packageAmount: v.number(),
    status: v.optional(
      v.union(
        v.literal("pagado"),
        v.literal("no_pagado"),
        v.literal("pendiente"),
        v.literal("activo"),
        v.literal("inactivo"),
      ),
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("pagado"),
        v.literal("no_pagado"),
        v.literal("pendiente"),
        v.literal("cancelado"),
      ),
    ),
    notes: v.optional(v.string()),
    code: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_code", ["code"]),
  allyTokens: defineTable({
    token: v.string(),
    used: v.boolean(),
    createdAt: v.string(),
    usedAt: v.optional(v.string()),
    usedByAllyId: v.optional(v.id("allies")),
    package: v.optional(v.union(v.literal("elite"), v.literal("vip"))),
  })
    .index("by_token", ["token"])
    .index("by_used", ["used"]),
  potentialCollaborators: defineTable({
    name: v.string(),
    area: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("por_contactar"),
        v.literal("en_conversacion"),
        v.literal("confirmado"),
        v.literal("descartado"),
      ),
    ),
    photoUrl: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  }),
  partnerBusinesses: defineTable({
    name: v.string(),
    pin: v.string(),
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("activo"), v.literal("inactivo"))),
    createdAt: v.string(),
  }).index("by_name", ["name"]),
  allyBenefits: defineTable({
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
    createdAt: v.string(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_active", ["active"]),
  allyBenefitRedemptions: defineTable({
    allyId: v.id("allies"),
    allyCode: v.string(),
    allyName: v.string(),
    benefitId: v.id("allyBenefits"),
    benefitTitle: v.string(),
    businessId: v.optional(v.id("partnerBusinesses")),
    businessName: v.string(),
    period: v.string(), // e.g. "2026-08"
    redeemedAt: v.string(),
  })
    .index("by_allyId", ["allyId"])
    .index("by_benefitId", ["benefitId"])
    .index("by_period", ["period"])
    .index("by_redeemedAt", ["redeemedAt"]),
});
