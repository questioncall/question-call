import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSafeServerSession } from "@/lib/auth";
import { getPlatformConfig } from "@/models/PlatformConfig";

// Ensure cloudinary uses the CLOUDINARY_URL environment variable if set
// or it will fallback to process.env variables if individually specified.
cloudinary.config({
  secure: true,
});

type CloudinaryUploadResult = {
  secure_url: string;
  resource_type?: string;
  duration?: number;
  public_id?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSafeServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const declaredVideoDurationRaw = formData.get("videoDurationSeconds");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const config = await getPlatformConfig();
    const maxVideoDurationSeconds = config.maxVideoDurationMinutes * 60;
    const declaredVideoDurationSeconds =
      typeof declaredVideoDurationRaw === "string"
        ? Number(declaredVideoDurationRaw)
        : Number.NaN;

    if (
      file.type.startsWith("video/") &&
      Number.isFinite(declaredVideoDurationSeconds) &&
      declaredVideoDurationSeconds > maxVideoDurationSeconds
    ) {
      return NextResponse.json(
        { error: `Video must be ${config.maxVideoDurationMinutes} minutes or shorter.` },
        { status: 400 },
      );
    }

    // Check Cloudinary API Key setup
    if (!process.env.CLOUDINARY_URL && (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
      console.error("Cloudinary credentials missing from environment.");
      return NextResponse.json({ error: "Server misconfiguration: missing upload credentials" }, { status: 500 });
    }

    // Convert Next.js File to Buffer for Cloudinary Upload Stream
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Promise wrapper for the callback-based uploader
    const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: "eduask_messages",
          resource_type: "auto",
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Upload failed"));
          } else {
            resolve({
              secure_url: result.secure_url,
              resource_type: result.resource_type,
              duration: typeof result.duration === "number" ? result.duration : undefined,
              public_id: result.public_id,
            });
          }
        }
      );
      
      uploadStream.end(buffer);
    });

    if (
      uploadResult?.resource_type === "video" &&
      typeof uploadResult.duration === "number" &&
      uploadResult.duration > maxVideoDurationSeconds
    ) {
      if (uploadResult.public_id) {
        await cloudinary.uploader
          .destroy(uploadResult.public_id, {
            resource_type: "video",
            invalidate: true,
          })
          .catch((cleanupError) => {
            console.error("Failed to cleanup over-limit video upload:", cleanupError);
          });
      }

      return NextResponse.json(
        { error: `Video must be ${config.maxVideoDurationMinutes} minutes or shorter.` },
        { status: 400 },
      );
    }

    return NextResponse.json(uploadResult, { status: 200 });

  } catch (error: unknown) {
    console.error("Custom backend upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error during upload",
      },
      { status: 500 }
    );
  }
}
