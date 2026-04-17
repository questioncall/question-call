import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notice from "@/models/Notice";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    const notices = await Notice.find().sort({ createdAt: -1 });
    return NextResponse.json(notices);
  } catch (error) {
    console.error("[GET /api/admin/notices]", error);
    return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const { title, body, type, targetAudience, targetEmails, isActive, expiresAt } = json;

    if (!title || !body || !type || !targetAudience) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const notice = await Notice.create({
      title,
      body,
      type,
      targetAudience,
      targetEmails: targetAudience === "SPECIFIC" ? targetEmails : [],
      isActive: isActive ?? true,
      expiresAt: expiresAt || null,
    });

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/notices]", error);
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 });
  }
}
