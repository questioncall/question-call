import "server-only";

import { APP_NAME } from "@/lib/constants";

const FALLBACK_FROM_EMAIL = "no-reply@questioncall.com";

export function getResendFrom() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || FALLBACK_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME?.trim() || APP_NAME;

  return `${fromName} <${fromEmail}>`;
}
