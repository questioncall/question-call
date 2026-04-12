import * as React from "react";

interface GreetingEmailProps {
  fullName: string;
  message: string;
  content?: string;
  link?: string;
}

export async function GreetingEmail({
  fullName,
  message,
  content,
  link,
}: GreetingEmailProps) {
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#f0f4ff",
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
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <tbody>
          {/* Header */}
          <tr>
            <td
              style={{
                background: "linear-gradient(90deg, #4f46e5, #3b82f6)",
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
                  color: "#1e3a8a",
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
                  color: "#374151",
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
                      backgroundColor: "#4f46e5",
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
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e0e7ff",
                    borderRadius: "10px",
                    padding: "16px",
                    fontSize: "15px",
                    lineHeight: "1.6",
                    color: "#1e40af",
                    marginBottom: "24px",
                  }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}

              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                If you have any questions or didn’t request this email, please
                ignore it or contact our support team.
              </p>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                backgroundColor: "#f9fafb",
                textAlign: "center",
                padding: "14px",
                fontSize: "12px",
                color: "#94a3b8",
              }}
            >
              © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME}. All rights reserved.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
