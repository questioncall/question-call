"use client";

import { useEffect, useState } from "react";
import { UsersIcon, Loader2Icon, ShieldAlertIcon, ShieldCheckIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPoints } from "@/lib/points";
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

type UserRecord = {
  _id: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  points?: number;
  pointBalance?: number;
  totalAnswered?: number;
  isSuspended?: boolean;
  createdAt: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function UsersClient() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<UserRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.username && user.username.toLowerCase().includes(query))
    );
  });

  const handleToggleSuspend = async () => {
    if (!suspendTarget) return;

    setSuspendingId(suspendTarget._id);
    try {
      const res = await fetch(`/api/admin/users/${suspendTarget._id}/suspend`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update suspension status");

      toast.success(data.message);
      
      setUsers(prev => prev.map(u => 
        u._id === suspendTarget._id ? { ...u, isSuspended: data.isSuspended } : u
      ));
      setSuspendTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSuspendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-fit max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <UsersIcon className="mr-2 inline-block size-6 text-primary" />
          User Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View students and teachers. Suspend accounts that violate platform rules.
        </p>
      </div>

      <Card className="mx-auto w-fit max-w-full">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>
                Total: {filteredUsers.length} of {users.length} users
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-max min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Metrics</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className={`transition-colors ${user.isSuspended ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/30"}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        user.role === "TEACHER" 
                          ? "bg-violet-500/10 text-violet-700 dark:text-violet-400" 
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      {user.role === "STUDENT" ? (
                          <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                          Points: <span className="font-medium text-primary">{formatPoints(user.points || 0)}</span>
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            Balance: <span className="font-medium text-primary">{formatPoints(user.pointBalance || 0)} pts</span>
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            Answers: <span className="font-medium text-foreground">{user.totalAnswered || 0}</span>
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant={user.isSuspended ? "outline" : "destructive"}
                            size="sm"
                            disabled={suspendingId === user._id}
                            className={user.isSuspended ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400" : ""}
                            onClick={() => setSuspendTarget(user)}
                          >
                            {suspendingId === user._id ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : user.isSuspended ? (
                              <>
                                <ShieldCheckIcon className="mr-1.5 size-4" />
                                Unsuspend
                              </>
                            ) : (
                              <>
                                <ShieldAlertIcon className="mr-1.5 size-4" />
                                Suspend
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {user.isSuspended ? "Unsuspend User?" : "Suspend User?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {user.isSuspended 
                                ? `Are you sure you want to unsuspend ${user.name}? They will regain access to the platform.`
                                : `Are you sure you want to suspend ${user.name}? They will lose access to the platform immediately.`
                              }
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSuspendTarget(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleToggleSuspend} className={user.isSuspended ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}>
                              {user.isSuspended ? "Yes, Unsuspend" : "Yes, Suspend"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
