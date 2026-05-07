import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";

import { APP_NAME } from "@/lib/constants";
import { connectToDatabase } from "@/lib/mongodb";
import { generateUniqueUsername } from "@/lib/user-directory";
import { generateAccessToken, generateRefreshToken } from "@/lib/mobile-auth";
import { emitNotification } from "@/lib/pusher/pusherServer";
import { getPlatformConfig } from "@/models/PlatformConfig";
import Notification from "@/models/Notification";
import Referral from "@/models/Referral";
import Transaction from "@/models/Transaction";
import { sendGreetingEmail } from "@/lib/sendEmails/sendGreetingEmail";
import { getSiteUrl } from "@/lib/site-url";
import User from "@/models/User";

const googleClient = new OAuth2Client();

function getGoogleAudiences() {
  return Array.from(
    new Set(
      [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function isAllowedRole(value?: string): value is "STUDENT" | "TEACHER" {
  return value === "STUDENT" || value === "TEACHER";
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RegisterRequest = {
  googleIdToken?: string;
  role?: "STUDENT" | "TEACHER";
  referralCode?: string;
};

type ReferrerUser = {
  _id: unknown;
  email: string;
  bonusQuestions?: number;
  referralHistory?: Array<{
    referredUserId: unknown;
    pointsEarned: number;
    date: Date;
  }>;
  referralCode?: string;
  save: () => Promise<unknown>;
};

async function createGoogleUser(params: {
  email: string;
  name: string;
  role: "STUDENT" | "TEACHER";
  referralCode?: string;
}) {
  const { email, name, role, referralCode } = params;
  const username = await generateUniqueUsername({ email, name });
  const userOwnReferralCode = `REF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const siteUrl = getSiteUrl();

  let referrerUser: ReferrerUser | null = null;
  let refereeBonus = 0;
  let referrerBonus = 0;
  let referralCodeUsed: string | null = null;

  if (referralCode) {
    const config = await getPlatformConfig();
    if (config.referralEnabled) {
      referrerUser = await User.findOne({
        referralCode: referralCode.toUpperCase().trim(),
        isSuspended: false,
      });

      if (referrerUser && referrerUser.email !== email) {
        refereeBonus = config.referralBonusQuestions || 1;
        referrerBonus = config.referrerBonusQuestions || 3;
        referralCodeUsed = referrerUser.referralCode;
      } else {
        referrerUser = null;
      }
    }
  }

  const user = await User.create({
    name,
    email,
    username,
    role,
    referralCode: userOwnReferralCode,
    bonusQuestions: refereeBonus,
    referredBy: referrerUser ? referrerUser._id : null,
    points: 0,
    pointBalance: 0,
    totalAnswered: 0,
    isMonetized: false,
    overallScore: 0,
    overallRatingSum: 0,
    overallRatingCount: 0,
  });

  if (referrerUser) {
    referrerUser.bonusQuestions = (referrerUser.bonusQuestions || 0) + referrerBonus;
    if (!referrerUser.referralHistory) referrerUser.referralHistory = [];
    referrerUser.referralHistory.push({
      referredUserId: user._id,
      pointsEarned: referrerBonus,
      date: new Date(),
    });
    await referrerUser.save();

    await Referral.create({
      referrerId: referrerUser._id,
      refereeId: user._id,
      referralCode: referralCodeUsed,
      bonusAwarded: referrerBonus,
      status: "COMPLETED",
    });

    const notification = await Notification.create({
      userId: referrerUser._id,
      type: "SYSTEM",
      message: `🎉 Someone joined using your referral link! You've been awarded ${referrerBonus} bonus questions!`,
      href: "/subscription",
      isRead: false,
    }).catch(() => null);

    if (notification) {
      await emitNotification(referrerUser._id.toString(), notification).catch(() => {});
    }

    void sendGreetingEmail(
      referrerUser.email,
      referrerUser.name,
      "You Earned Bonus Questions! 🎉",
      `${siteUrl}/subscription`,
      `Someone just joined ${APP_NAME} using your referral link. You have been awarded ${referrerBonus} bonus questions permanently to your account!`,
    ).catch(console.error);
  }

  if (role === "STUDENT") {
    await Transaction.create({
      userId: user._id,
      type: "SUBSCRIPTION_MANUAL",
      amount: 0,
      status: "COMPLETED",
      planSlug: "free",
      transactionId: `TRIAL_${user._id}`,
      transactorName: name,
    });
  }

  if (referrerUser && refereeBonus > 0) {
    const refereeNotification = await Notification.create({
      userId: user._id,
      type: "SYSTEM",
      message: `🎉 Welcome! You received ${refereeBonus} bonus questions for signing up with a referral link!`,
      href: "/subscription",
      isRead: false,
    }).catch(() => null);

    if (refereeNotification) {
      await emitNotification(user._id.toString(), refereeNotification).catch(() => {});
    }

    void sendGreetingEmail(
      email,
      name,
      `Welcome to ${APP_NAME}! (+ Bonus Questions 🎉)`,
      siteUrl,
      `We're excited to have you on board! Since you signed up with a friend's referral link, you have been awarded ${refereeBonus} bonus questions to ask for free. Explore courses, ask questions, and start your learning journey today.`,
    ).catch(console.error);
  } else {
    void sendGreetingEmail(
      email,
      name,
      `Welcome to ${APP_NAME}! Your account has been created successfully.`,
      siteUrl,
      "We're excited to have you on board! Explore courses, ask questions, and start your learning journey today.",
    ).catch(console.error);
  }

  return user;
}

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json();

    if (!body.googleIdToken || !isAllowedRole(body.role)) {
      return NextResponse.json(
        { error: "googleIdToken and role are required" },
        { status: 400 },
      );
    }

    const googleAudiences = getGoogleAudiences();

    if (!googleAudiences.length) {
      return NextResponse.json(
        { error: "Google sign-up is not configured" },
        { status: 500 },
      );
    }

    await connectToDatabase();

    const ticket = await googleClient.verifyIdToken({
      idToken: body.googleIdToken,
      audience: googleAudiences,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json(
        { error: "Invalid Google ID token" },
        { status: 401 },
      );
    }

    const email = payload.email.toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account already exists with that email address." },
        { status: 409 },
      );
    }

    const user = await createGoogleUser({
      email,
      name: payload.name || "Google User",
      role: body.role,
      referralCode: body.referralCode?.trim() || undefined,
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const refreshToken = await generateRefreshToken(user._id.toString(), {
      userAgent: request.headers.get("user-agent") || undefined,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined,
    });

    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isSuspended: user.isSuspended,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Mobile Google registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
