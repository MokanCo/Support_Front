import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BadgePercent,
  ChartNoAxesCombined,
  CreditCard,
  FileSpreadsheet,
  FileText,
  HandCoins,
  History,
  LayoutTemplate,
  Package,
  Repeat,
  ScrollText,
  Settings2,
  Upload,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/user-roles";

export type AccountsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: readonly UserRole[];
  tag?: string;
};

export type AccountsNavGroup = {
  id: string;
  label?: string;
  items: AccountsNavItem[];
};

/**
 * Accounts navigation.
 * Partners only see Insights / Invoices / Reports — not company-wide admin tools.
 */
export const ACCOUNTS_NAV: AccountsNavGroup[] = [
  {
    id: "primary",
    items: [
      {
        href: "/dashboard/ar",
        label: "Insights",
        icon: ChartNoAxesCombined,
        roles: ["partner"],
      },
      {
        href: "/dashboard/ar",
        label: "Dashboard",
        icon: ChartNoAxesCombined,
        roles: ["admin", "support"],
      },
      {
        href: "/dashboard/ar/invoices",
        label: "Invoices",
        icon: FileText,
      },
      {
        href: "/dashboard/ar/reports",
        label: "Reports",
        icon: FileSpreadsheet,
      },
      // Staff-only finance surfaces
      {
        href: "/dashboard/ar/receivable",
        label: "Receivable",
        icon: HandCoins,
        roles: ["admin", "support"],
      },
      {
        href: "/dashboard/ar/payments",
        label: "Payments",
        icon: CreditCard,
        roles: ["admin", "support"],
      },
      {
        href: "/dashboard/ar/customers",
        label: "Customers",
        icon: Users,
        roles: ["admin", "support"],
      },
      {
        href: "/dashboard/ar/transactions",
        label: "Transactions",
        icon: ArrowLeftRight,
        roles: ["admin", "support"],
      },
      {
        href: "/dashboard/ar/templates",
        label: "Templates",
        icon: LayoutTemplate,
        roles: ["admin"],
      },
      {
        href: "/dashboard/ar/settings",
        label: "Settings",
        icon: Settings2,
        roles: ["admin"],
      },
    ],
  },
  {
    id: "operations",
    label: "Billing operations",
    items: [
      {
        href: "/dashboard/ar/products",
        label: "Products",
        icon: Package,
        roles: ["admin"],
      },
      {
        href: "/dashboard/ar/recurring",
        label: "Recurring",
        icon: Repeat,
        roles: ["admin"],
      },
      {
        href: "/dashboard/ar/credits",
        label: "Credits",
        icon: BadgePercent,
        roles: ["admin", "support"],
      },
      {
        href: "/dashboard/ar/statements",
        label: "Statements",
        icon: ScrollText,
        roles: ["admin", "support"],
      },
      {
        href: "/dashboard/ar/import",
        label: "Import",
        icon: Upload,
        roles: ["admin"],
      },
      {
        href: "/dashboard/ar/audit",
        label: "Audit logs",
        icon: History,
        roles: ["admin", "support"],
      },
    ],
  },
];

export function accountsNavForRole(role: UserRole): AccountsNavGroup[] {
  return ACCOUNTS_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.roles || (item.roles as readonly string[]).includes(role),
    ),
  })).filter((group) => group.items.length > 0);
}

export function isAccountsNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard/ar") return pathname === "/dashboard/ar";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function accountsTitle(
  pathname: string,
  role?: UserRole,
): { title: string; description: string } {
  const partner = role === "partner";
  const map: Record<string, { title: string; description: string }> = {
    "/dashboard/ar": partner
      ? {
          title: "Insights",
          description: "What you owe, what’s paid, and what’s overdue",
        }
      : {
          title: "Dashboard",
          description: "Your invoices and balances at a glance",
        },
    "/dashboard/ar/receivable": {
      title: "Receivable",
      description: "Outstanding balances, aging, and collection progress",
    },
    "/dashboard/ar/payable": {
      title: "Payable",
      description: "Bills and vendor obligations",
    },
    "/dashboard/ar/invoices": partner
      ? {
          title: "Invoices",
          description: "Bills sent to you — pay in full or partially",
        }
      : {
          title: "Invoices",
          description: "View, filter, and manage invoices",
        },
    "/dashboard/ar/payments": {
      title: "Payments",
      description: "Verify customer submissions and record receipts",
    },
    "/dashboard/ar/customers": {
      title: "Customers",
      description: "Billing profiles and account balances per partner",
    },
    "/dashboard/ar/vendors": {
      title: "Vendors",
      description: "Suppliers and payable counterparties",
    },
    "/dashboard/ar/transactions": {
      title: "Transactions",
      description: "Unified ledger of invoices, payments, and credits",
    },
    "/dashboard/ar/reports": partner
      ? {
          title: "Reports",
          description: "Payable view — amounts billed to you and payments you made",
        }
      : {
          title: "Reports",
          description: "Revenue, collections, aging, and payment history",
        },
    "/dashboard/ar/templates": {
      title: "Templates",
      description: "Invoice template library and live preview",
    },
    "/dashboard/ar/settings": {
      title: "Settings",
      description: "Numbering, currency, terms, Zelle, and branding",
    },
    "/dashboard/ar/products": {
      title: "Products & services",
      description: "Reusable billable items",
    },
    "/dashboard/ar/recurring": {
      title: "Recurring billing",
      description: "Templates that generate invoices automatically",
    },
    "/dashboard/ar/credits": {
      title: "Credits",
      description: "Credit notes, discounts, refunds, and write-offs",
    },
    "/dashboard/ar/statements": {
      title: "Statements",
      description: "Period statements issued to customers",
    },
    "/dashboard/ar/import": {
      title: "Import & migration",
      description: "Bring existing billing data into the portal",
    },
    "/dashboard/ar/audit": {
      title: "Audit logs",
      description: "Every action recorded across the Accounts module",
    },
  };
  return (
    map[pathname] ?? {
      title: "Accounts",
      description: partner ? "Your bills and payments" : "Billing and receivables",
    }
  );
}
