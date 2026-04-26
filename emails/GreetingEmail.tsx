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
          {/* Header */}
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
                  fontSize: "26px",
                  fontWeight: "bold",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {APP_NAME}
              </h1>
            </td>
          </tr>

          {/* Body */}
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

              {/* Main message */}
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  marginBottom: "32px",
                  color: "#334155",
                  margin: "0 0 24px",
                }}
              >
                {message}
              </p>

              {/* Additional content */}
              {content && (
                <div
                  style={{
                    backgroundColor: "#f0fdfa",
                    borderLeft: "4px solid #14b8a6",
                    borderRadius: "0 8px 8px 0",
                    padding: "20px",
                    fontSize: "15px",
                    lineHeight: "1.6",
                    color: "#0f766e",
                    marginBottom: "32px",
                  }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}

              {/* Link section */}
              {link && (
                <div style={{ textAlign: "center", margin: "36px 0" }}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      backgroundColor: "#0d9488",
                      color: "#ffffff",
                      padding: "14px 32px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      textDecoration: "none",
                      fontSize: "16px",
                      boxShadow: "0 4px 6px -1px rgba(13, 148, 136, 0.2)",
                    }}
                  >
                    Take Action Now
                  </a>
                </div>
              )}

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
                If you have any questions or didn't request this email, please
                ignore it or contact our support team.
              </p>
            </td>
          </tr>

          {/* Footer */}
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
              <span style={{ display: "inline-block", marginTop: "8px" }}>
                Empowering your academic journey.
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
