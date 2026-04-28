import type { UserRole } from "@/lib/user-roles";

export type JwtPayload = {
  sub: string;
  role: UserRole;
  organizationId: string;
  email: string;
};
