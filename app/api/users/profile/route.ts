import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional().nullable(),
  userImage: z.string().url().optional().nullable(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = profileSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Convert nulls to undefined to avoid overwriting existing properties with true nulls 
    // if mongoose schema isn't explicitly configured to allow null.
    // If user specifically clears a field, we may actually want to save empty string or array.
    const updateData: Record<string, any> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio || "";
    if (parsed.data.userImage !== undefined) updateData.userImage = parsed.data.userImage || "";
    if (parsed.data.skills !== undefined) updateData.skills = parsed.data.skills;
    if (parsed.data.interests !== undefined) updateData.interests = parsed.data.interests;

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { 
        message: "Profile updated successfully", 
        user: {
          name: updatedUser.name,
          bio: updatedUser.bio,
          userImage: updatedUser.userImage,
          skills: updatedUser.skills,
          interests: updatedUser.interests,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
