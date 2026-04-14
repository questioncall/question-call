import * as React from "react";

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
        backgroundColor: "#f9fafb",
        padding: "40px 0",
        color: "#111827",
      }}
    >
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "32px" }}>
              <h1 style={{ margin: "0 0 20px 0", fontSize: "24px", fontWeight: "bold" }}>
                {title}
              </h1>
              
              <p style={{ margin: "0 0 24px 0", fontSize: "16px", lineHeight: "1.5", color: "#374151" }}>
                {message}
              </p>

              {(transactionId || amount || userEmail) && (
                <div style={{ backgroundColor: "#f3f4f6", padding: "20px", borderRadius: "8px", marginBottom: "24px" }}>
                  {transactionId && (
                    <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontFamily: "monospace", color: "#4b5563" }}>
                      <strong style={{ color: "#111827" }}>Transaction ID:</strong> {transactionId}
                    </p>
                  )}
                  {amount && (
                    <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#4b5563" }}>
                      <strong style={{ color: "#111827" }}>Amount:</strong> {amount}
                    </p>
                  )}
                  {userEmail && (
                    <p style={{ margin: "0", fontSize: "14px", color: "#4b5563" }}>
                      <strong style={{ color: "#111827" }}>User Email:</strong> {userEmail}
                    </p>
                  )}
                </div>
              )}

              <hr style={{ border: "0", borderTop: "1px solid #e5e7eb", margin: "24px 0", padding: "0" }} />
              <p style={{ margin: "0", fontSize: "12px", color: "#6b7280" }}>
                This is an automated notification from Question Hub.
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
