import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSafeServerSession } from "@/lib/auth";

// Ensure cloudinary uses the CLOUDINARY_URL environment variable if set
// or it will fallback to process.env variables if individually specified.
cloudinary.config({
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSafeServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "eduask_avatars" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      uploadStream.end(buffer);
    });

    return NextResponse.json(uploadResult, { status: 200 });

  } catch (error: any) {
    console.error("Custom backend upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error during upload" },
      { status: 500 }
    );
  }
}
