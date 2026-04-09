# 🧾 Manual eSewa Payment Integration (Startup Mode)

> A simple, safe way to accept payments before getting a real payment gateway.

---

# 📌 Overview

Manual payment allows users to pay using eSewa QR or ID, while you verify payments manually.

This is ideal for:

* Early-stage startups
* MVP / prototype phase
* When business is not yet registered

---

# 🔁 Complete Flow

```
User selects plan
      ↓
User pays via eSewa QR / ID
      ↓
User submits transaction ID on website
      ↓
Admin verifies payment manually
      ↓
Subscription activated
```

---

# 🧑‍💻 Step 1 — Show Payment Details

Display on your website:

* eSewa ID (phone number)
* QR Code (image)
* Exact amount

### Example UI

```
Pay NPR 500 via eSewa

ID: 98XXXXXXXX

[ QR CODE IMAGE ]
```

---

# 🧾 Step 2 — Payment Submission Form

After payment, user submits details.

### Required fields:

* Transaction ID

### Optional fields (recommended):

* Screenshot of payment

### Example

```
Transaction ID: ___________
Upload Screenshot: [Choose File]

[ Submit Payment ]
```

---

# 🗄️ Step 3 — Store in Database

Create a payment record:

```json
{
  "userId": "USER_ID",
  "amount": 500,
  "transactionId": "ABC123XYZ",
  "status": "PENDING",
  "createdAt": "timestamp"
}
```

---

# 🛠️ Step 4 — Admin Verification

Admin checks payment manually in eSewa:

### Verify:

* Transaction ID exists
* Amount matches
* Status is SUCCESS

---

# ✅ Step 5 — Approve / Reject

### If valid:

* Mark as `COMPLETED`
* Activate subscription

### If invalid:

* Mark as `FAILED`

---

# ⚠️ Important Security Rules

## 1. Never auto-approve

Users can fake transaction IDs.

## 2. Ensure correct amount

Only approve exact payment.

## 3. Prevent duplicates

Make `transactionId` unique.

## 4. Verify inside eSewa

Do not trust user input.

---

# ⏱️ User Communication

Always show message:

> "Payment will be verified within 1 hour"

---

# 🧑‍💼 Admin Panel (Recommended)

Create a simple dashboard:

### Show:

* User
* Amount
* Transaction ID
* Screenshot
* Status

### Actions:

* Approve
* Reject

---

# 📦 Suggested Status Flow

```
PENDING → COMPLETED
        → FAILED
```

---

# 🚀 Advantages

* No business registration needed
* Quick to implement
* Works immediately

---

# ❌ Limitations

* Manual work required
* Not scalable
* Slower user experience

---

# 🔄 Future Upgrade

Once business is registered:

* Apply for eSewa merchant account
* Get Merchant Code & Secret Key
* Replace manual flow with automatic gateway

---

# 🧠 Pro Tips

* Always ask for screenshot (reduces fraud)
* Use admin panel instead of checking manually in DB
* Keep logs of all transactions

---

# 🎯 Summary

Manual eSewa payment is a temporary solution that allows startups to start accepting payments without waiting for official gateway approval.

Use it to validate your product, then upgrade to full automation later.
