import * as React from "react";
import { APP_NAME } from "@/lib/constants";

interface ReferralInviteEmailProps {
  referrerName: string;
  referralLink: string;
  message?: string;
}

export function ReferralInviteEmail({
  referrerName,
  referralLink,
  message,
}: ReferralInviteEmailProps) {
  const appName = APP_NAME;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#f8fafc' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #1f766e, #0f5c55)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>{appName.charAt(0)}</span>
          </div>
          <h1 style={{ color: '#0f2e2a', fontSize: '24px', margin: '0 0 8px 0' }}>
            You're invited! 🎉
          </h1>
          <p style={{ color: '#4a7a74', fontSize: '16px', margin: '0' }}>
            {referrerName} thinks you'd love {appName}
          </p>
</div>

        {message && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
            <p style={{ color: "#166534", margin: "0", fontSize: "14px", fontStyle: "italic" }}>
              &ldquo;{message}&rdquo;
            </p>
          </div>
        )}

        <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 8px 0' }}>
            <strong>What you'll get:</strong>
          </p>
          <ul style={{ color: '#64748b', fontSize: '14px', margin: '0', paddingLeft: '20px' }}>
            <li>Bonus questions to ask for free</li>
            <li>Access to AI-generated quizzes</li>
            <li>Learn from verified teachers</li>
            <li>Join a growing learning community</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center' }}>
          <a
            href={referralLink}
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, #1f766e, #0f5c55)', color: 'white', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '16px' }}
          >
            Join {appName} Now
          </a>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '12px' }}>
            Or copy this link: {referralLink}
          </p>
        </div>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
        © {new Date().getFullYear()} {appName}. All rights reserved.
      </p>
    </div>
  );
}
