/**
 * List all Mux assets and optionally delete them to free up the 10-asset free tier limit.
 * 
 * Usage:
 *   node scripts/cleanup-mux.mjs          # list all assets
 *   node scripts/cleanup-mux.mjs --delete  # delete ALL assets
 */

import Mux from "@mux/mux-node";
import "dotenv/config";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

const deleteMode = process.argv.includes("--delete");

async function main() {
  console.log("Fetching Mux assets...\n");

  const assets = [];
  let page = await mux.video.assets.list({ limit: 100 });
  for (const asset of page.data) {
    assets.push(asset);
  }

  console.log(`Found ${assets.length} asset(s):\n`);
  for (const a of assets) {
    console.log(
      `  ${a.id}  |  ${a.status}  |  ${new Date(Number(a.created_at) * 1000).toLocaleString()}  |  duration: ${Math.round(a.duration || 0)}s`
    );
  }

  if (!deleteMode) {
    console.log(
      "\nRun with --delete to remove all assets and free up your free tier.\n" +
      "  node scripts/cleanup-mux.mjs --delete\n"
    );
    return;
  }

  console.log(`\nDeleting ${assets.length} asset(s)...`);
  for (const a of assets) {
    try {
      await mux.video.assets.delete(a.id);
      console.log(`  ✓ Deleted ${a.id}`);
    } catch (err) {
      console.error(`  ✗ Failed to delete ${a.id}:`, err.message);
    }
  }

  // Also clean up any pending direct uploads
  console.log("\nCleaning up pending direct uploads...");
  try {
    const uploads = await mux.video.uploads.list({ limit: 100 });
    for (const u of uploads.data) {
      if (u.status !== "asset_created") {
        try {
          await mux.video.uploads.cancel(u.id);
          console.log(`  ✓ Cancelled upload ${u.id}`);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  console.log("\nDone! You should now be able to create new uploads.");
}

main().catch(console.error);
