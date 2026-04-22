"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CrownIcon,
  KeyIcon,
  Loader2Icon,
  PlusIcon,
  Share2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getDefaultPlatformSocialLinks,
  getSocialHandleMeta,
  normalizePlatformSocialLinks,
  SOCIAL_HANDLE_META,
  type PlatformSocialLink,
} from "@/lib/constants";

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
  const router = useRouter();

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

// Social handles logic moved to /admin/social
  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const response = await fetch("/api/admin/admins");

      if (!response.ok) {
        throw new Error("Failed to fetch admins");
      }

      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAdmins(false);
    }
  };

// fetchSocialConfig moved

  useEffect(() => {
    fetchAdmins();
    setIsMaster(user.isMasterAdmin === true);
  }, [user.isMasterAdmin]);

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setUpdatingPass(true);

    try {
      const response = await fetch("/api/admin/admins/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingAdmin(true);

    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAdminEmail,
          name: newAdminName,
          password: newAdminPassword,
          makeMasterAdmin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin");
      }

      toast.success("New admin account created successfully.");
      setNewAdminEmail("");
      setNewAdminName("");
      setNewAdminPassword("");
      setMakeMasterAdmin(false);
      fetchAdmins();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create admin";
      toast.error(message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/admins/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove admin");
      }

      toast.success("Admin removed successfully.");
      setDeleteTarget(null);
      fetchAdmins();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to remove admin";
      toast.error(message);
    }
  };

  const handlePromoteToMaster = async () => {
    if (!promoteTarget) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/admins/${promoteTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ makeMasterAdmin: true }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to promote admin");
      }

      toast.success("Admin promoted to master admin.");
      setPromoteTarget(null);
      fetchAdmins();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to promote admin";
      toast.error(message);
    }
  };

// social handlers moved

  // renderOverview removed

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Admin Team & Identity</h2>
      </div>

      <div className={`grid gap-6 ${isMaster ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-primary" />
              Your Admin Profile
            </CardTitle>
            <CardDescription>
              Core identity details for the current admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                {user.userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.userImage}
                    alt={user.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground">
                  {user.name}
                  {user.isMasterAdmin ? (
                    <CrownIcon className="ml-1 inline-block size-5 text-amber-500" />
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.isMasterAdmin
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {user.isMasterAdmin ? "Master Admin" : "Acting Admin"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Joined{" "}
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="size-5 text-primary" />
              Password & Security
            </CardTitle>
            <CardDescription>
              Change the password for your current account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
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

        {isMaster ? (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlusIcon className="size-5 text-primary" />
                Create Admin
              </CardTitle>
              <CardDescription>
                Add a new admin directly from the admin profile area.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    type="text"
                    value={newAdminName}
                    onChange={(event) => setNewAdminName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={newAdminEmail}
                    onChange={(event) => setNewAdminEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    value={newAdminPassword}
                    onChange={(event) => setNewAdminPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/15 p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="makeMaster"
                      checked={makeMasterAdmin}
                      onCheckedChange={(checked) =>
                        setMakeMasterAdmin(checked === true)
                      }
                    />
                    <label htmlFor="makeMaster" className="space-y-1 text-sm">
                      <span className="block font-medium text-foreground">
                        Make this user a Master Admin
                      </span>
                      <span className="block text-xs leading-5 text-muted-foreground">
                        Master admins can promote, remove, and manage platform-level admin settings.
                      </span>
                    </label>
                  </div>
                </div>
                <Button type="submit" disabled={creatingAdmin} className="w-full">
                  {creatingAdmin ? "Creating..." : "Create Admin Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Admin Team</CardTitle>
          <CardDescription>
            Review all administrator accounts. Only master admins can promote or remove others.
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
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {admin.name}
                      {admin.isMasterAdmin ? (
                        <CrownIcon className="ml-1 inline-block size-4 text-amber-500" />
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Added on {new Date(admin.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {admin.isMasterAdmin ? (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Master Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        Acting Admin
                      </span>
                    )}
                    {isMaster && !admin.isMasterAdmin ? (
                      <div className="flex gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPromoteTarget(admin)}
                            >
                              Promote
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Promote to Master Admin?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to promote {admin.name} as a Master Admin?
                                This gives full control over admin configuration and other admin accounts.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setPromoteTarget(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handlePromoteToMaster}>
                                Yes, Promote
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteTarget(admin)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Admin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {admin.name} from the admin panel?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleRemoveAdmin}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Yes, Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

// renderSocialSection moved

  return (
    <div className="space-y-12 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Settings</h1>
        <p className="text-muted-foreground text-sm max-w-3xl">Manage your admin profile identity and the admin team from this dashboard.</p>
      </div>

      {renderProfileSection()}
    </div>
  );
}
