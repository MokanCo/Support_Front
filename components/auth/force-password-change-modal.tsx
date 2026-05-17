"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/auth-fetch";
import { sessionQueryOptions } from "@/lib/queries/session";
import { invalidateSessionMeCache } from "@/lib/fetch-session-me";
import { clearRememberedLogin } from "@/lib/login-remember";
import { PARTNER_TOUR_PENDING_KEY } from "@/lib/partner-product-tour";
import { getAccessToken } from "@/lib/access-token";

export function ForcePasswordChangeModal({ open }: { open: boolean }) {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open || typeof document === "undefined") return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      if (!getAccessToken()) {
        throw new Error("Your session expired. Please sign in again.");
      }
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to update password");
      }
      invalidateSessionMeCache();
      clearRememberedLogin();
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey });
      const session = queryClient.getQueryData<{
        user?: { role?: string };
      }>(sessionQueryOptions.queryKey);
      if (session?.user?.role === "partner" && typeof window !== "undefined") {
        sessionStorage.setItem(PARTNER_TOUR_PENDING_KEY, "1");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[700] flex min-h-[100dvh] items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
      >
        <h2 id="force-password-title" className="text-lg font-semibold text-slate-900">
          Set a new password
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          For security, you must choose a new password before continuing. This step cannot be
          skipped.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Updating…" : "Update password and continue"}
          </Button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
