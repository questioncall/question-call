import { DefaultSession } from "next-auth";

type AppRole = "STUDENT" | "TEACHER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      username?: string;
      isMasterAdmin?: boolean;
    };
  }

  interface User {
    id: string;
    role: AppRole;
    username?: string;
    isMasterAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    username?: string;
    isMasterAdmin?: boolean;
  }
}

export {};
