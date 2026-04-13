import Mux from "@mux/mux-node";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

async function run() {
  try {
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
      },
    });

    console.log("Upload URL:", upload.url);
    console.log("Upload ID:", upload.id);

    // Create a dummy video file using fs
    fs.writeFileSync("dummy.mp4", "fake video content");

    console.log("Uploading via fetch...");
    const res = await fetch(upload.url, {
      method: "PUT",
      body: fs.readFileSync("dummy.mp4"),
    });

    console.log("PUT status:", res.status);

    // Poll Mux for a few seconds
    for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const check = await mux.video.uploads.retrieve(upload.id);
        console.log(`Status after ${i*2}s:`, check.status, check.asset_id ? `(Asset: ${check.asset_id})` : "");
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
