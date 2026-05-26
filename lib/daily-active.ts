import { connectToDatabase } from "@/lib/mongodb";
import DailyActiveUser from "@/models/DailyActiveUser";

export async function recordDailyActiveUser(
  userId: string,
  platform: "web" | "app",
): Promise<void> {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
  try {
    await connectToDatabase();
    await DailyActiveUser.updateOne(
      { userId, date, platform },
      { $setOnInsert: { userId, date, platform } },
      { upsert: true },
    );
  } catch {
    // Non-fatal — DAU tracking must never break the main request
  }
}
