import { redirect } from "next/navigation";
import { UserIcon } from "lucide-react";

import { ProfileForm } from "@/components/shared/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRecord } from "@/models/User";

export default async function SettingsProfilePage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  await connectToDatabase();
  const dbUser = await User.findById(session.user.id).lean<UserRecord>();

  if (!dbUser) {
    redirect("/auth/signin");
  }

  // Sanitize the lean object so it strictly matches Partial<UserRecord> without Mongoose _id pollution 
  // causing issues in client components if it's not a valid JSON structure
  const serializedUser = {
    name: dbUser.name,
    email: dbUser.email,
    username: dbUser.username,
    bio: dbUser.bio,
    userImage: dbUser.userImage,
    skills: dbUser.skills,
    interests: dbUser.interests,
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <UserIcon className="size-4 text-primary" />
            Public Profile
          </CardDescription>
          <CardTitle>Edit Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 max-w-3xl text-sm leading-7 text-muted-foreground">
            Update your public profile, add a bio, and upload a custom avatar. This is how other peers and educators see you across the platform.
          </p>
          
          <div className="rounded-xl border border-border p-6 shadow-sm bg-card">
            <ProfileForm user={serializedUser} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
