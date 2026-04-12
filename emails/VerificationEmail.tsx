import * as React from "react";

interface VerificationEmailProps {
  fullName: string;
  verificationCode: string;
}

export async function VerificationEmail({
  fullName,
  verificationCode,
}: VerificationEmailProps) {
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#f4f4f7",
        padding: "40px 0",
        color: "#333",
      }}
    >
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                padding: "20px 30px",
                textAlign: "center",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              🔐 Email Verification
            </td>
          </tr>
          <tr>
            <td style={{ padding: "30px" }}>
              <h2
                style={{
                  fontWeight: "600",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                Hello {fullName.split(" ")[0]},
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  marginBottom: "24px",
                }}
              >
                Use the following One-Time Password (OTP) to verify your
                account. This code is valid for <strong>1 hour</strong>.
              </p>

              <div
                style={{
                  display: "inline-block",
                  backgroundColor: "#f3f4f6",
                  padding: "12px 24px",
                  fontSize: "22px",
                  fontWeight: "bold",
                  letterSpacing: "4px",
                  borderRadius: "8px",
                  color: "#4f46e5",
                  marginBottom: "24px",
                }}
              >
                {verificationCode}
              </div>

              <p style={{ fontSize: "14px", color: "#777" }}>
                If you didn’t request this, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td
              style={{
                backgroundColor: "#f9fafb",
                textAlign: "center",
                padding: "16px",
                fontSize: "12px",
                color: "#aaa",
              }}
            >
              © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME}.
              All rights reserved.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
