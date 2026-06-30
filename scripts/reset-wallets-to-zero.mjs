#!/usr/bin/env node

import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: process.env.RESET_WALLET_ENV_FILE || ".env" });

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const now = new Date();
const nowIso = now.toISOString();
const uri = process.env.RESET_WALLET_MONGODB_URI || process.env.MONGODB_URI;

const WALLET_TRANSACTION_TYPES = [
  "CREDIT",
  "DEBIT",
  "WITHDRAWAL",
  "COURSE_SALE_CREDIT",
  "CHAPTER_SALE_CREDIT",
];

const RESET_NOTE =
  "Pre-production wallet reset. Not real wallet activity or payout.";

if (!uri) {
  console.error(
    "Missing MONGODB_URI. Set MONGODB_URI or RESET_WALLET_MONGODB_URI.",
  );
  process.exit(1);
}

function redactMongoUri(value) {
  try {
    const parsed = new URL(value);
    if (parsed.username) {
      parsed.username = "***";
    }
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return "<unparseable MongoDB URI>";
  }
}

async function getUserWalletSummary(db) {
  const [summary] = await db
    .collection("users")
    .aggregate([
      {
        $group: {
          _id: null,
          users: { $sum: 1 },
          points: { $sum: { $ifNull: ["$points", 0] } },
          pointBalance: { $sum: { $ifNull: ["$pointBalance", 0] } },
          totalPointsEarned: {
            $sum: { $ifNull: ["$totalPointsEarned", 0] },
          },
          totalPointsWithdrawn: {
            $sum: { $ifNull: ["$totalPointsWithdrawn", 0] },
          },
          totalPenaltyPoints: {
            $sum: { $ifNull: ["$totalPenaltyPoints", 0] },
          },
          usersWithWalletValue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $ne: [{ $ifNull: ["$points", 0] }, 0] },
                    { $ne: [{ $ifNull: ["$pointBalance", 0] }, 0] },
                    { $ne: [{ $ifNull: ["$totalPointsEarned", 0] }, 0] },
                    { $ne: [{ $ifNull: ["$totalPointsWithdrawn", 0] }, 0] },
                    { $ne: [{ $ifNull: ["$totalPenaltyPoints", 0] }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  return (
    summary ?? {
      users: 0,
      points: 0,
      pointBalance: 0,
      totalPointsEarned: 0,
      totalPointsWithdrawn: 0,
      totalPenaltyPoints: 0,
      usersWithWalletValue: 0,
    }
  );
}

async function getCollectionSummary(db, name, pipeline) {
  const exists = await db
    .listCollections({ name }, { nameOnly: true })
    .hasNext();

  if (!exists) {
    return [];
  }

  return db.collection(name).aggregate(pipeline).toArray();
}

async function printSummary(db, label) {
  const userSummary = await getUserWalletSummary(db);
  const withdrawalSummary = await getCollectionSummary(db, "withdrawalrequests", [
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        pointsRequested: { $sum: { $ifNull: ["$pointsRequested", 0] } },
        nprEquivalent: { $sum: { $ifNull: ["$nprEquivalent", 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const walletEventSummary = await getCollectionSummary(
    db,
    "wallethistoryevents",
    [
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          pointsDelta: { $sum: { $ifNull: ["$pointsDelta", 0] } },
        },
      },
    ],
  );
  const walletTransactionSummary = await getCollectionSummary(db, "transactions", [
    { $match: { type: { $in: WALLET_TRANSACTION_TYPES } } },
    {
      $group: {
        _id: { type: "$type", status: "$status" },
        count: { $sum: 1 },
        amount: { $sum: { $ifNull: ["$amount", 0] } },
      },
    },
    { $sort: { "_id.type": 1, "_id.status": 1 } },
  ]);

  console.log(`\n${label}`);
  console.table([userSummary]);
  console.log("withdrawalrequests");
  console.table(withdrawalSummary);
  console.log("wallethistoryevents");
  console.table(walletEventSummary);
  console.log("wallet-affecting transactions");
  console.table(walletTransactionSummary);
}

async function resetWallets(db) {
  const userResult = await db.collection("users").updateMany(
    {},
    {
      $set: {
        points: 0,
        pointBalance: 0,
        totalPointsEarned: 0,
        totalPointsWithdrawn: 0,
        totalPenaltyPoints: 0,
        dailyAnswersCount: 0,
        dailyTargetsAchieved: [],
        monthlyBonusClaimedAt: null,
      },
    },
  );

  const withdrawalResult = await db.collection("withdrawalrequests").updateMany(
    {},
    {
      $set: {
        status: "REJECTED",
        pointsReserved: false,
        processedAt: now,
        processedBy: null,
        transactionId: null,
        amountSent: null,
        adminNote: `${RESET_NOTE} Reset at ${nowIso}.`,
      },
    },
  );

  const walletEventResult = await db.collection("wallethistoryevents").updateMany(
    {},
    [
      {
        $set: {
          pointsDelta: 0,
          metadata: {
            preProductionWalletReset: true,
            resetAt: nowIso,
            resetNote: RESET_NOTE,
            originalType: "$type",
            originalPointsDelta: "$pointsDelta",
            originalMetadata: "$metadata",
          },
        },
      },
    ],
  );

  const transactionResult = await db.collection("transactions").updateMany(
    { type: { $in: WALLET_TRANSACTION_TYPES } },
    [
      {
        $set: {
          amount: 0,
          status: "FAILED",
          meta: {
            preProductionWalletReset: true,
            resetAt: nowIso,
            resetNote: RESET_NOTE,
            originalType: "$type",
            originalStatus: "$status",
            originalAmount: "$amount",
            originalMeta: "$meta",
            originalMetadata: "$metadata",
          },
          metadata: {
            preProductionWalletReset: true,
            resetAt: nowIso,
            resetNote: RESET_NOTE,
          },
        },
      },
    ],
  );

  return {
    usersMatched: userResult.matchedCount,
    usersModified: userResult.modifiedCount,
    withdrawalsMatched: withdrawalResult.matchedCount,
    withdrawalsModified: withdrawalResult.modifiedCount,
    walletEventsMatched: walletEventResult.matchedCount,
    walletEventsModified: walletEventResult.modifiedCount,
    transactionsMatched: transactionResult.matchedCount,
    transactionsModified: transactionResult.modifiedCount,
  };
}

async function main() {
  console.log("Wallet reset target:", redactMongoUri(uri));
  console.log("Mode:", execute ? "EXECUTE" : "DRY RUN");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    console.log("Database:", db.databaseName);

    await printSummary(db, "Before reset");

    if (!execute) {
      console.log("\nDry run only. Re-run with --execute to apply the reset.");
      return;
    }

    const result = await resetWallets(db);
    console.log("\nReset result");
    console.table([result]);

    await printSummary(db, "After reset");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Wallet reset failed:", error);
  process.exit(1);
});
