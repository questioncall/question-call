"use client";

import { useState } from "react";
import { ShieldCheckIcon, KeyIcon, MailIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsClient({ user }: { user: any }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPass(true);

    try {
      const res = await fetch("/api/admin/admins/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAdmin(true);

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: newAdminEmail, 
          name: newAdminName, 
          password: newAdminPassword 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");

      toast.success("New admin account created successfully.");
      setNewAdminEmail("");
      setNewAdminName("");
      setNewAdminPassword("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <ShieldCheckIcon className="mr-2 inline-block size-6 text-primary" />
          Security & Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account credentials and create additional admin accounts.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="size-5 text-primary" /> Update Password
            </CardTitle>
            <CardDescription>
              Change the password for your current account ({user.email}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" disabled={updatingPass} className="w-full">
                {updatingPass ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlusIcon className="size-5 text-primary" /> Create Admin
            </CardTitle>
            <CardDescription>
              Create an additional administrator account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" disabled={creatingAdmin} className="w-full">
                {creatingAdmin ? "Creating..." : "Create Admin Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
