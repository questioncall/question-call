import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "currentPassword and newPassword (min 8 chars) are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const user = await User.findById(authUser.id).select("passwordHash");
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "This account uses Google sign-in. Password change is not supported." },
        { status: 400 },
      );
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await User.findByIdAndUpdate(authUser.id, { $set: { passwordHash: newHash } });

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[POST /api/users/change-password]", error);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
