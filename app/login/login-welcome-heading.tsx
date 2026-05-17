"use client";

import { useEffect, useState } from "react";
import { readRememberedLogin } from "@/lib/login-remember";

export function LoginWelcomeHeading() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(readRememberedLogin()?.name ?? null);
  }, []);

  if (name) {
    return (
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Welcome back, {name}
      </h2>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Hello!
      </h2>
      <p className="mt-2 text-sm text-slate-500">Please sign in to access the portal.</p>
    </>
  );
}
