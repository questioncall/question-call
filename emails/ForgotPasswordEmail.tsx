import * as React from "react";
import { APP_NAME } from "@/lib/constants";

interface ForgotPasswordEmailProps {
  fullName: string;
  verificationCode: string;
}

export function ForgotPasswordEmail({
  fullName,
  verificationCode,
}: ForgotPasswordEmailProps) {
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        backgroundColor: "#f4fcf9",
        padding: "40px 20px",
        color: "#0f172a",
      }}
    >
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(15, 92, 85, 0.08)",
          overflow: "hidden",
          width: "100%",
          border: "1px solid #e2f1ec",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                background: "linear-gradient(135deg, #0d9488, #0f766e)",
                padding: "32px 40px",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                🔐 Password Reset
              </h1>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "40px" }}>
              <h2
                style={{
                  fontWeight: "600",
                  fontSize: "20px",
                  marginBottom: "24px",
                  color: "#115e59",
                  marginTop: 0,
                }}
              >
                Hello {fullName.split(" ")[0]},
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  marginBottom: "32px",
                  color: "#334155",
                  margin: "0 0 24px",
                }}
              >
                You requested a password reset. Use the following One-Time Password (OTP) to reset your
                password. This code is valid for <strong style={{ color: "#0f766e" }}>10 minutes</strong>.
              </p>

              <div style={{ textAlign: "center", margin: "36px 0" }}>
                <div
                  style={{
                    display: "inline-block",
                    backgroundColor: "#f0fdfa",
                    padding: "16px 32px",
                    fontSize: "28px",
                    fontWeight: "bold",
                    letterSpacing: "6px",
                    borderRadius: "12px",
                    color: "#0d9488",
                    border: "2px dashed rgba(20, 184, 166, 0.4)",
                  }}
                >
                  {verificationCode}
                </div>
              </div>

              <hr
                style={{
                  borderColor: "#e2e8f0",
                  borderStyle: "solid",
                  borderWidth: "1px 0 0 0",
                  margin: "32px 0",
                }}
              />

              <p
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  margin: 0,
                  lineHeight: "1.5",
                  textAlign: "center",
                }}
              >
                If you didn't request a password reset, please ignore this email or contact support.
              </p>
            </td>
          </tr>
          <tr>
            <td
              style={{
                backgroundColor: "#f8fafc",
                textAlign: "center",
                padding: "24px",
                fontSize: "13px",
                color: "#94a3b8",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.<br />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
