import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";

export const dynamic = "force-dynamic";

/** DELETE /api/mobile/admin/questions/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    await connectToDatabase();
    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/mobile/admin/questions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
