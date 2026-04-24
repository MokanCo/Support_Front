"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/models/User";
import type { TicketPriority } from "@/models/Ticket";
import { getQuickTicketTemplate } from "@/lib/quick-ticket-templates";
import { apiFetch } from "@/lib/auth-fetch";

type Loc = { id: string; name: string };

type Props = {
  role: UserRole;
  /** Prefill from quick-ticket template id (URL `quick=`) */
  quickTemplateId?: string | null;
  onSuccess?: (ticketId: string) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  submitLabel?: string;
};

export function CreateTicketForm({
  role,
  quickTemplateId,
  onSuccess,
  onCancel,
  showCancel,
  submitLabel = "Create ticket",
}: Props) {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [locationId, setLocationId] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsLoc = role === "admin" || role === "support";
  const showPriorityDeadline = role !== "partner";

  useEffect(() => {
    if (!needsLoc) return;
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "200",
          sort: "name",
          order: "asc",
        });
        const res = await apiFetch(`/api/locations?${params}`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          const list = (data.locations ?? []) as Loc[];
          setLocs(list);
          if (list[0]?.id) setLocationId(list[0].id);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsLoc]);

  useEffect(() => {
    const t = getQuickTicketTemplate(quickTemplateId);
    if (t) {
      setTitle(t.title);
      setDescription(t.body);
      setCategory(t.category);
    } else {
      setTitle("");
      setDescription("");
      setCategory("General");
    }
  }, [quickTemplateId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        category,
      };
      if (showPriorityDeadline) {
        body.priority = priority;
        if (deadlineLocal) {
          body.deadline = new Date(deadlineLocal).toISOString();
        }
      }
      if (needsLoc) {
        if (!locationId) {
          setError("Select a location");
          setSaving(false);
          return;
        }
        body.locationId = locationId;
      }
      const res = await apiFetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      onSuccess?.(data.id as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {needsLoc ? (
        <Select
          label="Location"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          required
        >
          {locs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      ) : null}

      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Input
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      {showPriorityDeadline ? (
        <>
          <Input
            label="Deadline"
            type="datetime-local"
            value={deadlineLocal}
            onChange={(e) => setDeadlineLocal(e.target.value)}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        {showCancel && onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={saving || (needsLoc && locs.length === 0)}>
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
