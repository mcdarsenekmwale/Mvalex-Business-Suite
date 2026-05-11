"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMemo, useState } from "react";

const TYPES = ["TICKET_CREATED", "TICKET_ASSIGNED", "TICKET_RESPONDED", "TICKET_RESOLVED", "CREDIT_LOW", "CREDIT_ADDED", "SYSTEM_ALERT"];
const CHANNELS = ["IN_APP", "EMAIL", "PUSH"];

type Pref = { type: string; channel: string; enabled: boolean };

export default function NotificationPreferencesPage() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      return res.json();
    },
  });

  const existing: Pref[] = data?.preferences || [];
  const [draft, setDraft] = useState<Record<string, boolean>>({});

  const matrix = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const type of TYPES) {
      for (const channel of CHANNELS) {
        const key = `${type}:${channel}`;
        const row = existing.find((p) => p.type === type && p.channel === channel);
        map.set(key, row ? row.enabled : true);
      }
    }
    Object.entries(draft).forEach(([key, val]) => map.set(key, val));
    return map;
  }, [existing, draft]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const preferences = [...matrix.entries()].map(([key, enabled]) => {
        const [type, channel] = key.split(":");
        return { type, channel, enabled };
      });
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Preferences saved");
      setDraft({});
      await refetch();
    },
    onError: () => toast.error("Failed to save preferences"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Preferences</h1>
        <p className="text-muted-foreground">Choose which updates you want to receive per channel.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Matrix</CardTitle>
          <CardDescription>Toggle notification categories by delivery channel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-36 animate-pulse rounded bg-muted" />
          ) : (
            TYPES.map((type) => (
              <div key={type} className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4 last:border-0">
                <div>
                  <p className="font-medium">{type.replaceAll("_", " ")}</p>
                </div>
                {CHANNELS.map((channel) => {
                  const key = `${type}:${channel}`;
                  const enabled = matrix.get(key) ?? true;
                  return (
                    <div key={channel} className="flex items-center justify-between rounded border p-3">
                      <Label htmlFor={key}>{channel}</Label>
                      <Switch
                        id={key}
                        checked={enabled}
                        onCheckedChange={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
                      />
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
