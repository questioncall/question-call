"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

import {
  clearAuthState,
  registerUser,
} from "@/store/features/auth/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type AuthFormProps = {
  mode: "login" | "register";
  role?: "STUDENT" | "TEACHER";
  callbackUrl?: string;
};

const defaultPathByRole = {
  STUDENT: "/",
  TEACHER: "/",
} as const;

export function AuthForm({ mode, role, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { registerError, registerStatus } = useAppSelector(
    (state) => state.auth,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const isRegister = mode === "register";
  const isSubmitting =
    (isRegister && registerStatus === "pending") || isSigningIn;
  const activeError = isRegister ? registerError ?? formError : formError;

  useEffect(() => {
    dispatch(clearAuthState());
  }, [dispatch, mode, role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    dispatch(clearAuthState());

    try {
      if (isRegister && role) {
        const registerResult = await dispatch(
          registerUser({
            name,
            email,
            password,
            role,
          }),
        );

        if (registerUser.rejected.match(registerResult)) {
          return;
        }

        setSuccess("Account created. Signing you in now...");
        setIsSigningIn(true);

        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: defaultPathByRole[role],
        });

        if (signInResult?.error) {
          router.replace("/login");
          router.refresh();
          return;
        }

        router.replace(signInResult?.url ?? defaultPathByRole[role]);
        router.refresh();
        return;
      }

      setIsSigningIn(true);

      const signInResult = await signIn("credentials", {
        callbackUrl: callbackUrl || "/",
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error("Invalid email or password.");
      }

      router.replace(signInResult?.url ?? "/");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.";
      setFormError(message);
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow text-xs text-[#6d6257]">
          {isRegister
            ? `${role === "STUDENT" ? "Student" : "Teacher"} Registration`
            : "Shared Login"}
        </p>
        <h2 className="headline text-3xl font-semibold text-[#1e1914]">
          {isRegister ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-sm leading-6 text-[#6d6257]">
          {isRegister
            ? "We will get your portal ready with role-aware routing and Mongo-backed credentials."
            : "Use the same login screen for students, teachers, and later admin access."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegister ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#2d251f]">Full name</span>
            <input
              required
              autoComplete="name"
              className="w-full rounded-2xl border border-[#281f161f] bg-[#fffaf4] px-4 py-3 text-sm outline-none transition focus:border-[#df6a34] focus:ring-4 focus:ring-[#df6a3422]"
              onChange={(event) => setName(event.target.value)}
              placeholder="Siddhant Sharma"
              type="text"
              value={name}
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#2d251f]">Email address</span>
          <input
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-[#281f161f] bg-[#fffaf4] px-4 py-3 text-sm outline-none transition focus:border-[#df6a34] focus:ring-4 focus:ring-[#df6a3422]"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            type="email"
            value={email}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#2d251f]">Password</span>
          <input
            required
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="w-full rounded-2xl border border-[#281f161f] bg-[#fffaf4] px-4 py-3 text-sm outline-none transition focus:border-[#df6a34] focus:ring-4 focus:ring-[#df6a3422]"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            type="password"
            value={password}
          />
        </label>

        {activeError ? (
          <div className="rounded-2xl border border-[#d7464622] bg-[#fff1f1] px-4 py-3 text-sm text-[#a13c3c]">
            {activeError}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-[#1f766e22] bg-[#eefaf7] px-4 py-3 text-sm text-[#16564f]">
            {success}
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-[#1e1914] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#352c24] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? isRegister
              ? "Creating account..."
              : "Signing in..."
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <div className="space-y-3 rounded-3xl border border-[#281f1614] bg-[#fff8ef] p-4 text-sm text-[#5c544c]">
        {isRegister ? (
          <>
            <p>
              Already have an account?{" "}
              <Link className="font-semibold text-[#1e1914] underline decoration-[#df6a34] underline-offset-4" href="/login">
                Sign in here
              </Link>
            </p>
            <p>
              Need the other portal instead?{" "}
              <Link
                className="font-semibold text-[#1e1914] underline decoration-[#1f766e] underline-offset-4"
                href={role === "STUDENT" ? "/register/teacher" : "/register/student"}
              >
                Switch registration type
              </Link>
            </p>
          </>
        ) : (
          <>
            <p>
              New here?{" "}
              <Link className="font-semibold text-[#1e1914] underline decoration-[#df6a34] underline-offset-4" href="/register/student">
                Register as a student
              </Link>
            </p>
            <p>
              Solving questions instead?{" "}
              <Link className="font-semibold text-[#1e1914] underline decoration-[#1f766e] underline-offset-4" href="/register/teacher">
                Register as a teacher
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
