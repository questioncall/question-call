import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary } from "cloudinary";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pusherServer } from "@/lib/pusher/pusherServer";
import { ADMIN_UPDATES_CHANNEL, CONFIG_UPDATED_EVENT } from "@/lib/pusher/events";
import PlatformConfig, {
  clearPlatformConfigCache,
  getManualPaymentDetails,
  getPlatformConfig,
} from "@/models/PlatformConfig";

cloudinary.config({
  secure: true,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const recipientName = String(formData.get("recipientName") || "").trim();
    const esewaNumber = String(formData.get("esewaNumber") || "").trim();
    const qrCode = formData.get("qrCode");

    if (!recipientName) {
      return NextResponse.json(
        { error: "Recipient name is required" },
        { status: 400 },
      );
    }

    if (!esewaNumber) {
      return NextResponse.json(
        { error: "eSewa number is required" },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const config = await getPlatformConfig();
    const currentManualPayment = getManualPaymentDetails(config);

    let manualPaymentQrCodeUrl = currentManualPayment.qrCodeUrl;

    if (qrCode instanceof File && qrCode.size > 0) {
      if (
        !process.env.CLOUDINARY_URL &&
        (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)
      ) {
        return NextResponse.json(
          { error: "Server missing Cloudinary credentials." },
          { status: 500 },
        );
      }

      if (!qrCode.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "QR code must be an image file" },
          { status: 400 },
        );
      }

      const bytes = await qrCode.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "eduask/platform-config",
            public_id: `manual-payment-qr-${config._id.toString()}`,
            overwrite: true,
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error("QR upload failed"));
              return;
            }

            resolve({ secure_url: result.secure_url });
          },
        );

        uploadStream.end(buffer);
      });

      manualPaymentQrCodeUrl = uploadResult.secure_url;
    }

    const updatedConfig = await PlatformConfig.findByIdAndUpdate(
      config._id,
      {
        $set: {
          manualPaymentRecipientName: recipientName,
          manualPaymentEsewaNumber: esewaNumber,
          manualPaymentQrCodeUrl,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedConfig) {
      return NextResponse.json(
        { error: "Failed to update manual payment configuration" },
        { status: 500 },
      );
    }

    clearPlatformConfigCache();

    if (pusherServer) {
      await pusherServer
        .trigger(ADMIN_UPDATES_CHANNEL, CONFIG_UPDATED_EVENT, { updated: true })
        .catch(console.error);
    }

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("[POST /api/admin/config/manual-payment]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
