"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState, Suspense } from "react";

import { EyeIcon, EyeOffIcon } from "lucide-react";

import { LegalDialog } from "@/components/shared/legal-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <AuthFormInner mode={mode} role={role} callbackUrl={callbackUrl} />
    </Suspense>
  );
}

function AuthFormInner({ mode, role, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCodeRaw = searchParams.get("ref");
  const referralCodeFromUrl = refCodeRaw ? refCodeRaw.toUpperCase().trim() : undefined;
  
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

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verificationStep, setVerificationStep] = useState<"idle" | "requesting" | "pending_otp" | "verifying">("idle");

  const isRegister = mode === "register";
  const isSubmitting =
    (isRegister && registerStatus === "pending") || isSigningIn;
  const activeError = isRegister ? registerError ?? formError : formError;

  useEffect(() => {
    dispatch(clearAuthState());
  }, [dispatch, mode, role]);

  async function handleSendOtp() {
    if (!email) {
      setFormError("Please enter your email first.");
      return;
    }
    setFormError(null);
    setSuccess(null);
    setVerificationStep("requesting");
    try {
      const res = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerificationStep("pending_otp");
      setSuccess("Verification code sent! Please check your inbox.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to send verification code.",
      );
      setVerificationStep("idle");
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode) {
      setFormError("Please enter the code.");
      return;
    }
    setFormError(null);
    setSuccess(null);
    setVerificationStep("verifying");
    try {
      const res = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerificationStep("idle");
      setIsEmailVerified(true);
      setSuccess("Email verified successfully! You can now complete your registration.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to verify the email code.",
      );
      setVerificationStep("pending_otp");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    dispatch(clearAuthState());
    let keepSubmitting = false;

    if (isRegister && !termsAgreed) {
      setFormError("You must agree to the terms and policy to register.");
      return;
    }

    if (isRegister && !isEmailVerified) {
      setFormError("You must verify your email before registering.");
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
            referralCode: referralCodeFromUrl,
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
          keepSubmitting = true;
          router.replace(getSignInPath());
          router.refresh();
          return;
        }

        keepSubmitting = true;
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

      keepSubmitting = true;
      router.replace(signInResult?.url ?? "/");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.";
      setFormError(message);
    } finally {
      if (!keepSubmitting) {
        setIsSigningIn(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegister ? (
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground" htmlFor="auth-name">
              Name
            </Label>
            <Input
              id="auth-name"
              required
              autoComplete="name"
              className="h-11 rounded-xl bg-background px-3 py-2.5 text-sm shadow-sm md:text-sm"
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              type="text"
              value={name}
            />
          </div>
        ) : null}

        {isRegister && referralCodeFromUrl ? (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">
            <span>🎉 Referred by a friend</span>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground" htmlFor="auth-email">
            Email address
          </Label>
          <div className="relative flex gap-2">
            <Input
              id="auth-email"
              required
              disabled={isRegister && (verificationStep !== "idle" || isEmailVerified)}
              autoComplete="email"
              className="h-11 w-full rounded-xl bg-background px-3 py-2.5 text-sm shadow-sm md:text-sm"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              type="email"
              value={email}
            />
            {isRegister && !isEmailVerified && (
              <Button 
                type="button" 
                variant="outline"
                className="h-11 shrink-0 px-4"
                onClick={handleSendOtp}
                disabled={verificationStep === "requesting" || email.trim().length === 0}
              >
                {verificationStep === "requesting" ? "Sending..." : verificationStep === "pending_otp" ? "Resend" : "Verify Email"}
              </Button>
            )}
            {isRegister && isEmailVerified && (
              <div className="flex h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-emerald-600">
                Verified
              </div>
            )}
          </div>
        </div>

        {isRegister && (verificationStep === "pending_otp" || verificationStep === "verifying") && !isEmailVerified && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
            <Label className="text-sm font-semibold text-foreground" htmlFor="auth-otp">
              Verification Code
            </Label>
            <div className="flex gap-2">
              <Input
                id="auth-otp"
                className="h-11 rounded-xl bg-background px-3 py-2.5 text-sm font-mono shadow-sm md:text-sm"
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="000000"
                type="text"
                maxLength={6}
                value={otpCode}
              />
              <Button 
                type="button" 
                className="h-11 shrink-0"
                onClick={handleVerifyOtp}
                disabled={verificationStep === "verifying" || otpCode.length < 6}
              >
                {verificationStep === "verifying" ? "Verifying..." : "Confirm Code"}
              </Button>
            </div>
          </div>
        )}

        {(!isRegister || isEmailVerified) && (
        <>
          <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground" htmlFor="auth-password">
            Password
          </Label>
          <div className="relative">
            <Input
              id="auth-password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="h-11 rounded-xl bg-background px-3 py-2.5 pr-10 text-sm shadow-sm md:text-sm"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "Create a password" : "Enter your password"}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {isRegister && (
          <div className="mt-2 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="auth-terms"
                checked={termsAgreed}
                onCheckedChange={(checked) => setTermsAgreed(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label className="text-xs leading-5 text-muted-foreground" htmlFor="auth-terms">
                  I agree to the legal terms required for using this platform.
                </Label>
                <LegalDialog
                  triggerClassName="text-xs font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                  triggerLabel="Terms and Policies"
                />
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {activeError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {activeError}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
            {success}
          </div>
        ) : null}

        <Button
          className="mt-4 h-11 w-full rounded-xl text-sm font-semibold shadow-sm"
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
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-muted/20 px-5 py-4 text-center text-sm text-muted-foreground">
        {isRegister ? (
          <>
            Have an account?{" "}
            <Link href={getSignInPath()} className="ml-1 font-semibold text-primary hover:underline">
              Sign In
            </Link>
            <div className="mt-3 text-sm text-muted-foreground">
              Registering differently?{" "}
              <Link
                href={getSignUpPath(role === "STUDENT" ? "TEACHER" : "STUDENT")}
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Switch Role
              </Link>
            </div>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href={getSignUpPath("STUDENT")} className="ml-1 font-semibold text-primary hover:underline">
              Sign Up
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Want to teach instead?{" "}
              <Link
                href={getSignUpPath("TEACHER")}
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Register as teacher
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
