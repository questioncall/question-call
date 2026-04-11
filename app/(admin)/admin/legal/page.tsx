import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { LegalClient } from "./legal-client";

export default async function AdminLegalPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <LegalClient />;
}
