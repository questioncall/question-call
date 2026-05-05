import { connectToDatabase } from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";

/**
 * Migration: Add platform field to existing PushSubscription documents
 * Sets all existing records to "web" as default
 */
async function migratePushSubscriptionsPlatform() {
  try {
    await connectToDatabase();

    const result = await PushSubscriptionModel.updateMany(
      { platform: { $exists: false } },
      { $set: { platform: "web" } },
    );

    console.log(
      `✅ Migration complete: ${result.modifiedCount} push subscriptions updated`,
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migratePushSubscriptionsPlatform();
