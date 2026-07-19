import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { generateEsewaSignature } from "@/lib/payment/esewa";
import Transaction from "@/models/Transaction";
import Notification from "@/models/Notification";
import { connectToDatabase } from "@/lib/mongodb";
import { sendTransactionEmail } from "@/lib/sendEmails/sendTransactionEmail";
import { getMasterAdminEmails } from "@/lib/user-directory";
import { generateReceiptPdf } from "@/lib/generate-receipt-pdf";
import { sendPushNotificationToUser } from "@/lib/push/web-push";
import { emitNotification } from "@/lib/pusher/pusherServer";
import { activateSubscription } from "@/lib/subscription-activation";
import { finalizePercentageCouponRedemption } from "@/lib/subscription-coupons";

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
  status: "COMPLETE" | "PENDING" | "FULL_REFUND" | "NOT_FOUND" | "AMBIGUOUS" | "CANCELED";
  ref_id: string | null;
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  // 1. Auth check
  const session = await getSafeServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { encodedData } = await req.json() as { encodedData: string };

  if (!encodedData) {
    return NextResponse.json({ error: "Missing encoded data" }, { status: 400 });
  }

  // 2. Decode base64 response from eSewa
  let decoded: EsewaResponseData;
  try {
    const jsonString = Buffer.from(encodedData, "base64").toString("utf-8");
    decoded = JSON.parse(jsonString);
  } catch {
    return NextResponse.json({ error: "Failed to decode eSewa response" }, { status: 400 });
  }

  // 3. Verify signature — confirm eSewa sent this, not a forged request
  const expectedSignature = generateEsewaSignature(
    decoded.total_amount,
    decoded.transaction_uuid,
    decoded.product_code
  );

  if (expectedSignature !== decoded.signature) {
    console.error("[eSewa] Signature mismatch:", {
      expected: expectedSignature,
      received: decoded.signature,
    });
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // 4. Find the pending transaction by UUID to ensure it belongs to this user
  const transaction = await Transaction.findOne({
    reference: decoded.transaction_uuid,
    userId: session.user.id,
    status: "PENDING",
    type: "DEBIT",
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found or already processed" }, { status: 404 });
  }

  // 5. Double-check with eSewa's status API — never skip this
  const statusApiUrl = process.env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status/";
  const statusRes = await fetch(
    `${statusApiUrl}?product_code=${decoded.product_code}&total_amount=${decoded.total_amount}&transaction_uuid=${decoded.transaction_uuid}`
  );

  if (!statusRes.ok) {
    return NextResponse.json({ error: "eSewa status API unreachable" }, { status: 502 });
  }

  const statusData: EsewaStatusResponse = await statusRes.json();

  if (statusData.status !== "COMPLETE") {
    // Update transaction to reflect the actual status
    await Transaction.findByIdAndUpdate(transaction._id, {
      status: "FAILED",
      "meta.esewaStatus": statusData.status,
    });
    return NextResponse.json(
      { error: `Payment status is ${statusData.status}, not COMPLETE` },
      { status: 400 }
    );
  }

  // 6. All checks passed — activate the subscription
  await Transaction.findByIdAndUpdate(transaction._id, {
    status: "COMPLETED",
    "meta.esewaTransactionCode": decoded.transaction_code,
    "meta.esewaRefId": statusData.ref_id,
  });

  const durationDays = transaction.meta?.durationDays || 30;
  const planSlug = transaction.meta?.planSlug || "unknown";

  const activation = await activateSubscription({
    userId: session.user.id,
    planSlug,
    durationDays: typeof durationDays === "number" ? durationDays : null,
  });

  if (!activation.ok) {
    return NextResponse.json({ error: activation.error }, { status: activation.status });
  }

  const subscriptionEnd = activation.subscriptionEnd;

  const couponId = (transaction.meta as Record<string, unknown> | undefined)
    ?.subscriptionCouponId;
  if (typeof couponId === "string" && couponId) {
    await finalizePercentageCouponRedemption({
      couponId,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      planSlug,
      transactionId: transaction._id,
    });
  }

  // Notify the user (in-app + Pusher + push + email-with-PDF)
  const subscriptionMessage = `Your eSewa payment for ${planSlug.toUpperCase()} was successful. Access is active until ${subscriptionEnd.toLocaleDateString()}.`;
  const txnId = decoded.transaction_code || decoded.transaction_uuid;

  const notif = await Notification.create({
    userId: session.user.id,
    type: "PAYMENT",
    message: subscriptionMessage,
    href: "/subscription",
    isRead: false,
  }).catch(() => null);

  if (notif) {
    await emitNotification(session.user.id, notif).catch(() => {});
  }

  void sendPushNotificationToUser(session.user.id, {
    type: "PAYMENT",
    message: subscriptionMessage,
    href: "/subscription",
  }).catch(console.error);

  if (session.user.email) {
    const issuedAt = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const validUntil = subscriptionEnd.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const receiptPdf = await generateReceiptPdf({
      transactionId: txnId,
      amount: `NPR ${decoded.total_amount}`,
      paymentMethod: "eSewa",
      itemLabel: "Plan",
      itemName: planSlug.toUpperCase(),
      validUntil,
      issuedTo: session.user.email,
      issuedAt,
      note: null,
    }).catch(() => null);

    void sendTransactionEmail(
      session.user.email,
      "Payment Successful",
      subscriptionMessage,
      txnId,
      `NPR ${decoded.total_amount}`,
      session.user.email,
      receiptPdf,
    ).catch(console.error);
  }

  // Notify master admins (record-keeping only, no PDF)
  const masterAdminEmails = await getMasterAdminEmails();
  if (masterAdminEmails.length > 0) {
    void sendTransactionEmail(
      masterAdminEmails,
      "eSewa Subscription Payment Verified",
      `A user has completed an eSewa payment for subscription plan "${planSlug}". Subscription activated until ${subscriptionEnd.toLocaleDateString()}.`,
      txnId,
      `NPR ${decoded.total_amount}`,
      session.user.email ?? "Unknown"
    ).catch(console.error);
  }

  return NextResponse.json({ success: true, planSlug });
}
