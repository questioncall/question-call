"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheckIcon,
  KeyIcon,
  UserPlusIcon,
  Loader2Icon,
  Trash2Icon,
  CrownIcon,
  CpuIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Admin = {
  _id: string;
  name: string;
  email: string;
  isMasterAdmin: boolean;
  createdAt: string;
};

type SettingsUser = {
  _id: string;
  name: string | undefined;
  email: string | null;
  isMasterAdmin: boolean;
  userImage: string | null;
  role: string;
  createdAt: string;
};

export function SettingsClient({ user }: { user: SettingsUser }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [isMaster, setIsMaster] = useState(false);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [makeMasterAdmin, setMakeMasterAdmin] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [promoteTarget, setPromoteTarget] = useState<Admin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch("/api/admin/admins");
      if (!res.ok) throw new Error("Failed to fetch admins");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    setIsMaster(user.isMasterAdmin === true);
  }, [user.isMasterAdmin]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      toast.error(message);
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
          password: newAdminPassword,
          makeMasterAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");

      toast.success("New admin account created successfully.");
      setNewAdminEmail("");
      setNewAdminName("");
      setNewAdminPassword("");
      setMakeMasterAdmin(false);
      fetchAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create admin";
      toast.error(message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/admins/${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove admin");

      toast.success("Admin removed successfully.");
      setDeleteTarget(null);
      fetchAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove admin";
      toast.error(message);
    }
  };

  const handlePromoteToMaster = async () => {
    if (!promoteTarget) return;

    try {
      const res = await fetch(`/api/admin/admins/${promoteTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ makeMasterAdmin: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to promote admin");

      toast.success("Admin promoted to master admin.");
      setPromoteTarget(null);
      fetchAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to promote admin";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Profile Card */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" /> Your Profile
          </CardTitle>
          <CardDescription>
            Information about your admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              {user.userImage ? (
                <img 
                  src={user.userImage} 
                  alt={user.name} 
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold">{user.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {user.name}
                {user.isMasterAdmin && (
                  <CrownIcon className="ml-1 inline-block size-5 text-amber-500" />
                )}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.isMasterAdmin 
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {user.isMasterAdmin ? "Master Admin" : "Acting Admin"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <ShieldCheckIcon className="mr-2 inline-block size-6 text-primary" />
          Security & Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account credentials and admin accounts.
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

        {isMaster && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlusIcon className="size-5 text-primary" /> Create Admin
              </CardTitle>
              <CardDescription>
                Create a new administrator account.
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="makeMaster"
                    checked={makeMasterAdmin}
                    onCheckedChange={(checked) => setMakeMasterAdmin(checked === true)}
                  />
                  <label htmlFor="makeMaster" className="text-sm font-medium">
                    Make this user a Master Admin
                  </label>
                </div>
                <Button type="submit" disabled={creatingAdmin} className="w-full">
                  {creatingAdmin ? "Creating..." : "Create Admin Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CpuIcon className="size-5 text-primary" /> AI & Key Management
          </CardTitle>
          <CardDescription>
            Manage AI Providers, setup load balancing, and API key failover logic for the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/ai-keys">Manage AI Keys</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Admins</CardTitle>
          <CardDescription>
            List of all administrators. Only master admin can remove or promote others.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAdmins ? (
            <div className="flex justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-primary" />
            </div>
          ) : admins.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No admins found.
            </p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  className="flex items-center justify-between rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {admin.name}
                        {admin.isMasterAdmin && (
                          <CrownIcon className="ml-1 inline-block size-4 text-amber-500" />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {admin.isMasterAdmin ? (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Master Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        Acting Admin
                      </span>
                    )}
                    {isMaster && !admin.isMasterAdmin && (
                      <div className="flex gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setPromoteTarget(admin)}>
                              Promote
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Promote to Master Admin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to promote {admin.name} as a Master Admin? 
                                This will give them full control over the admin panel including the ability to remove other admins.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setPromoteTarget(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handlePromoteToMaster}>
                                Yes, Promote
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(admin)}>
                              <Trash2Icon className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Admin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {admin.name} from the admin panel? 
                                This action cannot be undone. They will no longer have access to admin features.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleRemoveAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Yes, Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}