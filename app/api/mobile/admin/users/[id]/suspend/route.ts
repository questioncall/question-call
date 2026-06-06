import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { toggleUserSuspension } from "@/lib/admin/user-suspension";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/admin/users/[id]/suspend
 *
 * Mobile mirror of `POST /api/admin/users/[id]/suspend` — toggles suspension and
 * runs the same teacher channel/question side-effects via the shared service.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const result = await toggleUserSuspension(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      message: result.message,
      isSuspended: result.isSuspended,
    });
  } catch (error) {
    console.error("POST /api/mobile/admin/users/[id]/suspend error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
