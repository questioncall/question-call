import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyAccessToken, TokenPayload } from "@/lib/mobile-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Get authenticated user from either session cookies (web) or Bearer token (mobile)
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(request?: Request): Promise<{
  id: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  email: string;
  name: string;
  isSuspended: boolean;
} | null> {
  // Try Bearer token first (mobile)
  if (request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const tokenPayload = verifyAccessToken(token);

      if (tokenPayload) {
        // Verify user still exists and is not suspended
        await connectToDatabase();
        const user = await User.findById(tokenPayload.userId).select(
          "isSuspended",
        );

        if (user && !user.isSuspended) {
          return {
            id: tokenPayload.userId,
            role: tokenPayload.role,
            email: tokenPayload.email,
            name: tokenPayload.name,
            isSuspended: false,
          };
        }
      }
      // If Bearer token is invalid/expired, fall through to session auth
    }
  }

  // Fall back to session auth (web)
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    // Verify user is not suspended
    await connectToDatabase();
    const user = await User.findById(session.user.id).select("isSuspended");

    if (user && !user.isSuspended) {
      return {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email || "",
        name: session.user.name || "User",
        isSuspended: false,
      };
    }
  }

  return null;
}

/**
 * Get authenticated user ID from either session cookies (web) or Bearer token (mobile)
 * Returns null if not authenticated
 */
export async function getAuthenticatedUserId(
  request?: Request,
): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  return user?.id || null;
}

/**
 * Check if user is authenticated and return role, null if not
 */
export async function getAuthenticatedUserRole(
  request?: Request,
): Promise<"STUDENT" | "TEACHER" | "ADMIN" | null> {
  const user = await getAuthenticatedUser(request);
  return user?.role || null;
}
