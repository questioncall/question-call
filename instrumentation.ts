/**
 * Next.js Instrumentation Hook
 * 
 * This file runs ONCE when the Next.js server starts up.
 * We use it to ensure the PlatformConfig is seeded into the
 * database on first boot — before any user request comes in.
 */

export async function register() {
  // Only run on the Node.js server runtime, not on Edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { connectToDatabase } = await import("@/lib/mongodb");
    const { getPlatformConfig } = await import("@/models/PlatformConfig");

    try {
      await connectToDatabase();
      const config = await getPlatformConfig();
      console.log(
        "[instrumentation] PlatformConfig seeded/loaded ✓",
        `(trialDays=${config.trialDays}, pointsPerText=${config.pointsPerTextAnswer})`
      );
    } catch (error) {
      console.error("[instrumentation] Failed to seed PlatformConfig:", error);
    }
  }
}
