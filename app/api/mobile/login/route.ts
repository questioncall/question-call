import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

import { getGoogleAudiences } from "@/lib/google-audiences";
import { connectToDatabase } from "@/lib/mongodb";
import { generateAccessToken, generateRefreshToken } from "@/lib/mobile-auth";
import User from "@/models/User";

// Google OAuth2 client for validating Google ID tokens
const googleClient = new OAuth2Client();

export const dynamic = "force-dynamic";

type LoginRequest = {
  email?: string;
  password?: string;
  googleIdToken?: string;
};

/**
 * POST /api/mobile/login
 *
 * Authenticate mobile app user with email/password or Google ID token.
 * Returns JWT access and refresh tokens.
 */
export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json();

    if (!body.email && !body.googleIdToken) {
      return NextResponse.json(
        { error: "Email or googleIdToken required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    let user;
    let email: string;

    // ─── Email/Password Login ───
    if (body.email && body.password) {
      email = body.email.toLowerCase().trim();

      user = await User.findOne({ email }).select("+passwordHash");

      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      const passwordMatches = await bcrypt.compare(
        body.password,
        user.passwordHash,
      );

      if (!passwordMatches) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }
    }
    // ─── Google OAuth Login ───
    else if (body.googleIdToken) {
      try {
        const googleAudiences = getGoogleAudiences();

        if (!googleAudiences.length) {
          console.error(
            "Google login misconfigured: missing GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, and GOOGLE_IOS_CLIENT_ID",
          );
          return NextResponse.json(
            { error: "Google sign-in is not configured" },
            { status: 500 },
          );
        }

        const ticket = await googleClient.verifyIdToken({
          idToken: body.googleIdToken,
          audience: googleAudiences,
        });

        const payload = ticket.getPayload();
        if (!payload?.email) {
          return NextResponse.json(
            { error: "Invalid Google ID token" },
            { status: 401 },
          );
        }

        email = payload.email.toLowerCase();

        user = await User.findOne({ email });

        if (!user) {
          return NextResponse.json(
            { error: "User not found. Register first." },
            { status: 404 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid Google ID token" },
          { status: 401 },
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // ─── Check Soft-Deletion ───
    // A deleted account can only be recovered via the Forgot Password OTP flow,
    // not by logging straight back in.
    if (user.isDeleted) {
      return NextResponse.json(
        {
          error:
            "This account is scheduled for deletion. To recover it, reset your password using 'Forgot Password'.",
        },
        { status: 403 },
      );
    }

    // ─── Check Suspension ───
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // ─── Generate Tokens ───
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const refreshToken = await generateRefreshToken(user._id.toString(), {
      userAgent: request.headers.get("user-agent") || undefined,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined,
    });

    // ─── Return Response ───
    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isSuspended: user.isSuspended,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
