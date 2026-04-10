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
    const User = (await import("@/models/User")).default;
    const bcrypt = await import("bcryptjs");

    try {
      await connectToDatabase();
      const config = await getPlatformConfig();
      console.log(
        "[instrumentation] PlatformConfig seeded/loaded ✓",
        `(trialDays=${config.trialDays}, pointsPerText=${config.pointsPerTextAnswer})`
      );

      // Admin Seeding Logic
      const adminCount = await User.countDocuments({ role: "ADMIN" });
      if (adminCount === 0) {
        const defaultAdminPassword = "12345678@admin";
        const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);
        
        await User.create({
          name: "System Admin",
          email: "questionhub@gmail.com",
          passwordHash,
          role: "ADMIN",
        });
        
        console.log("[instrumentation] Default Admin account created successfully ✓ (questionhub@gmail.com)");
      } else {
        console.log(`[instrumentation] ${adminCount} Admin account(s) present ✓`);
      }
      
    } catch (error) {
      console.error("[instrumentation] Failed to run startup hooks:", error);
    }
  }
}
