import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BadgePercent,
  Banknote,
  Building2,
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
  /** Shown as a small trailing tag, e.g. for modules that are not live yet. */
  tag?: string;
};

export type AccountsNavGroup = {
  id: string;
  /** Undefined for the primary group, which renders without a heading. */
  label?: string;
  items: AccountsNavItem[];
};

/**
 * Accounts navigation. The first group mirrors the finance module structure;
 * the second keeps the existing billing operations reachable without cluttering
 * the primary list.
 */
export const ACCOUNTS_NAV: AccountsNavGroup[] = [
  {
    id: "primary",
    items: [
      { href: "/dashboard/ar", label: "Insights", icon: ChartNoAxesCombined },
      { href: "/dashboard/ar/receivable", label: "Receivable", icon: HandCoins },
      // Commented out until Payable is ready for release — keep the entry so it's a one-line restore.
      // {
      //   href: "/dashboard/ar/payable",
      //   label: "Payable",
      //   icon: Banknote,
      //   roles: ["admin", "support"],
      // },
      { href: "/dashboard/ar/invoices", label: "Invoices", icon: FileText },
      { href: "/dashboard/ar/payments", label: "Payments", icon: CreditCard },
      { href: "/dashboard/ar/customers", label: "Customers", icon: Users },
      // Commented out until Vendors is ready for release — keep the entry so it's a one-line restore.
      // {
      //   href: "/dashboard/ar/vendors",
      //   label: "Vendors",
      //   icon: Building2,
      //   roles: ["admin", "support"],
      // },
      {
        href: "/dashboard/ar/transactions",
        label: "Transactions",
        icon: ArrowLeftRight,
      },
      { href: "/dashboard/ar/reports", label: "Reports", icon: FileSpreadsheet },
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
      { href: "/dashboard/ar/credits", label: "Credits", icon: BadgePercent },
      { href: "/dashboard/ar/statements", label: "Statements", icon: ScrollText },
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

/** Page title shown in the module header for a given route. */
export function accountsTitle(pathname: string): { title: string; description: string } {
  const map: Record<string, { title: string; description: string }> = {
    "/dashboard/ar": {
      title: "Insights",
      description: "Revenue, collections, and receivable health at a glance",
    },
    "/dashboard/ar/receivable": {
      title: "Receivable",
      description: "Outstanding balances, aging, and collection progress",
    },
    "/dashboard/ar/payable": {
      title: "Payable",
      description: "Bills and vendor obligations",
    },
    "/dashboard/ar/invoices": {
      title: "Invoices",
      description: "Create, approve, send, and track every invoice",
    },
    "/dashboard/ar/payments": {
      title: "Payments",
      description: "Recorded receipts and settlement history",
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
    "/dashboard/ar/reports": {
      title: "Reports",
      description: "Financial reporting with charts, summaries, and exports",
    },
    "/dashboard/ar/templates": {
      title: "Templates",
      description: "Invoice template library and live preview",
    },
    "/dashboard/ar/settings": {
      title: "Settings",
      description: "Numbering, currency, terms, and branding defaults",
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
      description: "Billing and receivables",
    }
  );
}
