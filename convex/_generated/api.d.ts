/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actorSchedules from "../actorSchedules.js";
import type * as actors from "../actors.js";
import type * as analytics from "../analytics.js";
import type * as clients from "../clients.js";
import type * as deals from "../deals.js";
import type * as employees from "../employees.js";
import type * as equipment from "../equipment.js";
import type * as events from "../events.js";
import type * as scripts from "../scripts.js";
import type * as seed from "../seed.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actorSchedules: typeof actorSchedules;
  actors: typeof actors;
  analytics: typeof analytics;
  clients: typeof clients;
  deals: typeof deals;
  employees: typeof employees;
  equipment: typeof equipment;
  events: typeof events;
  scripts: typeof scripts;
  seed: typeof seed;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
