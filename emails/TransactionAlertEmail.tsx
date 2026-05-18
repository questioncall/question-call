import * as React from "react";
import { APP_NAME } from "@/lib/constants";

interface TransactionAlertEmailProps {
  title: string;
  message: string;
  transactionId?: string;
  amount?: string;
  userEmail?: string;
  hasPdfAttachment?: boolean;
}

export function TransactionAlertEmail({
  title,
  message,
  transactionId,
  amount,
  userEmail,
  hasPdfAttachment,
}: TransactionAlertEmailProps) {
  const hasDetails = transactionId || amount || userEmail;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#111827",
        padding: "48px 32px",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      {/* Brand */}
      <p
        style={{
          margin: "0 0 40px 0",
          fontSize: "13px",
          fontWeight: "700",
          letterSpacing: "0.05em",
          color: "#16a34a",
          textTransform: "uppercase",
        }}
      >
        {APP_NAME}
      </p>

      {/* Title */}
      <h1
        style={{
          margin: "0 0 12px 0",
          fontSize: "22px",
          fontWeight: "700",
          color: "#111827",
          lineHeight: "1.3",
        }}
      >
        {title}
      </h1>

      {/* Message */}
      <p
        style={{
          margin: "0 0 32px 0",
          fontSize: "15px",
          lineHeight: "1.65",
          color: "#4b5563",
        }}
      >
        {message}
      </p>

      {/* Detail rows */}
      {hasDetails && (
        <table
          cellPadding={0}
          cellSpacing={0}
          style={{
            width: "100%",
            borderTop: "1px solid #e5e7eb",
            marginBottom: "32px",
          }}
        >
          <tbody>
            {transactionId && (
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "13px",
                    color: "#6b7280",
                    borderBottom: "1px solid #f3f4f6",
                    whiteSpace: "nowrap",
                    paddingRight: "16px",
                  }}
                >
                  Transaction ID
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "13px",
                    color: "#111827",
                    fontFamily: "monospace",
                    textAlign: "right",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  {transactionId}
                </td>
              </tr>
            )}
            {amount && (
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "13px",
                    color: "#6b7280",
                    borderBottom: transactionId || userEmail ? "1px solid #f3f4f6" : undefined,
                    paddingRight: "16px",
                  }}
                >
                  Amount
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#16a34a",
                    textAlign: "right",
                    borderBottom: transactionId || userEmail ? "1px solid #f3f4f6" : undefined,
                  }}
                >
                  {amount}
                </td>
              </tr>
            )}
            {userEmail && (
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "13px",
                    color: "#6b7280",
                    paddingRight: "16px",
                  }}
                >
                  Account
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    fontSize: "13px",
                    color: "#111827",
                    textAlign: "right",
                  }}
                >
                  {userEmail}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* PDF notice */}
      {hasPdfAttachment && (
        <p
          style={{
            margin: "0 0 32px 0",
            fontSize: "13px",
            color: "#16a34a",
          }}
        >
          📎 Your receipt is attached — download it from your email client.
        </p>
      )}

      {/* Divider + footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
        <p style={{ margin: "0", fontSize: "12px", color: "#9ca3af" }}>
          {APP_NAME} &middot; automated notification &middot; do not reply
        </p>
      </div>
    </div>
  );
}
