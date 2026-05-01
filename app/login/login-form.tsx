"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getAccessToken, setAccessToken } from "@/lib/access-token";
import { invalidateSessionMeCache } from "@/lib/fetch-session-me";
import { resolveApiUrl } from "@/lib/api-base";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(resolveApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not sign in");
        return;
      }
      if (typeof data.token === "string" && data.token.length > 0) {
        invalidateSessionMeCache();
        setAccessToken(data.token, { persist: rememberMe });
      } else {
        setError("Server did not return a token");
        return;
      }
      router.push(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => setRememberMe(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="pointer-events-none flex h-4 w-4 items-center justify-center rounded border-2 border-primary-600 bg-white/95 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/50 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-white/90 peer-checked:border-primary-900 peer-checked:bg-primary-700 [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100"
            >
              <Check className="h-3 w-3 text-amber-50" strokeWidth={2.75} />
            </span>
          </span>
          <span className="text-sm text-slate-600">Remember me</span>
        </span>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Signing in…" : "Continue"}
      </Button>
    </form>
  );
}
