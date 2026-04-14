import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import VerificationToken from "@/models/VerificationToken";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    await connectToDatabase();

    const record = await VerificationToken.findOne({ email });

    if (!record) {
      return NextResponse.json({ error: "No pending verification found or code expired." }, { status: 404 });
    }

    if (record.code !== code) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    // Optional: we can delete the record here to prevent reuse, but since signup expects it to be verified,
    // we can either delete it and set a flag, or we delete it in the /api/auth/register route.
    // To ensure the actual registration validates the email, we'll confirm it works here so the client proceeds.

    return NextResponse.json({ success: true, message: "Code verified." });
  } catch (error) {
    console.error("[POST /api/auth/verify-email/confirm]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
