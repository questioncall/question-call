import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "KHALTI_NOT_IMPLEMENTED",
      message:
        "Khalti course verification is not implemented in this repo yet. The existing codebase only contains eSewa payment integration.",
    },
    { status: 501 },
  );
}
