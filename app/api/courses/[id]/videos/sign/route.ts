import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";

cloudinary.config({
  secure: true,
});

const COURSE_VIDEO_UPLOAD_CHUNK_SIZE = 20 * 1024 * 1024;
const COURSE_VIDEO_UPLOAD_FOLDER = "question_hub_courses";

function getCloudinaryCredentials() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  let apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  let apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if ((!cloudName || !apiKey || !apiSecret) && process.env.CLOUDINARY_URL) {
    const parsed = new URL(process.env.CLOUDINARY_URL);
    cloudName ||= parsed.hostname;
    apiKey ||= decodeURIComponent(parsed.username);
    apiSecret ||= decodeURIComponent(parsed.password);
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Server misconfiguration: missing Cloudinary credentials.");
  }

  return { apiKey, apiSecret, cloudName };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only teachers or admins can upload videos." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    const course = await Course.findById(id).select("_id instructorId");
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (
      session.user.role !== "ADMIN" &&
      course.instructorId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      paramsToSign?: Record<string, string | number | boolean | null | undefined>;
    };

    const { apiKey, apiSecret, cloudName } = getCloudinaryCredentials();

    if (body.paramsToSign && Object.keys(body.paramsToSign).length > 0) {
      const paramsToSign = Object.fromEntries(
        Object.entries(body.paramsToSign).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        ),
      );

      const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

      return NextResponse.json({
        signature,
      });
    }

    return NextResponse.json({
      apiKey,
      chunkSize: COURSE_VIDEO_UPLOAD_CHUNK_SIZE,
      cloudName,
      folder: COURSE_VIDEO_UPLOAD_FOLDER,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    });
  } catch (error) {
    console.error("[POST /api/courses/:id/videos/sign]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare course video upload.",
      },
      { status: 500 },
    );
  }
}
