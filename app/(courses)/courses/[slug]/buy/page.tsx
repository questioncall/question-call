import { getSafeServerSession } from "@/lib/auth";
import { getCourseDetailPageData } from "@/lib/course-page-data";
import { createNoIndexMetadata } from "@/lib/seo";
import { isCheckoutRequest } from "@/lib/checkout-host.server";
import { parseCheckoutTheme } from "@/lib/checkout-host";
import { CourseBuyClient } from "./course-buy-client";

export const metadata = createNoIndexMetadata({
  title: "Course Checkout",
  description: "Private course purchase flow.",
});

export default async function CourseBuyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { slug } = await params;
  const [session, isCheckout, { theme }] = await Promise.all([
    getSafeServerSession(),
    isCheckoutRequest(),
    searchParams,
  ]);
  const course = await getCourseDetailPageData({
    slug,
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
  });

  return (
    <CourseBuyClient
      course={course}
      isAuthenticated={!!session?.user?.id}
      checkoutMode={isCheckout}
      forcedTheme={parseCheckoutTheme(theme)}
    />
  );
}
