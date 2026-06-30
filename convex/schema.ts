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
});
