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
      return NextResponse.json({ error: "No pending password reset found or code expired." }, { status: 404 });
    }

    if (record.code !== code) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Code verified." });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password/verify]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
