import { NextResponse } from "next/server";

import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Admin gate for the mobile `/api/mobile/admin/*` namespace.
 *
 * Mirrors the web admin gate (`getServerSession` + `role === "ADMIN"`) but for
 * the mobile bearer-token world: the web admin routes authenticate via the
 * NextAuth cookie and can't see the mobile JWT, so mobile admin endpoints live
 * under their own namespace and use this helper instead.
 *
 * The JWT role claim is trustworthy (signed with NEXTAUTH_SECRET), but we still
 * re-read the user from the DB so a demoted or suspended admin loses access
 * immediately rather than at the 15-minute token expiry.
 */
export type MobileAdminGate =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireMobileAdmin(request: Request): Promise<MobileAdminGate> {
  const payload = await authenticateMobileRequest(request);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  await connectToDatabase();
  const user = (await User.findById(payload.userId)
    .select("role isSuspended")
    .lean()) as { role?: string; isSuspended?: boolean } | null;

  if (!user || user.isSuspended) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: payload.userId };
}
