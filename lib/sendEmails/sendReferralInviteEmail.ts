import resend from "@/lib/resend/resend";
import { getResendFrom } from "@/lib/email";
import { ReferralInviteEmail } from "@/emails/ReferralInviteEmail";
import { APP_NAME } from "@/lib/constants";

interface SendReferralInviteEmailParams {
  email: string;
  referrerName: string;
  referralLink: string;
  message?: string;
}

export async function sendReferralInviteEmail({
  email,
  referrerName,
  referralLink,
  message,
}: SendReferralInviteEmailParams) {
  try {
    const appName = APP_NAME;

    const { data, error } = await resend.emails.send({
      from: getResendFrom(),
      to: email,
      subject: `${referrerName} invited you to join ${appName}!`,
      react: ReferralInviteEmail({
        referrerName,
        referralLink,
        message,
      }),
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending referral invite email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
