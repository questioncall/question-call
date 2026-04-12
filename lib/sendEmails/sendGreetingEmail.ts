import resend from "@/lib/resend/resend";
import { GreetingEmail } from "@/../emails/GreetingEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendGreetingEmail(
  email: string,
  fullName: string,
  message: string,
  link?: string,
  content?: string
): Promise<ApiResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <no-reply@siddhantyadav.com.np>`,
      to: email,
      subject: `Greeting from ${process.env.NEXT_PUBLIC_APP_NAME}`,
      react: GreetingEmail({ fullName, message, link, content }),
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
