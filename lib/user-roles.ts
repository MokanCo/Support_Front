/** Shared role literals — safe to import from client components (no Mongoose). */
export const USER_ROLES = ["admin", "support", "partner"] as const;
export type UserRole = (typeof USER_ROLES)[number];
