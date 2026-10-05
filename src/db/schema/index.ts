/**
 * Drizzle schema entry point (docs/05). Everything exported here is managed
 * by drizzle-kit migrations, including the `kesa_app` role and RLS policies.
 */
export { kesaApp } from "./_common";
export * from "./enums";
export * from "./catalog";
export * from "./inventory";
export * from "./customers";
export * from "./commerce";
export * from "./engagement";
export * from "./content";
export * from "./system";
