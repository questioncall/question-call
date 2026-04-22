import * as React from "react";
import { APP_NAME } from "@/lib/constants";

interface VerificationEmailProps {
  fullName: string;
  verificationCode: string;
}

export function VerificationEmail({
  fullName,
  verificationCode,
}: VerificationEmailProps) {
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#eef8f5",
        padding: "40px 0",
        color: "#23403b",
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
          boxShadow: "0 10px 28px rgba(15, 92, 85, 0.12)",
          overflow: "hidden",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                background: "linear-gradient(135deg, #1f766e, #0f5c55)",
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
                  color: "#365d56",
                }}
              >
                Use the following One-Time Password (OTP) to verify your
                account. This code is valid for <strong>1 hour</strong>.
              </p>

              <div
                style={{
                  display: "inline-block",
                  backgroundColor: "#edf7f4",
                  padding: "12px 24px",
                  fontSize: "22px",
                  fontWeight: "bold",
                  letterSpacing: "4px",
                  borderRadius: "8px",
                  color: "#1f766e",
                  border: "1px solid rgba(31, 118, 110, 0.16)",
                  marginBottom: "24px",
                }}
              >
                {verificationCode}
              </div>

              <p style={{ fontSize: "14px", color: "#5c7b74" }}>
                If you didn’t request this, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td
              style={{
                backgroundColor: "#f6fbfa",
                textAlign: "center",
                padding: "16px",
                fontSize: "12px",
                color: "#86a8a0",
              }}
            >
              © {new Date().getFullYear()} {APP_NAME}.
              All rights reserved.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
