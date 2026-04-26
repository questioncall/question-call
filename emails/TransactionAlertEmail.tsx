import * as React from "react";
import { APP_NAME } from "@/lib/constants";

interface TransactionAlertEmailProps {
  title: string;
  message: string;
  transactionId?: string;
  amount?: string;
  userEmail?: string;
}

export function TransactionAlertEmail({
  title,
  message,
  transactionId,
  amount,
  userEmail,
}: TransactionAlertEmailProps) {
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#f8fafc",
        padding: "40px 20px",
        color: "#0f172a",
      }}
    >
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
          overflow: "hidden",
          width: "100%",
          border: "1px solid #f1f5f9",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                padding: "24px 32px",
              }}
            >
              <h1 style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#ffffff" }}>
                {title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "32px" }}>
              <p style={{ margin: "0 0 24px 0", fontSize: "16px", lineHeight: "1.6", color: "#334155" }}>
                {message}
              </p>

              {(transactionId || amount || userEmail) && (
                <div style={{ backgroundColor: "#f1f5f9", padding: "20px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
                  {transactionId && (
                    <p style={{ margin: "0 0 12px 0", fontSize: "14px", fontFamily: "monospace", color: "#475569" }}>
                      <strong style={{ color: "#0f172a", marginRight: "8px" }}>Transaction ID:</strong> {transactionId}
                    </p>
                  )}
                  {amount && (
                    <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#475569" }}>
                      <strong style={{ color: "#0f172a", marginRight: "8px" }}>Amount:</strong> {amount}
                    </p>
                  )}
                  {userEmail && (
                    <p style={{ margin: "0", fontSize: "14px", color: "#475569" }}>
                      <strong style={{ color: "#0f172a", marginRight: "8px" }}>User Email:</strong> {userEmail}
                    </p>
                  )}
                </div>
              )}

              <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "32px 0 24px 0", padding: "0" }} />
              <p style={{ margin: "0", fontSize: "13px", color: "#64748b", textAlign: "center" }}>
                This is an automated notification from {APP_NAME}.
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
