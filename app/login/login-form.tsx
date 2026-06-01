"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getAccessToken, setAccessToken } from "@/lib/access-token";
import { invalidateSessionMeCache } from "@/lib/fetch-session-me";
import { queryKeys } from "@/lib/query-keys";
import { prefetchAppData } from "@/lib/prefetch-app-data";
import type { UserRole } from "@/lib/user-roles";
import { resolveApiUrl } from "@/lib/api-base";
import {
  clearRememberedLogin,
  readRememberedLogin,
  writeRememberedLogin,
  type RememberedLogin,
} from "@/lib/login-remember";

type LoginUser = {
  id: string;
  name?: string;
  email: string;
  role: string;
};

function OrOnboardBlock({ onOnboardNewLocation }: { onOnboardNewLocation?: () => void }) {
  return (
    <div className="pt-2">
      <div className="relative py-3" role="separator" aria-label="Other options">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="h-px w-full bg-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white/90 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            OR
          </span>
        </div>
      </div>
      {onOnboardNewLocation ? (
        <button
          type="button"
          onClick={onOnboardNewLocation}
          className="mt-1 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Onboard New Location
        </button>
      ) : (
        <a
          href="https://mokanco.com"
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Onboard New Location
        </a>
      )}
    </div>
  );
}

type LoginFormProps = {
  onOnboardNewLocation?: () => void;
};

export function LoginForm({ onOnboardNewLocation }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const [savedSession, setSavedSession] = useState<RememberedLogin | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace(from.startsWith("/") ? from : "/dashboard");
    }
  }, [router, from]);

  useEffect(() => {
    setSavedSession(readRememberedLogin());
  }, []);

  const performLogin = useCallback(
    async (
      loginEmail: string,
      loginPassword: string,
      persistToken: boolean,
      saveRemember: boolean,
    ) => {
      const res = await fetch(resolveApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        token?: string;
        user?: LoginUser;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not sign in");
        return false;
      }
      if (typeof data.token === "string" && data.token.length > 0) {
        invalidateSessionMeCache();
        queryClient.clear();
        setAccessToken(data.token, { persist: persistToken });
        if (!getAccessToken()) {
          setError("Could not save sign-in session. Check browser storage settings and try again.");
          return false;
        }
        const role = data.user?.role;
        if (role === "admin" || role === "support" || role === "partner") {
          await prefetchAppData(queryClient, role as UserRole);
        }
      } else {
        setError("Server did not return a token");
        return false;
      }

      if (saveRemember && data.user) {
        writeRememberedLogin({
          email: loginEmail.trim(),
          name:
            (data.user.name && String(data.user.name).trim()) ||
            loginEmail.split("@")[0] ||
            "there",
          password: loginPassword,
        });
      } else {
        clearRememberedLogin();
      }

      router.push(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
      return true;
    },
    [from, router, queryClient],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await performLogin(email, password, rememberMe, rememberMe);
    } finally {
      setLoading(false);
    }
  }

  async function quickSignInWithSaved() {
    if (!savedSession) return;
    setError(null);
    setLoading(true);
    try {
      const ok = await performLogin(
        savedSession.email,
        savedSession.password,
        true,
        true,
      );
      if (!ok) {
        clearRememberedLogin();
        setSavedSession(null);
      }
    } finally {
      setLoading(false);
    }
  }

  function useDifferentAccount() {
    clearRememberedLogin();
    setSavedSession(null);
    setEmail("");
    setPassword("");
    setRememberMe(true);
    setError(null);
  }

  if (savedSession) {
    return (
      <div className="space-y-4">
        <p className="pb-1 text-center text-lg font-semibold tracking-tight text-slate-900 lg:hidden">
          Welcome back, {savedSession.name}
        </p>
        <button
          type="button"
          onClick={() => void quickSignInWithSaved()}
          disabled={loading}
          aria-busy={loading}
          className="w-full rounded-xl border-2 border-[#2a2a2a] bg-white px-4 py-3.5 text-center shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block text-sm font-medium text-slate-600">Log in as</span>
          <span className="mt-1 block break-all text-base font-semibold text-slate-900">
            {savedSession.email}
          </span>
        </button>
        <div className="relative py-1" role="separator" aria-label="Other options">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="h-px w-full bg-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white/90 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              OR
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={useDifferentAccount}
          className="w-full text-center text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
        >
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <label className="flex cursor-pointer select-none items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => {
                const checked = e.target.checked;
                setRememberMe(checked);
                if (!checked) clearRememberedLogin();
              }}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="pointer-events-none flex h-4 w-4 items-center justify-center rounded border-2 border-neutral-400 bg-white/95 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-400/50 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-white/90 peer-checked:border-[#2a2a2a] peer-checked:bg-[#2a2a2a] [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100"
            >
              <Check className="h-3 w-3 text-white" strokeWidth={2.75} />
            </span>
          </span>
          <span className="text-sm text-slate-600">Remember me</span>
        </span>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        type="submit"
        className="w-full !bg-[#2a2a2a] !from-[#2a2a2a] !via-[#2a2a2a] !to-[#2a2a2a] shadow-none hover:!from-[#383838] hover:!via-[#383838] hover:!to-[#383838] focus-visible:outline-neutral-600"
        disabled={loading}
      >
        {loading ? "Signing in…" : "Continue"}
      </Button>
      {/* <OrOnboardBlock onOnboardNewLocation={onOnboardNewLocation} /> */}
    </form>
  );
}
