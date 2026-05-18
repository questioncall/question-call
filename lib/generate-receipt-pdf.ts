import PDFDocument from "pdfkit";
import { APP_NAME } from "@/lib/constants";

export interface ReceiptData {
  transactionId: string;
  amount: string;
  paymentMethod: string;
  /** Label for the purchased item — "Plan" for subscription, "Course" for course purchase */
  itemLabel: string;
  /** The actual item name — "PRO" or "Photoshop Masterclass" etc. */
  itemName: string;
  /** Subscription expiry date. Pass null for lifetime access (courses). */
  validUntil: string | null;
  issuedTo: string;
  issuedAt: string;
  /** Optional admin note */
  note?: string | null;
}

/**
 * Generates a clean transaction receipt PDF buffer.
 * Used for both subscription approvals and course purchases.
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 60 });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = 595 - 120; // usable width
    const ACCENT = "#1e293b";
    const MUTED = "#64748b";
    const BORDER = "#e2e8f0";
    const SUCCESS = "#22c55e";

    // ── Header band ─────────────────────────────────────────────────────────
    doc.rect(60, 40, W, 72).fill(ACCENT);

    doc
      .fill("#ffffff")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(APP_NAME, 80, 58, { width: W - 40 });

    doc
      .fill("#94a3b8")
      .fontSize(10)
      .font("Helvetica")
      .text("PAYMENT RECEIPT", 80, 83);

    // ── Green confirmation badge ─────────────────────────────────────────────
    doc.rect(60, 128, W, 36).fillColor("#f0fdf4").strokeColor("#bbf7d0").lineWidth(1).fillAndStroke();
    doc.circle(82, 146, 8).fillColor(SUCCESS);
    doc
      .fill("#ffffff")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("✓", 78, 141);
    doc
      .fill("#166534")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        data.validUntil
          ? "Payment confirmed — your access is now active."
          : "Payment confirmed — your purchase is unlocked.",
        98,
        140,
      );

    // ── Transaction details ──────────────────────────────────────────────────
    const rows: [string, string][] = [
      ["Transaction ID", data.transactionId],
      ["Date", data.issuedAt],
      ["Amount", data.amount],
      ["Payment Method", data.paymentMethod],
      [data.itemLabel, data.itemName],
      [
        data.validUntil ? "Active Until" : "Access",
        data.validUntil ?? "Lifetime",
      ],
      ["Issued To", data.issuedTo],
    ];

    let y = 182;
    const labelX = 80;
    const valueX = 260;

    // Section label
    doc
      .fill(MUTED)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("TRANSACTION DETAILS", labelX, y);

    y += 18;
    doc.rect(labelX, y, W - 40, 0.5).fill(BORDER);
    y += 12;

    rows.forEach(([label, value], i) => {
      const rowBg = i % 2 === 0 ? "#f8fafc" : "#ffffff";
      doc.rect(labelX, y - 6, W - 40, 30).fill(rowBg);

      doc.fill(MUTED).fontSize(9).font("Helvetica").text(label, labelX, y);
      doc
        .fill(ACCENT)
        .fontSize(9)
        .font(label === "Amount" ? "Helvetica-Bold" : "Helvetica")
        .text(value, valueX, y, { width: W - valueX + 60 - 40 });

      y += 30;
    });

    doc.rect(labelX, y - 6, W - 40, 0.5).fill(BORDER);

    // ── Note ────────────────────────────────────────────────────────────────
    if (data.note) {
      y += 16;
      doc.rect(labelX, y, W - 40, 1).fill(BORDER);
      y += 12;
      doc.fill(MUTED).fontSize(9).font("Helvetica-Oblique").text(`Note: ${data.note}`, labelX, y);
      y += 20;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = 750;
    doc.rect(60, footerY, W, 0.5).fill(BORDER);
    doc
      .fill(MUTED)
      .fontSize(8)
      .font("Helvetica")
      .text(
        `This is an official receipt from ${APP_NAME}. Keep it for your records.`,
        labelX,
        footerY + 12,
        { align: "center", width: W - 40 },
      );

    doc.end();
  });
}
