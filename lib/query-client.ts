import { QueryClient } from "@tanstack/react-query";

/** Reuse cached data when revisiting pages (avoids refetch on every navigation). */
export const DEFAULT_STALE_MS = 2 * 60 * 1000;
export const DEFAULT_GC_MS = 10 * 60 * 1000;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_MS,
        gcTime: DEFAULT_GC_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
