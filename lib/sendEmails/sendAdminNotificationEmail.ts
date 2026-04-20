import resend from "@/lib/resend/resend";
import { APP_NAME } from "@/lib/constants";

interface SendAdminNotificationEmailParams {
  email: string;
  fullName: string;
  role: "ADMIN" | "MASTER_ADMIN";
  action: "created" | "promoted";
  promotedBy?: string;
}

export async function sendAdminNotificationEmail({
  email,
  fullName,
  role,
  action,
  promotedBy,
}: SendAdminNotificationEmailParams) {
  try {
    const appName = APP_NAME;
    const isPromotion = action === "promoted";
    
    const subject = isPromotion
      ? `You've been promoted to ${role === "MASTER_ADMIN" ? "Master Admin" : "Admin"} on ${appName}`
      : `You've been added as an Admin on ${appName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #1f766e, #0f5c55); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: white; font-size: 24px; font-weight: bold;">${appName.charAt(0)}</span>
              </div>
              <h1 style="color: #0f2e2a; font-size: 24px; margin: 0 0 8px 0;">
                ${isPromotion ? "Congratulations! 🎉" : "Welcome!"}
              </h1>
              <p style="color: #4a7a74; font-size: 16px; margin: 0;">
                You've been ${action} as an ${role === "MASTER_ADMIN" ? "Master Admin" : "Admin"} on ${appName}
              </p>
            </div>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #166534; margin: 0; font-size: 14px;">
                <strong>Role:</strong> ${role === "MASTER_ADMIN" ? "Master Admin" : "Admin"}<br>
                ${promotedBy ? `<strong>Promoted by:</strong> ${promotedBy}` : ""}
              </p>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">
              You now have access to the admin panel. You can manage users, transactions, withdrawals, and platform settings.
            </p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://questionhub.com.np"}/admin" style="display: inline-block; background: linear-gradient(135deg, #1f766e, #0f5c55); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Go to Admin Panel
              </a>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center;">
              If you didn't expect this email, please contact the master admin immediately.
            </p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: `${appName} <no-reply@siddhantyadav.com.np>`,
      to: email,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    console.log("Admin notification email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Exception sending admin notification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
