import { getSafeServerSession } from "@/lib/auth";
import { CourseHeader } from "@/components/course/CourseHeader";

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSafeServerSession();

  const user = session?.user
    ? { name: session.user.name, role: session.user.role }
    : null;

  return (
    <div className="min-h-svh bg-[#f6f8fb] dark:bg-background">
      <CourseHeader user={user} />
      {children}
    </div>
  );
}
