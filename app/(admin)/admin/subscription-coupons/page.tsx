import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import SubscriptionCoupon from "@/models/SubscriptionCoupon";
import SubscriptionCouponRedemption from "@/models/SubscriptionCouponRedemption";

import { AdminSubscriptionCouponsClient } from "./admin-subscription-coupons-client";

export const metadata = {
  title: "Subscription coupons",
};

export default async function AdminSubscriptionCouponsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const [coupons, redemptionCounts, config] = await Promise.all([
    SubscriptionCoupon.find().sort({ createdAt: -1 }).lean(),
    SubscriptionCouponRedemption.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$couponId", count: { $sum: 1 } } },
    ]),
    getPlatformConfig(),
  ]);

  const countByCoupon = new Map(
    redemptionCounts.map((item) => [String(item._id), item.count]),
  );

  const plans = getHydratedPlans(config)
    .filter((plan) => plan.slug !== "free")
    .map((plan) => ({
      slug: plan.slug,
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
    }));

  return (
    <AdminSubscriptionCouponsClient
      plans={plans}
      coupons={coupons.map((c) => ({
        _id: c._id.toString(),
        code: c.code,
        kind: c.kind,
        planSlug: c.planSlug ?? null,
        durationDays: c.durationDays ?? null,
        discountPercentage: c.discountPercentage ?? null,
        allowedEmails: c.allowedEmails ?? [],
        usageLimit: c.usageLimit ?? null,
        usedCount: countByCoupon.get(c._id.toString()) ?? c.usedCount ?? 0,
        startsAt: c.startsAt?.toString() ?? null,
        expiryDate: c.expiryDate?.toString() ?? null,
        campaign: c.campaign ?? null,
        isActive: c.isActive,
        createdAt: c.createdAt.toString(),
      }))}
    />
  );
}
