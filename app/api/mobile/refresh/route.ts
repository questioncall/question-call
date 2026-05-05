import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  verifyRefreshToken,
  generateAccessToken,
  TokenPayload,
} from "@/lib/mobile-auth";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type RefreshRequest = {
  refreshToken: string;
};

/**
 * POST /api/mobile/refresh
 *
 * Validate refresh token and return new access token.
 * Used when access token expires but refresh token is still valid.
 */
export async function POST(request: Request) {
  try {
    const body: RefreshRequest = await request.json();

    if (!body.refreshToken) {
      return NextResponse.json(
        { error: "refreshToken required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Verify refresh token (checks DB for revocation)
    const { userId, valid } = await verifyRefreshToken(body.refreshToken);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    // Fetch user to get current role and email
    const user = await User.findById(userId).select(
      "role email name isSuspended",
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check suspension
    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({ accessToken }, { status: 200 });
  } catch (error) {
    console.error("Mobile refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
