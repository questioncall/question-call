import { connectToDatabase } from "@/lib/mongodb";
import { LEGAL } from "@/lib/config";
import PlatformConfig, {
  getPlatformConfig,
  clearPlatformConfigCache,
} from "@/models/PlatformConfig";

/**
 * Migration: refresh the live legal content stored in PlatformConfig.
 *
 * The Terms of Use / Privacy Policy shown on the web (`/legal`) and in the
 * mobile app (`/api/legal` -> LegalScreen) are read from the PlatformConfig
 * document in the database, NOT from lib/config.ts at request time. The
 * defaults in lib/config.ts are only used to SEED a fresh database.
 *
 * Because a PlatformConfig document already exists in this database, it still
 * holds the OLD seeded text. This script overwrites the two legal fields with
 * the current LEGAL defaults so web + app immediately reflect the new content
 * (IP-infringement clause + third-party/SDK disclosure + account deletion).
 *
 * Run:  npm run migrate:legal   (from web/)
 */
async function updateLegalContent() {
  try {
    await connectToDatabase();

    const config = await getPlatformConfig();

    const updated = await PlatformConfig.findByIdAndUpdate(
      config._id,
      {
        $set: {
          termsOfUseContent: LEGAL.TERMS_OF_USE,
          privacyPolicyContent: LEGAL.PRIVACY_POLICY,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new Error("PlatformConfig document not found / not updated");
    }

    // Clear this process's cache. A running server refreshes its own cache
    // within the 5-minute TTL (or on next deploy/restart).
    clearPlatformConfigCache();

    console.log("✅ Legal content updated in PlatformConfig.");
    console.log(`   Terms of Use:   ${LEGAL.TERMS_OF_USE.length} chars`);
    console.log(`   Privacy Policy: ${LEGAL.PRIVACY_POLICY.length} chars`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Legal content migration failed:", error);
    process.exit(1);
  }
}

updateLegalContent();
