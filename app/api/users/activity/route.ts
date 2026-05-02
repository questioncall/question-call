import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import WalletHistoryEvent from "@/models/WalletHistoryEvent";
import Question from "@/models/Question";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const period = searchParams.get("period") || "month"; // "day" | "week" | "month" | "year"
    const range = parseInt(searchParams.get("range") || "12", 10);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(userId).select("role");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isTeacher = user.role === "TEACHER";

    // Determine start date based on period and range
    const now = new Date();
    let startDate = new Date();
    if (period === "day") {
      startDate.setDate(now.getDate() - range);
    } else if (period === "week") {
      startDate.setDate(now.getDate() - range * 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - range);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - range);
    }

    let dataPoints = [];
    let summary = {};

    if (isTeacher) {
      // Group by day/week/month
      let format = "%Y-%m-%d";
      if (period === "month" || period === "year") {
        format = "%Y-%m";
      }

      dataPoints = await WalletHistoryEvent.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(userId), 
            occurredAt: { $gte: startDate } 
          } 
        },
        { 
          $group: {
            _id: { $dateToString: { format, date: "$occurredAt" } },
            totalEarned: { 
              $sum: { 
                $cond: [{ $gt: ["$pointsDelta", 0] }, "$pointsDelta", 0] 
              } 
            },
            totalPenalty: { 
              $sum: { 
                $cond: [{ $lt: ["$pointsDelta", 0] }, { $abs: "$pointsDelta" }, 0] 
              } 
            },
            netEarning: { $sum: "$pointsDelta" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      let totalEarned = 0;
      let totalPenalty = 0;
      let netEarning = 0;
      let totalActiveDays = dataPoints.length;
      let bestDay = { date: "", amount: 0 };

      dataPoints = dataPoints.map(dp => {
        totalEarned += dp.totalEarned;
        totalPenalty += dp.totalPenalty;
        netEarning += dp.netEarning;
        if (dp.netEarning > bestDay.amount) {
          bestDay = { date: dp._id, amount: dp.netEarning };
        }
        return {
          date: dp._id,
          earned: dp.totalEarned,
          penalty: dp.totalPenalty,
          net: dp.netEarning,
          count: dp.count
        };
      });

      summary = {
        totalEarned,
        totalPenalty,
        netEarning,
        totalActiveDays,
        bestDay
      };
    } else {
      let format = "%Y-%m-%d";
      if (period === "month" || period === "year") {
        format = "%Y-%m";
      }

      dataPoints = await Question.aggregate([
        { 
          $match: { 
            askerId: new mongoose.Types.ObjectId(userId), 
            createdAt: { $gte: startDate } 
          } 
        },
        { 
          $group: {
            _id: { $dateToString: { format, date: "$createdAt" } },
            questionsAsked: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      let totalAsked = 0;
      let totalActiveDays = dataPoints.length;
      let bestDay = { date: "", amount: 0 };

      dataPoints = dataPoints.map(dp => {
        totalAsked += dp.questionsAsked;
        if (dp.questionsAsked > bestDay.amount) {
          bestDay = { date: dp._id, amount: dp.questionsAsked };
        }
        return {
          date: dp._id,
          questionsAsked: dp.questionsAsked
        };
      });

      summary = {
        totalAsked,
        totalActiveDays,
        bestDay
      };
    }

    return NextResponse.json({
      role: user.role,
      period,
      dataPoints,
      summary
    });
  } catch (error: any) {
    console.error("Activity API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
