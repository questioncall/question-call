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
  ADMIN_PORTAL_ROUTE_ENTRIES,
  type AdminPortalEntry,
} from "@/lib/admin-portal";
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

type SettingsSection = "overview" | "profile" | "social";

const SETTINGS_SECTION_CARDS: Array<{
  id: Exclude<SettingsSection, "overview">;
  label: string;
  description: string;
  eyebrow: string;
}> = [
  {
    id: "profile",
    label: "Admin Profile",
    description:
      "Your admin identity, password, and admin team management all live here.",
    eyebrow: "Identity & Access",
  },
  {
    id: "social",
    label: "Social Media",
    description:
      "A dedicated area for the public social links shown in the workspace header hover.",
    eyebrow: "Public Presence",
  },
];

function getSectionHref(section: SettingsSection) {
  return section === "overview"
    ? "/admin/settings"
    : `/admin/settings?section=${section}`;
}

function resolveSettingsSection(
  value: string | null,
): SettingsSection {
  if (value === "profile" || value === "social") {
    return value;
  }

  return "overview";
}

function groupAdminPortalEntries(entries: AdminPortalEntry[]) {
  const grouped = new Map<string, AdminPortalEntry[]>();

  for (const entry of entries) {
    const current = grouped.get(entry.group) ?? [];
    current.push(entry);
    grouped.set(entry.group, current);
  }

  return Array.from(grouped.entries());
}

