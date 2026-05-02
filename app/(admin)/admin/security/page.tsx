import { Metadata } from "next";
import { AdminSecurityClient } from "./security-client";

export const metadata: Metadata = {
  title: "Security & Anti-Cheat | Admin",
  description: "Monitor and configure anti-cheating measures",
};

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Anti-Cheat</h1>
        <p className="text-muted-foreground">
          Monitor platform integrity, teacher-student collusion, and configure security limits.
        </p>
      </div>
      <AdminSecurityClient />
    </div>
  );
}
