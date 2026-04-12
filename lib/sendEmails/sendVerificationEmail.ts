import resend from "@/lib/resend/resend";
import { VerificationEmail } from "@/../emails/VerificationEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendVerificationEmail(
  email: string,
  verificationCode: string,
  fullName: string
): Promise<ApiResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <no-reply@siddhantyadav.com.np>`,
      to: email,
      subject: `Email Verification`,
      react: VerificationEmail({ fullName, verificationCode }),
    });

    if (error) {
      console.error("Resend API returned an error:", error);
      return {
        success: false,
        message: "Failed to send verification email",
        error: error.message || "Unknown Resend API error",
        data: null,
      };
    }
    console.log("Email sent successfully!", data);
    return {
      success: true,
      message: "Verification email sent successfully",
      error: null,
      data: data,
    };
  } catch (error) {
    console.error("Exception during email sending:", error);
    return {
      success: false,
      message: "Failed to send verification email",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
