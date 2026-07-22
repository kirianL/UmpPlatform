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
  }),
  transactions: defineTable({
    concept: v.string(),
    amount: v.number(),
    date: v.string(), // ISO format YYYY-MM-DD
    category: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("cancelled")),
    local: v.optional(v.string()),
  }),
  clients: defineTable({
    name: v.string(),
    company: v.string(),
    phone: v.string(),
    email: v.string(),
    lastInteraction: v.string(), // ISO format
    projectCount: v.number(),
  }),
  equipment: defineTable({
    name: v.string(),
    serialNumber: v.string(),
    category: v.string(),
    status: v.union(v.literal("available"), v.literal("in-use"), v.literal("maintenance")),
    location: v.string(),
    acquisitionDate: v.string(), // ISO format
  }),
  deals: defineTable({
    title: v.string(),
    client: v.string(),
    value: v.number(),
    currency: v.optional(v.string()),
    stage: v.union(v.literal("lead"), v.literal("proposal"), v.literal("negotiation"), v.literal("won"), v.literal("lost")),
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
    type: v.union(v.literal("shooting"), v.literal("pre-production"), v.literal("post-production"), v.literal("meeting"), v.literal("delivery")),
    description: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("completed"), v.literal("cancelled")),
  }),
  analyticsStats: defineTable({
    platform: v.union(v.literal("all"), v.literal("youtube"), v.literal("instagram"), v.literal("tiktok"), v.literal("facebook")),
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
    monthlyViews: v.optional(v.array(v.object({
      month: v.string(),
      views: v.number(),
    }))),
    demographics: v.optional(v.object({
      age: v.array(v.object({ label: v.string(), value: v.number() })),
      location: v.array(v.object({ label: v.string(), value: v.number() })),
      gender: v.array(v.object({ label: v.string(), value: v.number(), color: v.string() })),
    })),
    retentionCurve: v.optional(v.array(v.object({
      ratio: v.number(),
      retention: v.number(),
    }))),
    insights: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
      type: v.union(v.literal("warning"), v.literal("tip"), v.literal("info")),
    }))),
  }),
  topContent: defineTable({
    id: v.optional(v.string()),
    title: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("tiktok"), v.literal("facebook")),
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
      v.literal("approved")
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
  }).index("by_shareId", ["shareId"]).index("by_scriptId", ["scriptId"]),
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
      v.literal("cancelled")
    ),
    shareToken: v.optional(v.string()),
  }).index("by_actorName", ["actorName"]).index("by_shareToken", ["shareToken"]),
});
