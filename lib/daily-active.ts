import { connectToDatabase } from "@/lib/mongodb";
import DailyActiveUser from "@/models/DailyActiveUser";
import User from "@/models/User";

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
    // Stamp presence: this is the single write that keeps `lastActiveAt` fresh,
    // which drives the "online" green dot in the feed/channels and the
    // Ringing-vs-Calling outgoing-call state. The mobile app pings this on cold
    // start, on every foreground, and on a periodic heartbeat (see app
    // _layout). The 5-minute online threshold lives with the readers.
    await User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date() } });
  } catch {
    // Non-fatal — DAU / presence tracking must never break the main request
  }
}
