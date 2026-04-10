import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const session = await getSafeServerSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id)
    .select("name email isMasterAdmin userImage role createdAt")
    .lean();

  const plainUser = {
    _id: user?._id?.toString(),
    name: user?.name,
    email: user?.email,
    isMasterAdmin: user?.isMasterAdmin ?? false,
    userImage: user?.userImage,
    role: user?.role,
    createdAt: user?.createdAt?.toISOString(),
  };

  return <SettingsClient user={plainUser} />;
}
