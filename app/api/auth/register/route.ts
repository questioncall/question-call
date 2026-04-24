import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectToDatabase } from "@/lib/mongodb";
import { generateUniqueUsername } from "@/lib/user-directory";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import VerificationToken from "@/models/VerificationToken";
import Referral from "@/models/Referral";
import Notification from "@/models/Notification";
import { emitNotification } from "@/lib/pusher/pusherServer";
import { getPlatformConfig } from "@/models/PlatformConfig";
import { sendGreetingEmail } from "@/lib/sendEmails/sendGreetingEmail";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

function isAllowedRole(value: string): value is "STUDENT" | "TEACHER" {
  return value === "STUDENT" || value === "TEACHER";
}

export async function POST(request: Request) {
  try {
    const siteUrl = getSiteUrl();
    const payload = await request.json();

    const name = payload?.name?.trim();
    const email = payload?.email?.trim().toLowerCase();
    const password = payload?.password;
    const role = payload?.role;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: "Name, email, password, and role are required." },
        { status: 400 },
      );
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        { message: "Only student and teacher registrations are supported here." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account already exists with that email address." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const username = await generateUniqueUsername({ email, name });
const userOwnReferralCode = `REF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    let referrerUser = null;
    let refereeBonus = 0;
    let referrerBonus = 0;
    let referralCodeUsed = null;

    if (payload.referralCode) {
      const config = await getPlatformConfig();
      if (config.referralEnabled) {
        referrerUser = await User.findOne({ 
          referralCode: payload.referralCode.toUpperCase().trim(),
          isSuspended: false
        });
        if (referrerUser && referrerUser.email !== email) {
          refereeBonus = config.referralBonusQuestions || 1;
          referrerBonus = config.referrerBonusQuestions || 3;
          referralCodeUsed = referrerUser.referralCode;
        }
      }
    }

    const user = await User.create({
      name,
      email,
      username,
      passwordHash,
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

    console.log("Created user with referralCode:", user.referralCode);

if (referrerUser) {
      referrerUser.bonusQuestions = (referrerUser.bonusQuestions || 0) + referrerBonus;
      if (!referrerUser.referralHistory) referrerUser.referralHistory = [];
      referrerUser.referralHistory.push({
        referredUserId: user._id,
        pointsEarned: referrerBonus,
        date: new Date()
      });
      await referrerUser.save();

      await Referral.create({
        referrerId: referrerUser._id,
        refereeId: user._id,
        referralCode: referralCodeUsed,
        bonusAwarded: referrerBonus,
        status: "COMPLETED",
      });

      // Notify the referrer
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
        `Someone just joined {APP_NAME} using your referral link. You have been awarded ${referrerBonus} bonus questions permanently to your account!`
      ).catch(console.error);
    }

    // Auto-grant 3-day free trial for students via Transaction record
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

    // Clean up used OTP
    await VerificationToken.deleteOne({ email });

    // Fire welcome email asynchronously
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
        "Welcome to {APP_NAME}! (+ Bonus Questions 🎉)",
        siteUrl,
        `We're excited to have you on board! Since you signed up with a friend's referral link, you have been awarded ${refereeBonus} bonus questions to ask for free. Explore courses, ask questions, and start your learning journey today.`
      ).catch(console.error);
    } else {
      void sendGreetingEmail(
        email,
        name,
        "Welcome to {APP_NAME}! Your account has been created successfully.",
        siteUrl,
        "We're excited to have you on board! Explore courses, ask questions, and start your learning journey today."
      ).catch(console.error);
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration failed:", error);

    return NextResponse.json(
      { message: "Something went wrong while creating the account." },
      { status: 500 },
    );
  }
}
