import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { PaymentConfigClient } from "./payment-config-client";

export default async function AdminPaymentConfigPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <PaymentConfigClient />;
}
