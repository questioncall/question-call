import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import RefreshTokenModel from "@/models/RefreshToken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "default-secret";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";

export type TokenPayload = {
  userId: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  email: string;
  name: string;
};

/**
 * Generate JWT access token (15 min expiry)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate JWT refresh token (30 day expiry) and store in DB
 */
export async function generateRefreshToken(
  userId: string,
  deviceInfo?: { userAgent?: string; ipAddress?: string },
): Promise<string> {
  await connectToDatabase();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const payload = {
    userId,
    type: "refresh",
  };

  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // Store refresh token in DB for revocation tracking
  await RefreshTokenModel.create({
    userId,
    token: refreshToken,
    expiresAt,
    deviceInfo,
  });

  return refreshToken;
}

/**
 * Verify access token from Bearer header
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify and validate refresh token (check DB for revocation)
 */
export async function verifyRefreshToken(
  token: string,
): Promise<{ userId: string; valid: boolean }> {
  await connectToDatabase();

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & {
      type: string;
    };

    if (decoded.type !== "refresh") {
      return { userId: "", valid: false };
    }

    // Check if token exists in DB and is not revoked
    const tokenRecord = await RefreshTokenModel.findOne({
      token,
      userId: decoded.userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenRecord) {
      return { userId: decoded.userId, valid: false };
    }

    return { userId: decoded.userId, valid: true };
  } catch {
    return { userId: "", valid: false };
  }
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await connectToDatabase();
  await RefreshTokenModel.updateOne({ token }, { revokedAt: new Date() });
}

/**
 * Authenticate Bearer token from Authorization header
 */
export async function authenticateMobileRequest(
  req: Request,
): Promise<TokenPayload | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}
