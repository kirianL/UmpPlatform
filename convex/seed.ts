import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Ensure actual system users exist with correct roles
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@ultimate.cr"))
      .first();
    if (adminUser) {
      await ctx.db.patch(adminUser._id, {
        name: "Administrador UMP",
        passwordHash:
          "5284374ea2c89a14d071994d8e84bc4ec7a4c9e5abcbea27d86cb130550510cf",
        role: "admin",
      });
    } else {
      await ctx.db.insert("users", {
        email: "admin@ultimate.cr",
        name: "Administrador UMP",
        passwordHash:
          "5284374ea2c89a14d071994d8e84bc4ec7a4c9e5abcbea27d86cb130550510cf",
        role: "admin",
      });
    }

    const prodUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "produccion@ultimate.cr"))
      .first();
    if (prodUser) {
      await ctx.db.patch(prodUser._id, {
        name: "Producción UMP",
        passwordHash:
          "f22ff8824c832bf9a32853e3b51d8a6ddc4b02042716dd41d085dcc1173952ac",
        role: "produccion",
      });
    } else {
      await ctx.db.insert("users", {
        email: "produccion@ultimate.cr",
        name: "Producción UMP",
        passwordHash:
          "f22ff8824c832bf9a32853e3b51d8a6ddc4b02042716dd41d085dcc1173952ac",
        role: "produccion",
      });
    }

    const eymarUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "eymar@ultimate.cr"))
      .first();
    if (eymarUser) {
      await ctx.db.patch(eymarUser._id, {
        name: "Eymar",
        passwordHash:
          "703f07d7bb546836ef8f7beb4109453f6ce51123ac2f3cb8ba48f0f1c664b1d0",
        role: "produccion",
      });
    } else {
      await ctx.db.insert("users", {
        email: "eymar@ultimate.cr",
        name: "Eymar",
        passwordHash:
          "703f07d7bb546836ef8f7beb4109453f6ce51123ac2f3cb8ba48f0f1c664b1d0",
        role: "produccion",
      });
    }

    const michelleUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "michelle@ultimate.cr"))
      .first();
    if (michelleUser) {
      await ctx.db.patch(michelleUser._id, {
        name: "Michelle",
        passwordHash:
          "bc5ae01d02bf4bd1f8d0ef68d82c516fc9d0f82f312895f3315a59fffdb57c78",
        role: "directorio",
      });
    } else {
      await ctx.db.insert("users", {
        email: "michelle@ultimate.cr",
        name: "Michelle",
        passwordHash:
          "bc5ae01d02bf4bd1f8d0ef68d82c516fc9d0f82f312895f3315a59fffdb57c78",
        role: "directorio",
      });
    }

    const tatianaUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "tatiana@ultimate.cr"))
      .first();
    if (tatianaUser) {
      await ctx.db.patch(tatianaUser._id, {
        name: "Tatiana",
        passwordHash:
          "6c7defe0363fddc241d568e30fef1468ac05e5bcb74edc0d3e6e4593f0c8265b",
        role: "actores",
      });
    } else {
      await ctx.db.insert("users", {
        email: "tatiana@ultimate.cr",
        name: "Tatiana",
        passwordHash:
          "6c7defe0363fddc241d568e30fef1468ac05e5bcb74edc0d3e6e4593f0c8265b",
        role: "actores",
      });
    }

    return "Users synced successfully";
  },
});
