import { notFound, redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { getChapterDetailData } from "@/lib/chapter-page-data";
import { createNoIndexMetadata } from "@/lib/seo";
import { isCheckoutRequest } from "@/lib/checkout-host.server";
import { ChapterBuyClient } from "./chapter-buy-client";

export const metadata = createNoIndexMetadata({
  title: "Buy Chapter",
  description: "Submit payment proof for a chapter.",
});

export default async function BuyChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSafeServerSession();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  if (session.user.role !== "STUDENT") {
    redirect("/courses");
  }

  const { slug } = await params;
  const [chapter, isCheckout] = await Promise.all([
    getChapterDetailData({
      slug,
      userId: session.user.id,
      role: session.user.role,
    }),
    isCheckoutRequest(),
  ]);

  if (!chapter) {
    notFound();
  }
  if (chapter.pricingModel !== "PAID" || chapter.hasAccess) {
    redirect(`/chapters/${chapter.slug}`);
  }

  return <ChapterBuyClient chapter={chapter} checkoutMode={isCheckout} />;
}
