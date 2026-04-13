import mongoose from "mongoose";
import dotenv from "dotenv";
import CourseVideo from "./models/CourseVideo";
import { connectToDatabase } from "./lib/mongodb";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
  await connectToDatabase();
  const videos = await CourseVideo.find().sort({ uploadedAt: -1 }).limit(10);
  console.log(JSON.stringify(videos, null, 2));
  process.exit(0);
}

run().catch(console.error);
