import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { generateUniqueUsername } from "@/lib/user-directory";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";

function isAllowedRole(value: string): value is "STUDENT" | "TEACHER" {
  return value === "STUDENT" || value === "TEACHER";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const name = payload?.name?.trim();
    const email = payload?.email?.trim().toLowerCase();
    const password = payload?.password;
    const role = payload?.role;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: "Name, email, password, and role are required." },
        { status: 400 },
      );
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        { message: "Only student and teacher registrations are supported here." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account already exists with that email address." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const username = await generateUniqueUsername({ email, name });

    const user = await User.create({
      name,
      email,
      username,
      passwordHash,
      role,
      points: 0,
      walletBalance: 0,
      totalAnswered: 0,
      isMonetized: false,
      overallScore: 0,
    });

    // Auto-grant 3-day free trial for students via Transaction record
    if (role === "STUDENT") {
      await Transaction.create({
        userId: user._id,
        type: "SUBSCRIPTION_MANUAL",
        amount: 0,
        status: "COMPLETED",
        planSlug: "free",
        transactionId: `TRIAL_${user._id}`,
        transactorName: name,
      });
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration failed:", error);

    return NextResponse.json(
      { message: "Something went wrong while creating the account." },
      { status: 500 },
    );
  }
}
