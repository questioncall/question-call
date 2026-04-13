import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { AdminCouponsClient } from "./admin-coupons-client";
import { connectToDatabase } from "@/lib/mongodb";
import CourseCoupon from "@/models/CourseCoupon";
import CourseCouponRedemption from "@/models/CourseCouponRedemption";
import Course from "@/models/Course";

export default async function AdminCouponsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const [coupons, redemptions, courses] = await Promise.all([
    CourseCoupon.find().sort({ createdAt: -1 }).lean(),
    CourseCouponRedemption.find().lean(),
    Course.find().select("_id title slug").lean(),
  ]);

  const redemptionCountByCoupon = new Map<string, number>();
  redemptions.forEach((redemption) => {
    const key = redemption.couponId.toString();
    redemptionCountByCoupon.set(key, (redemptionCountByCoupon.get(key) ?? 0) + 1);
  });

  const courseById = new Map(courses.map((c) => [c._id.toString(), c]));

  return (
    <AdminCouponsClient
      coupons={coupons.map((c) => ({
        _id: c._id.toString(),
        code: c.code,
        type: c.type,
        scope: c.scope,
        courseId: c.courseId?.toString() ?? null,
        courseTitle: c.courseId
          ? courseById.get(c.courseId.toString())?.title ?? null
          : null,
        usageLimit: c.usageLimit,
        usedCount: redemptionCountByCoupon.get(c._id.toString()) ?? 0,
        expiryDate: c.expiryDate?.toString() ?? null,
        isActive: c.isActive,
        createdAt: c.createdAt.toString(),
      }))}
    />
  );
}