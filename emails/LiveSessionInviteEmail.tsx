import * as React from "react";

interface LiveSessionInviteEmailProps {
  studentName: string;
  courseTitle: string;
  sessionTitle: string;
  instructorName: string;
  scheduledLabel: string;
  durationLabel: string;
  zoomLink?: string | null;
}

export function LiveSessionInviteEmail({
  studentName,
  courseTitle,
  sessionTitle,
  instructorName,
  scheduledLabel,
  durationLabel,
  zoomLink,
}: LiveSessionInviteEmailProps) {
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#f5f7fb",
        padding: "40px 0",
        color: "#1f2937",
      }}
    >
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: "620px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                padding: "28px 32px",
                background:
                  "linear-gradient(135deg, #114B5F 0%, #1A936F 50%, #88D498 100%)",
                color: "#ffffff",
              }}
            >
              <div style={{ fontSize: "13px", letterSpacing: "1.5px", textTransform: "uppercase", opacity: 0.9 }}>
                Question Hub Live Class
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "10px" }}>
                {sessionTitle}
              </div>
              <div style={{ fontSize: "15px", marginTop: "8px", opacity: 0.92 }}>
                {courseTitle}
              </div>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "32px" }}>
              <p style={{ fontSize: "16px", lineHeight: 1.7, margin: 0 }}>
                Hi {studentName.split(" ")[0] || "there"},
              </p>
              <p style={{ fontSize: "16px", lineHeight: 1.7, marginTop: "16px" }}>
                Your live class is scheduled. Here are the details for your upcoming session.
              </p>

              <div
                style={{
                  marginTop: "24px",
                  borderRadius: "16px",
                  border: "1px solid #dbe4f0",
                  backgroundColor: "#f8fafc",
                  padding: "20px 22px",
                }}
              >
                <p style={{ margin: "0 0 10px", fontSize: "15px" }}>
                  <strong>Session:</strong> {sessionTitle}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: "15px" }}>
                  <strong>Instructor:</strong> {instructorName}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: "15px" }}>
                  <strong>Date &amp; time:</strong> {scheduledLabel}
                </p>
                <p style={{ margin: 0, fontSize: "15px" }}>
                  <strong>Duration:</strong> {durationLabel}
                </p>
              </div>

              {zoomLink ? (
                <div style={{ marginTop: "26px" }}>
                  <a
                    href={zoomLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      backgroundColor: "#114B5F",
                      color: "#ffffff",
                      padding: "14px 22px",
                      borderRadius: "999px",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: "15px",
                    }}
                  >
                    Join Live Class
                  </a>
                </div>
              ) : null}

              <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#64748b", marginTop: "28px" }}>
                If your Zoom link changes, we&apos;ll send an updated notification inside the platform.
              </p>
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: "16px 24px",
                textAlign: "center",
                fontSize: "12px",
                color: "#94a3b8",
                backgroundColor: "#f8fafc",
              }}
            >
              © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || "Question Hub"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
