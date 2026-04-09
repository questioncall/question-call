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
