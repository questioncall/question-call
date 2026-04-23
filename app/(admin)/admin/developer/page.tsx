"use client";

import { useState, useEffect, Suspense } from "react";
import { Mail, AlertTriangle, Save, Plus, Trash2, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface DeveloperConfig {
  emails: string[];
  errorThreshold: number;
  enabled: boolean;
  lastAlertSent?: string;
}

function DeveloperContent() {
  const [config, setConfig] = useState<DeveloperConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [threshold, setThreshold] = useState(4);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/developer");
      if (!res.ok) throw new Error("Failed to fetch config");
      const json = await res.json();
      setConfig(json);
      setThreshold(json.errorThreshold || 4);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading config";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    if (config?.emails.includes(newEmail.toLowerCase())) {
      toast.error("Email already added");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addEmail",
          email: newEmail.toLowerCase(),
        }),
      });
      if (!res.ok) throw new Error("Failed to add email");
      toast.success("Email added");
      setNewEmail("");
      fetchConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error adding email";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Remove ${email}?`)) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeEmail",
          email,
        }),
      });
      if (!res.ok) throw new Error("Failed to remove email");
      toast.success("Email removed");
      fetchConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error removing email";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveThreshold = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setThreshold",
          threshold,
        }),
      });
      if (!res.ok) throw new Error("Failed to save threshold");
      toast.success("Threshold saved");
      fetchConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving threshold";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/developer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setEnabled",
          enabled,
        }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      toast.success(enabled ? "Alerts enabled" : "Alerts disabled");
      fetchConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error updating setting";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    try {
      const res = await fetch("/api/admin/developer/test-alert", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send test alert");
      toast.success("Test alert sent!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error sending test alert";
      toast.error(message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading developer settings...</div>;
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Developer Settings</h1>
        <p className="text-muted-foreground">
          Configure developer emails and error monitoring thresholds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Error Alert Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Error Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send email when error threshold is reached
              </p>
            </div>
            <Checkbox
              checked={config?.enabled ?? false}
              onCheckedChange={(checked) => handleToggleEnabled(!!checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="threshold">Error Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 4)}
              />
            </div>
            <Button onClick={handleSaveThreshold} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Threshold
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Alert will be sent when the same error occurs {config?.errorThreshold || 4}+ times
          </div>

          {config?.lastAlertSent && (
            <div className="text-sm text-muted-foreground">
              Last alert sent: {new Date(config.lastAlertSent).toLocaleString()}
            </div>
          )}

          <Button variant="outline" onClick={handleTestAlert}>
            <Mail className="w-4 h-4 mr-2" />
            Send Test Alert
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Developer Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="developer@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
            />
            <Button onClick={handleAddEmail} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {config?.emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded border border-dashed">
              <Mail className="w-8 h-8 mx-auto mb-4 opacity-50" />
              No developer emails configured
            </div>
          ) : (
            <div className="space-y-2">
              {config?.emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function DeveloperLoading() {
  return (
    <div className="p-8 text-center text-muted-foreground animate-pulse">
      Loading developer settings...
    </div>
  );
}

export default function DeveloperAdminPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
      <Suspense fallback={<DeveloperLoading />}>
        <DeveloperContent />
      </Suspense>
    </div>
  );
}