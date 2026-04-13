import { NextRequest, NextResponse } from "next/server";

import {
  completeCoursePurchase,
  getCoursePurchaseMetadata,
} from "@/lib/course-purchases";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { generateEsewaSignature } from "@/lib/payment/esewa";
import Transaction from "@/models/Transaction";

interface EsewaResponseData {
  transaction_code: string;
  status: string;
  total_amount: string | number;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

interface EsewaStatusResponse {
  product_code: string;
  transaction_uuid: string;
  total_amount: number;
  status:
    | "COMPLETE"
    | "PENDING"
    | "FULL_REFUND"
    | "NOT_FOUND"
    | "AMBIGUOUS"
    | "CANCELED";
  ref_id: string | null;
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const session = await getSafeServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { encodedData } = (await req.json()) as { encodedData?: string };
  if (!encodedData) {
    return NextResponse.json({ error: "Missing encoded data" }, { status: 400 });
  }

  let decoded: EsewaResponseData;
  try {
    const jsonString = Buffer.from(encodedData, "base64").toString("utf-8");
    decoded = JSON.parse(jsonString);
  } catch {
    return NextResponse.json(
      { error: "Failed to decode eSewa response" },
      { status: 400 },
    );
  }

  const expectedSignature = generateEsewaSignature(
    decoded.total_amount,
    decoded.transaction_uuid,
    decoded.product_code,
  );

  if (expectedSignature !== decoded.signature) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  const transaction = await Transaction.findOne({
    reference: decoded.transaction_uuid,
    userId: session.user.id,
    type: "COURSE_PURCHASE",
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (transaction.status === "COMPLETED") {
    return NextResponse.json({
      success: true,
      redirectTo: "/courses/my",
    });
  }

  const statusApiUrl =
    process.env.ESEWA_STATUS_URL ||
    "https://rc.esewa.com.np/api/epay/transaction/status/";
  const statusRes = await fetch(
    `${statusApiUrl}?product_code=${decoded.product_code}&total_amount=${decoded.total_amount}&transaction_uuid=${decoded.transaction_uuid}`,
  );

  if (!statusRes.ok) {
    return NextResponse.json({ error: "eSewa status API unreachable" }, { status: 502 });
  }

  const statusData: EsewaStatusResponse = await statusRes.json();

  if (statusData.status !== "COMPLETE") {
    await Transaction.findByIdAndUpdate(transaction._id, {
      status: "FAILED",
      "meta.esewaStatus": statusData.status,
    });
    return NextResponse.json(
      { error: `Payment status is ${statusData.status}, not COMPLETE` },
      { status: 400 },
    );
  }

  const metadata = getCoursePurchaseMetadata(
    (transaction.metadata ?? {}) as Record<string, unknown>,
  );

  if (!metadata.courseId || !metadata.instructorId) {
    return NextResponse.json(
      { error: "Transaction metadata is incomplete." },
      { status: 500 },
    );
  }

  try {
    await completeCoursePurchase({
      transactionDocumentId: transaction._id.toString(),
      gateway: "ESEWA",
      metaPatch: {
        esewaTransactionCode: decoded.transaction_code,
        esewaRefId: statusData.ref_id,
      },
    });
  } catch (error) {
    console.error("[POST /api/payments/esewa/course-verify]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify course payment.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    redirectTo: "/courses/my",
  });
}
