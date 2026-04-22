import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { getUserHandle } from "@/lib/user-paths";

type AppRole = "STUDENT" | "TEACHER" | "ADMIN";

const defaultPathByRole: Record<AppRole, string> = {
  STUDENT: "/",
  TEACHER: "/",
  ADMIN: "/admin/settings",
};

const sessionCookieNames = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

function redirectToDefaultPath(request: NextRequest, role: AppRole) {
  return NextResponse.redirect(new URL(defaultPathByRole[role], request.url));
}

function redirectToProfilePath(
  request: NextRequest,
  token: {
    role?: AppRole;
    sub?: string | null;
    name?: string | null;
    email?: string | null;
    username?: string | null;
  },
) {
  if (token.role === "ADMIN") {
    return redirectToDefaultPath(request, "ADMIN");
  }

  const profileUrl = new URL(
    `/${getUserHandle({
      id: typeof token.sub === "string" ? token.sub : undefined,
      name: typeof token.name === "string" ? token.name : undefined,
      email: typeof token.email === "string" ? token.email : undefined,
      username: typeof token.username === "string" ? token.username : undefined,
    })}`,
    request.url,
  );

  return NextResponse.redirect(profileUrl);
}

function redirectToSignIn(request: NextRequest) {
  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

function requestHasSessionCookie(request: NextRequest) {
  return sessionCookieNames.some((cookieName) => request.cookies.has(cookieName));
}

function clearSessionCookies(response: NextResponse) {
  for (const cookieName of sessionCookieNames) {
    response.cookies.set(cookieName, "", {
      expires: new Date(0),
      path: "/",
    });
  }

  response.cookies.set("next-auth.callback-url", "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set("authjs.callback-url", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}

function resetBrokenSession(request: NextRequest) {
  const resetUrl = new URL(request.nextUrl.pathname, request.url);
  resetUrl.search = request.nextUrl.search;
  return clearSessionCookies(NextResponse.redirect(resetUrl));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = requestHasSessionCookie(request);

  let token = null;

  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    return resetBrokenSession(request);
  }

  if (hasSessionCookie && !token) {
    return resetBrokenSession(request);
  }

  const role = token?.role as AppRole | undefined;
  const isAuthEntryRoute =
    pathname === "/auth/signin" ||
    pathname.startsWith("/auth/signup/") ||
    pathname === "/login" ||
    pathname.startsWith("/register");

  if (isAuthEntryRoute && role) {
    return redirectToDefaultPath(request, role);
  }

  const isSharedProtectedRoute =
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/subscription" ||
    pathname.startsWith("/subscription/") ||
    pathname === "/wallet" ||
    pathname.startsWith("/wallet/") ||
    pathname === "/message" ||
    pathname.startsWith("/message/") ||
    pathname.startsWith("/channel/") ||
    pathname.startsWith("/ask/") ||
    pathname.startsWith("/leaderboard/");
  const isStudentRoute = pathname.startsWith("/student");
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute =
    isSharedProtectedRoute || isStudentRoute || isTeacherRoute || isAdminRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!role) {
    return redirectToSignIn(request);
  }

  if (isStudentRoute && role !== "STUDENT") {
    return redirectToProfilePath(request, token ?? {});
  }

  if (isTeacherRoute && role !== "TEACHER") {
    return redirectToProfilePath(request, token ?? {});
  }

  if (isAdminRoute && role !== "ADMIN") {
    return redirectToProfilePath(request, token ?? {});
  }

  if (isSharedProtectedRoute && role === "ADMIN") {
    return redirectToDefaultPath(request, role);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/settings/:path*",
    "/subscription/:path*",
    "/wallet/:path*",
    "/message/:path*",
    "/channel/:path*",
    "/ask/:path*",
    "/leaderboard/:path*",
    "/student/:path*",
    "/teacher/:path*",
    "/admin/:path*",
  ],
};

export default proxy;

 
