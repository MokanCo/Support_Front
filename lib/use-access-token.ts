"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AUTH_TOKEN_CHANGED_EVENT,
  getAccessToken,
} from "@/lib/access-token";

/** Reactive access to the stored JWT (updates after login / logout). */
export function useAccessToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  const read = useCallback(() => {
    setToken(getAccessToken());
  }, []);

  useEffect(() => {
    read();
    const onChange = () => read();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [read]);

  return token;
}
