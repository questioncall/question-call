import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type AppRole = "STUDENT" | "TEACHER" | "ADMIN";

const defaultPathByRole: Record<AppRole, string> = {
  STUDENT: "/",
  TEACHER: "/",
  ADMIN: "/admin/pricing",
};

const profilePathByRole: Record<AppRole, string> = {
  STUDENT: "/student/profile",
  TEACHER: "/teacher/profile",
  ADMIN: "/admin/pricing",
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

function redirectToProfilePath(request: NextRequest, role: AppRole) {
  return NextResponse.redirect(new URL(profilePathByRole[role], request.url));
}

function redirectToHome(request: NextRequest) {
  const homeUrl = new URL("/", request.url);
  homeUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(homeUrl);
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

  if ((pathname === "/login" || pathname.startsWith("/register")) && role) {
    return redirectToDefaultPath(request, role);
  }

  const isStudentRoute = pathname.startsWith("/student");
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute = isStudentRoute || isTeacherRoute || isAdminRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!role) {
    return redirectToHome(request);
  }

  if (isStudentRoute && role !== "STUDENT") {
    return redirectToProfilePath(request, role);
  }

  if (isTeacherRoute && role !== "TEACHER") {
    return redirectToProfilePath(request, role);
  }

  if (isAdminRoute && role !== "ADMIN") {
    return redirectToProfilePath(request, role);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register/:path*", "/student/:path*", "/teacher/:path*", "/admin/:path*"],
};
