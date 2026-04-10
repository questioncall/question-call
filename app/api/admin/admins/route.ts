import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Invalid input data. Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "ADMIN",
    });

    return NextResponse.json(
      { message: "Admin created successfully", adminId: newAdmin._id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Admin Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
