import mongoose from "mongoose";

const SOURCE_URI = "mongodb+srv://siddthecoder:CALFA4AC5DA%23MONGODB@base.rnyakdb.mongodb.net/listeners?retryWrites=true&w=majority";
const TARGET_URI = "mongodb+srv://questionhub86_db_user:86hubquestion@cluster0.24srppy.mongodb.net/questionhub?retryWrites=true&w=majority";

interface CollectionConfig {
  name: string;
  skip?: boolean;
}

const COLLECTIONS: CollectionConfig[] = [
  { name: "users" },
  { name: "questions" },
  { name: "channels" },
  { name: "messages" },
  { name: "answers" },
  { name: "transactions" },
  { name: "withdrawalrequests" },
  { name: "notifications" },
  { name: "quiztopics" },
  { name: "quizquestions" },
  { name: "quizsessions" },
  { name: "courses" },
  { name: "coursesections" },
  { name: "coursevideos" },
  { name: "liveSessions" },
  { name: "courseenrollments" },
  { name: "videoprogress" },
  { name: "couponcodes" },
  { name: "couponredemptions" },
  { name: "platformconfigs" },
  { name: "verificationtokens" },
  { name: "quizgenerationlogs" },
  { name: "aiproviderconfigs" },
];

async function migrate() {
  console.log("🔄 Connecting to source database...");
  const sourceClient = await mongoose.createConnection(SOURCE_URI, {
    maxPoolSize: 10,
  }).asPromise();
  console.log("✅ Connected to source");

  console.log("🔄 Connecting to target database...");
  const targetClient = await mongoose.createConnection(TARGET_URI, {
    maxPoolSize: 10,
  }).asPromise();
  console.log("✅ Connected to target\n");

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const collection of COLLECTIONS) {
    if (collection.skip) {
      console.log(`⏭️  Skipping: ${collection.name}`);
      totalSkipped++;
      continue;
    }

    try {
      const sourceDb = sourceClient.db;
      const targetDb = targetClient.db;

      const sourceCollection = sourceDb.collection(collection.name);
      const targetCollection = targetDb.collection(collection.name);

      const count = await sourceCollection.countDocuments();
      if (count === 0) {
        console.log(`⚠️  Empty: ${collection.name} (0 documents)`);
        continue;
      }

      console.log(`📦 Migrating: ${collection.name} (${count} documents)...`);

      const cursor = sourceCollection.find({});
      let batch: mongoose.AnyObject[] = [];
      const BATCH_SIZE = 100;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
          try {
            await targetCollection.insertMany(batch, { ordered: false });
          } catch (insertErr: any) {
            if (insertErr.code === 11000) {
              console.log(`  ⚠️  ${batch.length} duplicates skipped`);
            } else {
              throw insertErr;
            }
          }
          batch = [];
        }
      }

      if (batch.length > 0) {
        try {
          await targetCollection.insertMany(batch, { ordered: false });
        } catch (insertErr: any) {
          if (insertErr.code === 11000) {
            console.log(`  ⚠️  ${batch.length} duplicates skipped`);
          } else {
            throw insertErr;
          }
        }
      }

      console.log(`✅ Done: ${collection.name}`);
      totalMigrated++;
    } catch (err: any) {
      console.error(`❌ Failed: ${collection.name} - ${err.message}`);
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Migrated: ${totalMigrated} collections`);
  console.log(`   Skipped: ${totalSkipped} collections`);

  await sourceClient.close();
  await targetClient.close();

  console.log("\n✨ Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});