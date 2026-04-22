import * as React from "react";
import { APP_NAME } from "@/lib/constants";

interface GreetingEmailProps {
  fullName: string;
  message: string;
  content?: string;
  link?: string;
}

export function GreetingEmail({
  fullName,
  message,
  content,
  link,
}: GreetingEmailProps) {
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
          boxShadow: "0 12px 32px rgba(15, 92, 85, 0.12)",
          overflow: "hidden",
        }}
      >
        <tbody>
          {/* Header */}
          <tr>
            <td
              style={{
                background: "linear-gradient(135deg, #1f766e, #0f5c55)",
                color: "#fff",
                padding: "24px 30px",
                textAlign: "center",
                fontSize: "22px",
                fontWeight: "bold",
              }}
            >
              📬 A Special Message for You
            </td>
          </tr>

          {/* Body */}
          <tr>
            <td style={{ padding: "30px" }}>
              <h2
                style={{
                  fontWeight: "600",
                  fontSize: "20px",
                  marginBottom: "16px",
                  color: "#0f5c55",
                }}
              >
                Hello {fullName.split(" ")[0]},
              </h2>

              {/* Main message */}
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  marginBottom: "20px",
                  color: "#365d56",
                }}
              >
                {message}
              </p>

              {/* Link section */}
              {link && (
                <p style={{ marginBottom: "20px" }}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      backgroundColor: "#1f766e",
                      color: "#ffffff",
                      padding: "12px 20px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      textDecoration: "none",
                      fontSize: "15px",
                    }}
                  >
                    Click Here
                  </a>
                </p>
              )}

              {/* Additional content */}
              {content && (
                <div
                  style={{
                    backgroundColor: "#f4fbf8",
                    border: "1px solid rgba(31, 118, 110, 0.15)",
                    borderRadius: "10px",
                    padding: "16px",
                    fontSize: "15px",
                    lineHeight: "1.6",
                    color: "#1a6259",
                    marginBottom: "24px",
                  }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}

              <p style={{ fontSize: "14px", color: "#5c7b74" }}>
                If you have any questions or didn’t request this email, please
                ignore it or contact our support team.
              </p>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                backgroundColor: "#f6fbfa",
                textAlign: "center",
                padding: "14px",
                fontSize: "12px",
                color: "#86a8a0",
              }}
            >
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
