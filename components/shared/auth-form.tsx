"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

import { EyeIcon, EyeOffIcon } from "lucide-react";

import { getSignInPath, getSignUpPath } from "@/lib/user-paths";
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
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
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

    if (isRegister && !termsAgreed) {
      setFormError("You must agree to the terms and policy to register.");
      return;
    }

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
          router.replace(getSignInPath());
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
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegister ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">Name</span>
            <input
              required
              autoComplete="name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#405f31] focus:ring-1 focus:ring-[#405f31] placeholder:text-gray-400"
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              type="text"
              value={name}
            />
          </label>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-gray-800">Email address</span>
          <input
            required
            autoComplete="email"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#405f31] focus:ring-1 focus:ring-[#405f31] placeholder:text-gray-400"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            type="email"
            value={email}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-gray-800">Password</span>
          <div className="relative">
            <input
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-[#405f31] focus:ring-1 focus:ring-[#405f31] placeholder:text-gray-400"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "Name" : "At least 8 characters"}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </label>

        {isRegister && (
          <label className="flex items-center space-x-2.5 mt-2">
            <input 
              type="checkbox" 
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#405f31] focus:ring-[#405f31]" 
            />
            <span className="text-xs text-gray-700">
              I agree to the <span className="underline cursor-pointer">terms & policy</span>
            </span>
          </label>
        )}

        {activeError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {activeError}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-[#405f31] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#344b27] disabled:cursor-not-allowed disabled:opacity-70 mt-4"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? isRegister
              ? "Signing up..."
              : "Signing in..."
            : isRegister
              ? "Signup"
              : "Sign In"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm font-medium text-gray-800">
        {isRegister ? (
          <>
            Have an account?{" "}
            <Link href={getSignInPath()} className="text-blue-600 hover:text-blue-700 ml-1 font-bold">
              Sign In
            </Link>
            <div className="mt-4 text-sm text-gray-500">
              Registering differently?{" "}
              <Link href={getSignUpPath(role === "STUDENT" ? "TEACHER" : "STUDENT")} className="font-semibold text-gray-900 underline hover:text-gray-700">
                Switch Role
              </Link>
            </div>
          </>
        ) : (
          <>
            Don't have an account?{" "}
            <Link href={getSignUpPath("STUDENT")} className="text-blue-600 hover:text-blue-700 ml-1 font-bold">
              Sign Up
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Want to teach instead?{" "}
              <Link href={getSignUpPath("TEACHER")} className="font-semibold text-gray-900 underline hover:text-gray-700">
                Register as teacher
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
