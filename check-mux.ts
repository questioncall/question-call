import Mux from "@mux/mux-node";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

async function run() {
  const uploadId = "AqSplI301erDPkXeXg9KgnRcd5MZLhMaMThhDRlqvPPo";
  console.log("Fetching Upload ID:", uploadId);
  try {
    const upload = await mux.video.uploads.retrieve(uploadId);
    console.log("UPLOAD STATUS:", upload.status);
    console.log("UPLOAD ASSET ID:", upload.asset_id);
    
    if (upload.asset_id) {
        console.log("Fetching Asset ID:", upload.asset_id);
        const asset = await mux.video.assets.retrieve(upload.asset_id);
        console.log("ASSET STATUS:", asset.status);
    }
  } catch (error) {
    console.error("ERROR:", error);
  }
}

run();
