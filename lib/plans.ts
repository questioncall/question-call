/**
 * Re-export everything from lib/config.ts
 *
 * This file previously held plan definitions directly.
 * They now live in lib/config.ts (single source of truth).
 * All existing imports like `import { SUBSCRIPTION_PLANS } from "@/lib/plans"`
 * continue to work without changes.
 */
export { SUBSCRIPTION_PLANS } from "@/lib/config";
export type { PlanDef } from "@/lib/config";
