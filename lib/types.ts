import type { UserRole } from "@/models/User";

export type JwtPayload = {
  sub: string;
  role: UserRole;
  organizationId: string;
  email: string;
};
