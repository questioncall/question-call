import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { generateEsewaSignature, SIGNED_FIELDS } from "@/lib/payment/esewa";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import { getSiteUrl } from "@/lib/site-url";

export async function POST(req: NextRequest) {
  await connectToDatabase();

  // 1. Auth check
  const session = await getSafeServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
  const { planSlug } = await req.json() as { planSlug: string };

  if (!planSlug) {
    return NextResponse.json({ error: "Missing plan configuration" }, { status: 400 });
  }

  const config = await getPlatformConfig();
  const hydratedPlans = getHydratedPlans(config);

  const plan = hydratedPlans.find(p => p.slug === planSlug);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  }

  // 3. Check user is not already subscribed
  const user = await User.findById(session.user.id);
  if (user?.subscriptionStatus === "ACTIVE" && user.subscriptionEnd > new Date()) {
    return NextResponse.json({ error: "Subscription already active" }, { status: 400 });
  }

  // 4. Build transaction reference
  // Format: SUB-{userId}-{timestamp}  (alphanumeric + hyphen only — eSewa rule)
  const transactionUuid = `SUB-${session.user.id}-${Date.now()}`;
  const productCode = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";

  // eSewa breaks amount into parts — for subscriptions, tax and charges are 0 in our base example
  // We'll pass the total due considering tax.
  const baseAmount = plan.price;
  const taxAmount = plan.tax;
  const serviceCharge = 0;
  const deliveryCharge = 0;
  const totalAmount = baseAmount + taxAmount + serviceCharge + deliveryCharge;

  // 5. Generate HMAC signature
  const signature = generateEsewaSignature(totalAmount, transactionUuid, productCode);

  // 6. Save PENDING transaction to DB before redirecting
  //    If user closes the tab after payment but before verification, this record exists
  await Transaction.create({
    userId: session.user.id,
    type: "DEBIT",
    amount: totalAmount,
    status: "PENDING",
    reference: transactionUuid,
    gateway: "ESEWA",
    meta: {
      planSlug: plan.slug,
      durationDays: plan.durationDays
    }
  });

  const siteUrl = getSiteUrl();

  // 7. Return all params the client needs for the form POST
  return NextResponse.json({
    amount: baseAmount,
    tax_amount: taxAmount,
    product_service_charge: serviceCharge,
    product_delivery_charge: deliveryCharge,
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
    product_code: productCode,
    success_url: `${siteUrl}/payment/esewa/success`,
    failure_url: `${siteUrl}/payment/esewa/failure`,
    signed_field_names: SIGNED_FIELDS,
    signature,
  });
}