export function SettingsClient({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = resolveSettingsSection(searchParams.get("section"));
  const totalSearchDestinations =
    SETTINGS_SECTION_CARDS.length + ADMIN_PORTAL_ROUTE_ENTRIES.length;

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

  const [socialLinks, setSocialLinks] = useState<PlatformSocialLink[]>(
    getDefaultPlatformSocialLinks(),
  );
  const [loadingSocialConfig, setLoadingSocialConfig] = useState(true);
  const [savingSocialConfig, setSavingSocialConfig] = useState(false);
  const [isAddSocialDialogOpen, setIsAddSocialDialogOpen] = useState(false);
  const [selectedSocialPlatform, setSelectedSocialPlatform] = useState<
    PlatformSocialLink["platform"] | ""
  >("");

  const portalRouteGroups = useMemo(
    () => groupAdminPortalEntries(ADMIN_PORTAL_ROUTE_ENTRIES),
    [],
  );

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

  const fetchSocialConfig = async () => {
    try {
      setLoadingSocialConfig(true);
      const response = await fetch("/api/admin/config");

      if (!response.ok) {
        throw new Error("Failed to fetch social handles");
      }

      const data = await response.json();
      setSocialLinks(
        normalizePlatformSocialLinks(data.socialLinks, {
          fallbackToDefault: true,
        }),
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not load social handles.");
    } finally {
      setLoadingSocialConfig(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchSocialConfig();
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

  const handleSaveSocialConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSocialConfig(true);

    try {
      const normalizedLinks = normalizePlatformSocialLinks(socialLinks);
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialLinks: normalizedLinks }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save social handles");
      }

      setSocialLinks(
        normalizePlatformSocialLinks(data.socialLinks, {
          fallbackToDefault: true,
        }),
      );
      toast.success(
        "Social links updated. Header share cards will refresh instantly.",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save social handles";
      toast.error(message);
    } finally {
      setSavingSocialConfig(false);
    }
  };

  const removeSocialLink = (platform: PlatformSocialLink["platform"]) => {
    setSocialLinks((current) =>
      current.filter((item) => item.platform !== platform),
    );
  };

  const updateSocialLink = (
    platform: PlatformSocialLink["platform"],
    url: string,
  ) => {
    setSocialLinks((current) =>
      current.map((item) =>
        item.platform === platform
          ? {
              ...item,
              url,
            }
          : item,
      ),
    );
  };

  const availableSocialPlatforms = SOCIAL_HANDLE_META.filter(
    (item) => !socialLinks.some((link) => link.platform === item.key),
  );

  const filledSocialLinksCount = socialLinks.filter(
    (item) => item.url.trim().length > 0,
  ).length;
  const remainingSocialSlots = SOCIAL_HANDLE_META.length - socialLinks.length;

  const addSocialLink = (platform: PlatformSocialLink["platform"]) => {
    if (socialLinks.some((item) => item.platform === platform)) {
      return;
    }

    setSocialLinks((current) => [
      ...current,
      {
        platform,
        url: "",
      },
    ]);
  };

  const handleOpenAddSocialDialog = () => {
    if (availableSocialPlatforms.length === 0) {
      return;
    }

    setSelectedSocialPlatform(availableSocialPlatforms[0]?.key ?? "");
    setIsAddSocialDialogOpen(true);
  };

  const handleConfirmAddSocialLink = () => {
    if (!selectedSocialPlatform) {
      return;
    }

    addSocialLink(selectedSocialPlatform);
    setIsAddSocialDialogOpen(false);
    setSelectedSocialPlatform("");
  };

  const renderOverview = () => (
    <div className="space-y-8">
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="bg-gradient-to-br from-primary/[0.07] via-background to-background p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/90 px-3 py-1 text-xs font-medium text-primary">
                <ShieldCheckIcon className="size-3.5" />
                Settings Hub
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Organize the admin portal with confidence
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Use this hub to understand what belongs in each admin tab, jump
                  into dedicated settings sections, and keep the portal easier to scan.
                  The global search bar above can also take you directly to any admin
                  destination.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/90 p-4 text-sm text-muted-foreground shadow-sm">
              <p className="font-medium text-foreground">Current admin</p>
              <p className="mt-1">{user.name || "Admin"}</p>
              <p>{user.email || "No email available"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-border/70 bg-background p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Settings Areas
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {SETTINGS_SECTION_CARDS.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Profile and Social Media stay inside the settings hub.
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-background p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Portal Tabs
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {ADMIN_PORTAL_ROUTE_ENTRIES.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Dedicated admin routes for platform, finance, content, and operations.
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-background p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Search Destinations
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {totalSearchDestinations}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The smart search can jump to every settings section and admin tab.
            </p>
          </div>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Placement Rules</CardTitle>
            <CardDescription>
              A simple guide for where new admin work should live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
              <p className="text-sm font-semibold text-foreground">
                Settings is the map
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use this page as the admin hub. It lists every tab and explains the
                purpose of each one.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
              <p className="text-sm font-semibold text-foreground">
                Admin Profile owns admin identity
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Password changes, the current admin account, and adding more admins all
                belong in Admin Profile.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
              <p className="text-sm font-semibold text-foreground">
                Social Media stays solo
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Public header links are managed in their own dedicated section so they
                do not get mixed with admin identity or system tools.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Dedicated settings sections
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These are the settings pages we keep inside the settings hub itself.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {SETTINGS_SECTION_CARDS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => router.push(getSectionHref(section.id))}
              className="rounded-[26px] border border-border/70 bg-background p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.eyebrow}
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {section.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <ArrowUpRightIcon className="mt-1 size-5 shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Full admin portal map
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each tab has a clearer purpose below, so it is easier to know where new
            work belongs.
          </p>
        </div>

        {portalRouteGroups.map(([group, entries]) => (
          <div key={group} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group}
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.href}
                  className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {entry.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {entry.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entry.keywords.slice(0, 3).map((keyword) => (
                          <span
                            key={`${entry.id}-${keyword}`}
                            className="rounded-full border border-border/70 bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowUpRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => router.push(getSectionHref("overview"))}
        >
          <ArrowLeftIcon className="size-4" />
          Back to Settings Hub
        </Button>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Admin Profile
        </span>
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

  const renderSocialSection = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => router.push(getSectionHref("overview"))}
        >
          <ArrowLeftIcon className="size-4" />
          Back to Settings Hub
        </Button>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Social Media
        </span>
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          {loadingSocialConfig ? (
            <div className="flex justify-center py-10">
              <Loader2Icon className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSaveSocialConfig} className="space-y-6 p-5 sm:p-6">
              <div className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-amber-500/[0.08] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                      <Share2Icon className="size-3.5" />
                      Social Media Manager
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        Control the public header share cards
                      </h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        This section is dedicated only to social media, so the public
                        link controls stay separate from admin identity and system tools.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 bg-background/80"
                      disabled={availableSocialPlatforms.length === 0}
                      onClick={handleOpenAddSocialDialog}
                    >
                      <PlusIcon className="size-4" />
                      Add Slot
                    </Button>
                    <Button type="submit" disabled={savingSocialConfig}>
                      {savingSocialConfig ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Social Links"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Active Slots
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {socialLinks.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Platforms currently configured in the editor.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Visible Links
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {filledSocialLinksCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Non-empty entries that will appear in the header hover.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Remaining Slots
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {remainingSocialSlots}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Available platforms you can still add to the list.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Available Platforms
                  </p>
                  {availableSocialPlatforms.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableSocialPlatforms.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setSelectedSocialPlatform(item.key);
                            setIsAddSocialDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.06]"
                        >
                          <span
                            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${item.badgeClassName}`}
                          >
                            {item.badge}
                          </span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                      All 10 social slots are already added. Remove one if you want to swap platforms.
                    </div>
                  )}
                </div>
              </div>

              {socialLinks.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border/70 bg-muted/15 p-10 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Share2Icon className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    No social slots added yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Start by choosing a platform from the available slot picker, then
                    add the public URL or handle you want visitors to see.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 gap-2"
                    disabled={availableSocialPlatforms.length === 0}
                    onClick={handleOpenAddSocialDialog}
                  >
                    <PlusIcon className="size-4" />
                    Choose First Slot
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {socialLinks.map((item) => {
                    const meta = getSocialHandleMeta(item.platform);

                    if (!meta) {
                      return null;
                    }

                    return (
                      <div
                        key={item.platform}
                        className="rounded-[24px] border border-border/70 bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl px-2 text-[11px] font-semibold shadow-sm ${meta.badgeClassName}`}
                            >
                              {meta.badge}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {meta.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.url.trim()
                                  ? "Ready to show in the header hover"
                                  : "Add a public URL or handle to make it visible"}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                            onClick={() => removeSocialLink(item.platform)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-border/60 bg-muted/15 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Input
                          </p>
                          <label className="mt-3 block text-sm font-medium text-foreground">
                            URL or handle
                          </label>
                          <Input
                            className="mt-2 bg-background"
                            placeholder={meta.placeholder}
                            value={item.url}
                            onChange={(event) =>
                              updateSocialLink(item.platform, event.target.value)
                            }
                          />
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            Full URLs work best. Short handles, phone numbers, and invite
                            codes are also supported when the platform allows them.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  Removing a slot hides it from the header immediately after the next save.
                  The live workspace header refresh still happens in real time after saving.
                </p>
                <Button type="submit" disabled={savingSocialConfig}>
                  {savingSocialConfig ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Social Links"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isAddSocialDialogOpen}
        onOpenChange={(open) => {
          setIsAddSocialDialogOpen(open);
          if (!open) {
            setSelectedSocialPlatform("");
          }
        }}
      >
        <DialogContent className="max-w-2xl overflow-hidden p-0 sm:max-w-2xl">
          <div className="border-b border-border/70 bg-muted/20 px-5 py-4">
            <DialogHeader>
              <DialogTitle>Choose a social platform</DialogTitle>
              <DialogDescription>
                Pick which slot you want to add to the social media manager. Only
                unused platforms are shown here.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {availableSocialPlatforms.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedSocialPlatform(item.key)}
                  className={`rounded-[22px] border p-4 text-left transition-all ${
                    selectedSocialPlatform === item.key
                      ? "border-primary bg-primary/[0.07] shadow-sm"
                      : "border-border/70 bg-background hover:border-primary/30 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-2 text-[11px] font-semibold shadow-sm ${item.badgeClassName}`}
                    >
                      {item.badge}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {item.label}
                        </p>
                        {selectedSocialPlatform === item.key ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Suggested format: {item.placeholder}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 bg-background px-5 py-4 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedSocialPlatform
                ? `Selected: ${
                    getSocialHandleMeta(selectedSocialPlatform)?.label ?? "Platform"
                  }`
                : "Select a platform to continue."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddSocialDialogOpen(false);
                  setSelectedSocialPlatform("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedSocialPlatform}
                onClick={handleConfirmAddSocialLink}
              >
                Add Selected Slot
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="space-y-8">
      {activeSection === "overview" ? renderOverview() : null}
      {activeSection === "profile" ? renderProfileSection() : null}
      {activeSection === "social" ? renderSocialSection() : null}
    </div>
  );
}
