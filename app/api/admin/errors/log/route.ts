import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/error-logging";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    await logError(message, {
      stack,
      context,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging error:", error);
    return NextResponse.json(
      { error: "Failed to log error" },
      { status: 500 }
    );
  }
}