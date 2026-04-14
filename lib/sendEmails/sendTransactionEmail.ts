import resend from "@/lib/resend/resend";
import { TransactionAlertEmail } from "@/emails/TransactionAlertEmail";

export async function sendTransactionEmail(
  email: string,
  title: string,
  message: string,
  transactionId?: string,
  amount?: string,
  userEmail?: string,
) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <no-reply@siddhantyadav.com.np>`,
      to: email,
      subject: title,
      react: TransactionAlertEmail({ title, message, transactionId, amount, userEmail }),
    });

    if (error) {
      console.error("Resend API returned an error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Exception during transaction email sending:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
