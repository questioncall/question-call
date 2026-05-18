import { NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { generateReceiptPdf } from "@/lib/generate-receipt-pdf";

/**
 * GET /api/admin/receipts/preview
 *   ?type=subscription&planSlug=pro&amount=999&validDays=90
 *   ?type=course&courseName=Photoshop+Masterclass&amount=1499
 *   ?gateway=esewa|manual
 *
 * Returns a sample PDF receipt so admins can see exactly what users will get.
 */
export async function GET(req: Request) {
  const session = await getSafeServerSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
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
    const validUntil = new Date(
      now.getTime() + validDays * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
