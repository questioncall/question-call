# eSewa Payment Integration — EduAsk (Next.js 14)
> Complete guide from zero to working payments. Sandbox → Production.

---

## Table of Contents

1. [What Is eSewa ePay?](#1-what-is-esewa-epay)
2. [Becoming a Merchant (Live)](#2-becoming-a-merchant-live)
3. [Sandbox Credentials (Start Here)](#3-sandbox-credentials-start-here)
4. [How the Flow Works](#4-how-the-flow-works)
5. [Project Structure](#5-project-structure)
6. [Environment Variables](#6-environment-variables)
7. [Code — Step by Step](#7-code--step-by-step)
   - [7.1 Signature Utility](#71-signature-utility)
   - [7.2 Initiate Payment API](#72-initiate-payment-api)
   - [7.3 Pay Button Component](#73-pay-button-component)
   - [7.4 Success Page](#74-success-page)
   - [7.5 Verify Payment API](#75-verify-payment-api)
   - [7.6 Failure Page](#76-failure-page)
8. [Transaction Model](#8-transaction-model)
9. [Subscription Guard Middleware](#9-subscription-guard-middleware)
10. [Testing Checklist](#10-testing-checklist)
11. [Going Live](#11-going-live)
12. [Error Reference](#12-error-reference)

---

## 1. What Is eSewa ePay?

eSewa ePay is Nepal's most widely used payment gateway. When a student clicks **"Pay with eSewa"**:

- They are redirected to eSewa's own payment page (you do not handle card/wallet data)
- They log in with their eSewa account and confirm
- eSewa redirects them back to your site with a signed response
- Your server verifies the signature and activates the subscription

> **Key difference from Stripe:** There is no embedded form. Everything goes through a redirect. Your job is to build and sign the form, then verify the return.

---

## 2. Becoming a Merchant (Live)

> Skip this section until you are ready to go live. Sandbox works with no paperwork.

### Documents Required

| # | Document |
|---|----------|
| 1 | PAN / VAT certificate of your business |
| 2 | Certificate of Registration of your business |
| 3 | Business owner's Citizenship (Nagarikta) |
| 4 | Recent Tax Clearance Certificate |
| 5 | Bank Account in any eSewa member bank |

### How to Apply

1. Go to `https://merchant.esewa.com.np/auth/register-merchant/`
2. Fill the online form
3. An eSewa representative will contact you
4. You sign a merchant agreement
5. eSewa provides your **live Merchant Code** and **live Secret Key**
6. You swap your `.env` values and go live

> **Contact:** `merchant.operation@esewa.com.np`

---

## 3. Sandbox Credentials (Start Here)

These are public test credentials provided by eSewa. Use them freely during development.

```
eSewa Test ID:     9806800001   (also works: 9806800002 / 9806800003)
Password:          Nepal@123
MPIN:              1122
OTP Token:         123456

Merchant Code:     EPAYTEST
Secret Key:        8gBm/:&EnhH.1/q

Sandbox Pay URL:   https://rc-epay.esewa.com.np/api/epay/main/v2/form
Sandbox Status URL: https://rc.esewa.com.np/api/epay/transaction/status/
```

> These credentials are shared by all developers in Nepal. They work as-is, no approval needed.

---

## 4. How the Flow Works

```
Student clicks "Pay with eSewa"
        │
        ▼
YOUR SERVER builds form fields + generates HMAC signature
        │
        ▼
Browser submits hidden form → eSewa sandbox URL
        │
        ▼
Student logs in on eSewa's page (test ID + password + OTP)
        │
        ▼
Student confirms payment on eSewa
        │
        ├──── SUCCESS ─────────────────────────────────────────────┐
        │                                                           │
        ▼                                                           ▼
eSewa redirects to your /payment/esewa/failure      eSewa redirects to your /payment/esewa/success
                                                    with ?data=<base64 encoded JSON>
                                                            │
                                                            ▼
                                                    YOUR SERVER decodes + verifies signature
                                                            │
                                                            ▼
                                                    YOUR SERVER calls eSewa status API (double check)
                                                            │
                                                            ▼
                                                    Activate subscription in DB ✓
```

### Why Two Verification Steps?

1. **Signature check** — Confirms the response came from eSewa and was not tampered with
2. **Status API check** — Confirms the payment is actually `COMPLETE` in eSewa's system

Never skip step 2. Without it, a malicious user could craft a fake success redirect.

---

## 5. Project Structure

Only the files you need to create or modify for eSewa:

```
app/
├── api/
│   └── payments/
│       └── esewa/
│           ├── initiate/
│           │   └── route.ts          ← Server: builds + signs form params
│           └── verify/
│               └── route.ts          ← Server: verifies payment after redirect
│
├── payment/
│   └── esewa/
│       ├── success/
│       │   └── page.tsx              ← Client: decodes data, calls verify
│       └── failure/
│           └── page.tsx              ← Client: shows failure message
│
components/
└── student/
    └── EsewaPayButton.tsx            ← Client: submits hidden form to eSewa
│
lib/
└── payment/
    └── esewa.ts                      ← Signature generator utility
│
models/
└── Transaction.ts                    ← MongoDB model for payment records
│
.env.local                            ← All eSewa keys go here
```

---

## 6. Environment Variables

Add these to your `.env.local`:

```env
# ─── eSewa Sandbox ──────────────────────────────────────
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_PAYMENT_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
ESEWA_STATUS_URL=https://rc.esewa.com.np/api/epay/transaction/status/

# ─── Public (used by client component) ──────────────────
NEXT_PUBLIC_ESEWA_PAYMENT_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form

# ─── App ────────────────────────────────────────────────
NEXT_PUBLIC_URL=http://localhost:3000
```

> `NEXT_PUBLIC_` prefix makes a variable available in client-side (browser) code.
> Never put your `ESEWA_SECRET_KEY` in a `NEXT_PUBLIC_` variable — it will be exposed.

---

## 7. Code — Step by Step

### Code Style Rules (used throughout this project)

```
- TypeScript strict mode
- Named exports for utilities, default exports for components and pages
- async/await (no .then chains)
- All API routes use NextRequest / NextResponse
- All DB calls wrapped with await dbConnect()
- Error responses always include a descriptive { error: string } body
- Environment variables always accessed via process.env.VAR_NAME!
```

---

### 7.1 Signature Utility

**File:** `lib/payment/esewa.ts`

This is the security layer. eSewa uses HMAC-SHA256 to verify that nobody changed the amount between your server and their server.

```typescript
import crypto from "crypto";

// The field order here is FIXED by eSewa — never change it
const SIGNED_FIELDS = "total_amount,transaction_uuid,product_code";

/**
 * Generates a base64 HMAC-SHA256 signature for eSewa payment requests.
 * Used for both the outgoing request AND verifying the incoming response.
 *
 * @param totalAmount  - Full payment amount in NPR (e.g. 500)
 * @param transactionUuid - Your unique transaction ID (e.g. "SUB-userId-timestamp")
 * @param productCode  - Your eSewa merchant code (e.g. "EPAYTEST")
 * @returns base64 encoded HMAC-SHA256 signature string
 */
export function generateEsewaSignature(
  totalAmount: number | string,
  transactionUuid: string,
  productCode: string
): string {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  return crypto
    .createHmac("sha256", process.env.ESEWA_SECRET_KEY!)
    .update(message)
    .digest("base64");
}

export { SIGNED_FIELDS };
```

> **Why HMAC?** You and eSewa both know the secret key. eSewa re-generates the signature on their end and compares it to yours. If someone changes `total_amount=500` to `total_amount=1` in transit, the signatures won't match and eSewa rejects it.

---

### 7.2 Initiate Payment API

**File:** `app/api/payments/esewa/initiate/route.ts`

This route runs on your server. It generates the signed parameters and saves a `PENDING` transaction to the database. The client uses these params to build the form.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateEsewaSignature, SIGNED_FIELDS } from "@/lib/payment/esewa";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  await dbConnect();

  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
  const { amount } = await req.json() as { amount: number };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // 3. Check user is not already subscribed
  const user = await User.findById(session.user.id);
  if (user?.subscriptionStatus === "ACTIVE" && user.subscriptionEnd > new Date()) {
    return NextResponse.json({ error: "Subscription already active" }, { status: 400 });
  }

  // 4. Build transaction reference
  // Format: SUB-{userId}-{timestamp}  (alphanumeric + hyphen only — eSewa rule)
  const transactionUuid = `SUB-${session.user.id}-${Date.now()}`;
  const productCode = process.env.ESEWA_MERCHANT_CODE!;

  // eSewa breaks amount into parts — for subscriptions, tax and charges are 0
  const baseAmount = amount;
  const taxAmount = 0;
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
  });

  // 7. Return all params the client needs for the form POST
  return NextResponse.json({
    amount: baseAmount,
    tax_amount: taxAmount,
    product_service_charge: serviceCharge,
    product_delivery_charge: deliveryCharge,
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
    product_code: productCode,
    success_url: `${process.env.NEXT_PUBLIC_URL}/payment/esewa/success`,
    failure_url: `${process.env.NEXT_PUBLIC_URL}/payment/esewa/failure`,
    signed_field_names: SIGNED_FIELDS,
    signature,
  });
}
```

---

### 7.3 Pay Button Component

**File:** `components/student/EsewaPayButton.tsx`

eSewa requires a **form POST** to their server — not a fetch/redirect from JavaScript. This component programmatically creates a hidden form and submits it, which achieves the same result while keeping your UI clean.

```tsx
"use client";

import { useState } from "react";

interface EsewaPayButtonProps {
  amount: number;      // subscription price in NPR
  className?: string;
}

export default function EsewaPayButton({ amount, className }: EsewaPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1 — Get signed params from your server
      const res = await fetch("/api/payments/esewa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initiate payment");
      }

      const params = await res.json();

      // Step 2 — Build a hidden form with all the signed params
      const form = document.createElement("form");
      form.method = "POST";
      form.action = process.env.NEXT_PUBLIC_ESEWA_PAYMENT_URL!;

      // Attach each param as a hidden input
      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      // Step 3 — Submit the form (user is redirected to eSewa's payment page)
      document.body.appendChild(form);
      form.submit();
      // Page navigates away here — no code runs after this line

    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className={`flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700
          disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold
          px-6 py-3 rounded-lg transition-colors ${className ?? ""}`}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Redirecting to eSewa...
          </>
        ) : (
          <>Pay NPR {amount} with eSewa</>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

**Usage in your subscription page:**

```tsx
// app/(student)/subscription/page.tsx
import EsewaPayButton from "@/components/student/EsewaPayButton";

export default function SubscriptionPage() {
  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded-xl">
      <h1 className="text-2xl font-bold mb-2">EduAsk Monthly Plan</h1>
      <p className="text-gray-500 mb-6">Unlimited question asking for 30 days</p>
      <p className="text-3xl font-bold mb-6">NPR 500 <span className="text-base font-normal text-gray-400">/ month</span></p>
      <EsewaPayButton amount={500} />
    </div>
  );
}
```

---

### 7.4 Success Page

**File:** `app/payment/esewa/success/page.tsx`

After payment, eSewa redirects to your `success_url` with a `?data=` query param. This is a base64 encoded JSON string containing the transaction result. This page decodes it and sends it to your verify route.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type VerifyStatus = "verifying" | "success" | "failed";

function EsewaSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const encodedData = searchParams.get("data");

    if (!encodedData) {
      setStatus("failed");
      setMessage("No payment data received from eSewa.");
      return;
    }

    // Send encoded data to your verify route
    fetch("/api/payments/esewa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encodedData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage("Your subscription is now active for 30 days.");
          // Redirect to dashboard after 3 seconds
          setTimeout(() => router.push("/student/dashboard"), 3000);
        } else {
          setStatus("failed");
          setMessage(data.error || "Verification failed. Please contact support.");
        }
      })
      .catch(() => {
        setStatus("failed");
        setMessage("Network error during verification.");
      });
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      {status === "verifying" && (
        <>
          <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-lg">Verifying your payment with eSewa...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-green-600 text-6xl">✓</div>
          <h1 className="text-2xl font-bold text-green-700">Payment Successful!</h1>
          <p className="text-gray-500">{message}</p>
          <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
        </>
      )}

      {status === "failed" && (
        <>
          <div className="text-red-500 text-6xl">✗</div>
          <h1 className="text-2xl font-bold text-red-600">Verification Failed</h1>
          <p className="text-gray-500">{message}</p>
          <a href="/student/dashboard" className="mt-4 text-green-600 underline">
            Return to Dashboard
          </a>
        </>
      )}
    </div>
  );
}

// Suspense boundary required because useSearchParams() is used
export default function EsewaSuccessPage() {
  return (
    <Suspense fallback={<div className="flex justify-center mt-20">Loading...</div>}>
      <EsewaSuccessContent />
    </Suspense>
  );
}
```

---

### 7.5 Verify Payment API

**File:** `app/api/payments/esewa/verify/route.ts`

This is the most important route. It runs two checks:
1. Signature match — proves the data came from eSewa
2. Status API call — proves the payment is actually complete

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateEsewaSignature } from "@/lib/payment/esewa";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

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
  await dbConnect();

  // 1. Auth check
  const session = await getServerSession(authOptions);
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
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found or already processed" }, { status: 404 });
  }

  // 5. Double-check with eSewa's status API — never skip this
  const statusRes = await fetch(
    `${process.env.ESEWA_STATUS_URL}?product_code=${decoded.product_code}&total_amount=${decoded.total_amount}&transaction_uuid=${decoded.transaction_uuid}`
  );

  if (!statusRes.ok) {
    return NextResponse.json({ error: "eSewa status API unreachable" }, { status: 502 });
  }

  const statusData: EsewaStatusResponse = await statusRes.json();

  if (statusData.status !== "COMPLETE") {
    // Update transaction to reflect the actual status
    await Transaction.findByIdAndUpdate(transaction._id, {
      status: "FAILED",
      meta: { esewaStatus: statusData.status },
    });
    return NextResponse.json(
      { error: `Payment status is ${statusData.status}, not COMPLETE` },
      { status: 400 }
    );
  }

  // 6. All checks passed — activate the subscription
  await Transaction.findByIdAndUpdate(transaction._id, {
    status: "COMPLETED",
    meta: {
      esewaTransactionCode: decoded.transaction_code,
      esewaRefId: statusData.ref_id,
    },
  });

  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await User.findByIdAndUpdate(session.user.id, {
    subscriptionStatus: "ACTIVE",
    subscriptionEnd: thirtyDaysFromNow,
    trialUsed: true,
  });

  return NextResponse.json({ success: true });
}
```

---

### 7.6 Failure Page

**File:** `app/payment/esewa/failure/page.tsx`

eSewa redirects here if the user cancels, has insufficient balance, or the session expires.

```tsx
import Link from "next/link";

export default function EsewaFailurePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <div className="text-red-500 text-6xl">✗</div>
      <h1 className="text-2xl font-bold text-red-600">Payment Not Completed</h1>
      <p className="text-gray-500 max-w-sm">
        Your eSewa payment was cancelled or failed. No money has been charged.
        You can try again anytime.
      </p>
      <div className="flex gap-4 mt-4">
        <Link
          href="/student/subscription"
          className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Try Again
        </Link>
        <Link
          href="/student/dashboard"
          className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

---

## 8. Transaction Model

**File:** `models/Transaction.ts`

```typescript
import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "DEBIT" | "CREDIT" | "WITHDRAWAL";
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  reference: string;        // your transaction UUID
  gateway: "ESEWA" | "KHALTI" | "INTERNAL";
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEBIT", "CREDIT", "WITHDRAWAL"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    reference: {
      type: String,
      required: true,
      unique: true,   // prevents duplicate processing
      index: true,
    },
    gateway: {
      type: String,
      enum: ["ESEWA", "KHALTI", "INTERNAL"],
      required: true,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
```

---

## 9. Subscription Guard Middleware

**File:** `middleware.ts` (or add to existing middleware)

Block students from asking questions when their subscription is expired.

```typescript
// In your existing middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const path = req.nextUrl.pathname;

  // Protect student question posting
  if (path.startsWith("/api/questions") && req.method === "POST") {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Subscription check is done inside the API route itself
    // (middleware does not have DB access — keep it light)
    // In /api/questions route.ts, add:
    //
    //   const user = await User.findById(session.user.id);
    //   const isExpired = user.subscriptionStatus === "EXPIRED"
    //     || (user.subscriptionEnd && user.subscriptionEnd < new Date());
    //   const trialUsed = user.trialUsed && user.subscriptionStatus !== "ACTIVE";
    //
    //   if (isExpired || trialUsed) {
    //     return NextResponse.json(
    //       { error: "SUBSCRIPTION_REQUIRED", redirectTo: "/student/subscription" },
    //       { status: 402 }
    //     );
    //   }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/questions/:path*", "/student/:path*", "/teacher/:path*"],
};
```

---

## 10. Testing Checklist

Work through this list in order before shipping.

### Sandbox Test Flow

```
[ ] 1. Start dev server — npm run dev
[ ] 2. Log in as a student account
[ ] 3. Go to /student/subscription
[ ] 4. Click "Pay NPR 500 with eSewa"
[ ] 5. You are redirected to eSewa sandbox page
[ ] 6. Log in with:
        ID:       9806800001
        Password: Nepal@123
        OTP:      123456
[ ] 7. Confirm the payment
[ ] 8. You are redirected back to /payment/esewa/success
[ ] 9. "Verifying..." spinner shows
[ ] 10. "Payment Successful!" shows
[ ] 11. Check MongoDB: Transaction status = "COMPLETED"
[ ] 12. Check MongoDB: User subscriptionStatus = "ACTIVE"
[ ] 13. Check MongoDB: User subscriptionEnd ≈ now + 30 days
[ ] 14. Verify the student can now post a question
```

### Edge Case Tests

```
[ ] Click "Pay" then close the tab → Transaction is PENDING in DB (expected)
[ ] Click browser back on eSewa page → redirected to /failure (expected)
[ ] Try to pay again while subscription is ACTIVE → 400 error returned (expected)
[ ] Manually send a fake ?data= to /success → signature mismatch, rejected (expected)
```

---

## 11. Going Live

When your merchant account is approved, swap exactly these 4 values in your environment:

```env
# ── Before (sandbox) ────────────────────────────────────
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_PAYMENT_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
ESEWA_STATUS_URL=https://rc.esewa.com.np/api/epay/transaction/status/

# ── After (production) ──────────────────────────────────
ESEWA_MERCHANT_CODE=YOUR_REAL_MERCHANT_CODE         # from eSewa agreement
ESEWA_SECRET_KEY=YOUR_REAL_SECRET_KEY               # from eSewa agreement
ESEWA_PAYMENT_URL=https://epay.esewa.com.np/api/epay/main/v2/form
ESEWA_STATUS_URL=https://esewa.com.np/api/epay/transaction/status/
```

> **Zero code changes required.** Only environment variables change.

On Vercel, add these in:
`Project Settings → Environment Variables → Production`

---

## 12. Error Reference

| Scenario | What happens | Fix |
|---|---|---|
| Wrong secret key | Signature mismatch on verify | Check `ESEWA_SECRET_KEY` in `.env.local` |
| `transaction_uuid` has `/` or space | eSewa rejects form | Use only alphanumeric + hyphen |
| `total_amount` is a float with many decimals | Signature mismatch | Round to 2 decimal places before signing |
| User opens success URL directly (no `?data=`) | "No payment data received" error shown | Expected — handled gracefully |
| eSewa status API returns `NOT_FOUND` | Transaction UUID not found on eSewa | UUID mismatch or session expired (5 min limit) |
| eSewa status API returns `PENDING` | Payment initiated but not confirmed | Wait and retry, or show a "check back later" message |
| Duplicate payment attempt | `unique` constraint on `reference` field | Caught and returned as 404 "already processed" |
| `NEXT_PUBLIC_URL` is `localhost` in production | Success/failure redirects fail | Set correct production URL in Vercel env vars |

---

*Last updated for eSewa ePay v2 API — sandbox URL: `rc-epay.esewa.com.np`*
*Production URL: `epay.esewa.com.np`*
*Developer docs: `https://developer.esewa.com.np/pages/Epay`*