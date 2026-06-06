import { NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/mobile-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { generateReceiptPdf } from "@/lib/generate-receipt-pdf";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/receipts/preview?token=<accessToken>&type=...&...
 *
 * Mobile twin of `GET /api/admin/receipts/preview`. The mobile app opens this
 * in the device browser to preview the receipt PDF, and a browser can't send a
 * bearer header — so the short-lived mobile access token is passed as a query
 * param and verified here (plus a DB admin re-check, mirroring requireMobileAdmin).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const token = searchParams.get("token") || "";
  const payload = verifyAccessToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const user = (await User.findById(payload.userId)
    .select("role isSuspended")
    .lean()) as { role?: string; isSuspended?: boolean } | null;
  if (!user || user.isSuspended || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = searchParams.get("type") === "course" ? "course" : "subscription";
  const gateway = searchParams.get("gateway") === "manual" ? "manual" : "esewa";
  const amount = searchParams.get("amount") ?? (type === "course" ? "1499" : "999");
  const userEmail = searchParams.get("email") ?? "user@example.com";

  const now = new Date();
  const issuedAt = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const paymentMethod = gateway === "manual" ? "Manual (eSewa)" : "eSewa";

  const common = {
    transactionId: "TXN-SAMPLE-0001",
    amount: `NPR ${amount}`,
    paymentMethod,
    issuedTo: userEmail,
    issuedAt,
    note: null,
  };

  let pdf: Buffer;
  if (type === "course") {
    const courseName = searchParams.get("courseName") ?? "Photoshop Masterclass";
    pdf = await generateReceiptPdf({
      ...common,
      itemLabel: "Course",
      itemName: courseName,
      validUntil: null,
    });
  } else {
    const planSlug = searchParams.get("planSlug") ?? "pro";
    const validDays = Number(searchParams.get("validDays") ?? "30");
    const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );
    pdf = await generateReceiptPdf({
      ...common,
      itemLabel: "Plan",
      itemName: planSlug.toUpperCase(),
      validUntil,
    });
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-preview-${type}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
