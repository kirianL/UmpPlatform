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
import type * as allies from "../allies.js";
import type * as analytics from "../analytics.js";
import type * as benefits from "../benefits.js";
import type * as brainstorm from "../brainstorm.js";
import type * as castingLeads from "../castingLeads.js";
import type * as clientCredentials from "../clientCredentials.js";
import type * as clientPayments from "../clientPayments.js";
import type * as clientServices from "../clientServices.js";
import type * as clients from "../clients.js";
import type * as deals from "../deals.js";
import type * as employees from "../employees.js";
import type * as equipment from "../equipment.js";
import type * as events from "../events.js";
import type * as potentialCollaborators from "../potentialCollaborators.js";
import type * as potentialContacts from "../potentialContacts.js";
import type * as scripts from "../scripts.js";
import type * as seed from "../seed.js";
import type * as socialMediaGoals from "../socialMediaGoals.js";
import type * as socialMediaPosts from "../socialMediaPosts.js";
import type * as tasks from "../tasks.js";
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
  allies: typeof allies;
  analytics: typeof analytics;
  benefits: typeof benefits;
  brainstorm: typeof brainstorm;
  castingLeads: typeof castingLeads;
  clientCredentials: typeof clientCredentials;
  clientPayments: typeof clientPayments;
  clientServices: typeof clientServices;
  clients: typeof clients;
  deals: typeof deals;
  employees: typeof employees;
  equipment: typeof equipment;
  events: typeof events;
  potentialCollaborators: typeof potentialCollaborators;
  potentialContacts: typeof potentialContacts;
  scripts: typeof scripts;
  seed: typeof seed;
  socialMediaGoals: typeof socialMediaGoals;
  socialMediaPosts: typeof socialMediaPosts;
  tasks: typeof tasks;
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
