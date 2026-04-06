import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { connectToDatabase } from "@/lib/mongodb";
import User, { type UserRole } from "@/models/User";

const defaultPathByRole: Record<UserRole, string> = {
  STUDENT: "/",
  TEACHER: "/",
  ADMIN: "/admin/pricing",
};

const profilePathByRole: Record<UserRole, string> = {
  STUDENT: "/student/profile",
  TEACHER: "/teacher/profile",
  ADMIN: "/admin/pricing",
};

export function getDefaultPath(role?: UserRole) {
  if (!role) {
    return "/";
  }

  return defaultPathByRole[role];
}

export function getProfilePath(role?: UserRole) {
  if (!role) {
    return getDefaultPath(role);
  }

  return profilePathByRole[role];
}

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

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
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
      async authorize(credentials: { email: string; password: string } | undefined) : Promise<{ id: string; name: string; email: string; role: UserRole } | null> {
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role as UserRole;
      }

      return session;
    },
  },
};
