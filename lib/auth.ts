import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import type { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { connectToDatabase } from "@/lib/mongodb";
import { getProfilePath, getUserHandle } from "@/lib/user-paths";
import User, { type UserRecord, type UserRole } from "@/models/User";

const defaultPathByRole: Record<UserRole, string> = {
  STUDENT: "/",
  TEACHER: "/",
  ADMIN: "/admin/settings",
};

export function getDefaultPath(role?: UserRole) {
  if (!role) {
    return "/";
  }

  return defaultPathByRole[role];
}

export { getProfilePath, getUserHandle };

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("decryption operation failed") ||
        error.name === "JWEDecryptionFailed")
    ) {
      return null;
    }

    throw error;
  }
}

type WorkspaceUserRecord = Pick<
  UserRecord,
  "name" | "email" | "username" | "role" | "userImage"
>;

export async function getWorkspaceUser(sessionUser: Session["user"]) {
  await connectToDatabase();

  const dbUser = await User.findById(sessionUser.id)
    .select("name email username role userImage")
    .lean<WorkspaceUserRecord | null>();

  return {
    id: sessionUser.id,
    name: dbUser?.name ?? sessionUser.name ?? "",
    email: dbUser?.email ?? sessionUser.email ?? "",
    username: dbUser?.username ?? sessionUser.username ?? "",
    role: dbUser?.role ?? sessionUser.role,
    userImage: dbUser?.userImage ?? "",
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(
        credentials: { email: string; password: string } | undefined,
      ): Promise<
        {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          username?: string;
          isMasterAdmin?: boolean;
        } | null
      > {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({ email }).select("+passwordHash");

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          isMasterAdmin: user.isMasterAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.isMasterAdmin = (user as any).isMasterAdmin;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role as UserRole;
        session.user.username =
          typeof token.username === "string" ? token.username : undefined;
        session.user.isMasterAdmin = token.isMasterAdmin as boolean;
      }

      return session;
    },
  },
};
