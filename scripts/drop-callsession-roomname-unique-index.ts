import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import CallSession from "@/models/CallSession";

/**
 * One-shot migration: drop the legacy unique index `roomName_1` on
 * `callsessions`. The schema used to declare `roomName: { unique: true }`,
 * which prevented re-using the same LiveKit room across multiple call
 * sessions in the same channel. The unique constraint has since been
 * removed from the schema, but Mongoose never drops existing indexes —
 * this script does it explicitly and recreates a plain (non-unique)
 * index for query speed.
 *
 * Run with the env pointing at the database you want to fix:
 *   tsx scripts/drop-callsession-roomname-unique-index.ts
 */
async function run() {
  try {
    await connectToDatabase();
    // Touch the model so Mongoose registers it before we hit the collection.
    void CallSession;
    const collection = mongoose.connection.collection("callsessions");

    const indexes = await collection.indexes();
    const target = indexes.find((idx) => idx.name === "roomName_1");

    if (!target) {
      console.log("ℹ️  No index named 'roomName_1' found. Nothing to do.");
      return;
    }

    if (!target.unique) {
      console.log(
        "ℹ️  Index 'roomName_1' already exists as non-unique. Nothing to do.",
      );
      return;
    }

    console.log("🗑️  Dropping unique index 'roomName_1'…");
    await collection.dropIndex("roomName_1");
    console.log("✅ Dropped.");

    console.log("➕ Recreating 'roomName_1' as a non-unique index…");
    await collection.createIndex({ roomName: 1 }, { name: "roomName_1" });
    console.log("✅ Recreated.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

run();
