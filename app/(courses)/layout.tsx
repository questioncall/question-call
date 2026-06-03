import { getSafeServerSession } from "@/lib/auth";
import { CourseHeader } from "@/components/course/CourseHeader";
import { isCheckoutRequest } from "@/lib/checkout-host.server";

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, isCheckout] = await Promise.all([
    getSafeServerSession(),
    isCheckoutRequest(),
  ]);

  const user = session?.user
    ? { name: session.user.name, role: session.user.role }
    : null;

  return (
    <div className="min-h-svh bg-[#f6f8fb] dark:bg-background">
      {/* On the checkout subdomain we hide the full web nav and render only the
          payment surface, so it reads as a focused payment gateway. */}
      {isCheckout ? null : <CourseHeader user={user} />}
      {children}
    </div>
  );
}
