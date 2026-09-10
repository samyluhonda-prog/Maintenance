import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Inbox,
  Repeat,
  ListChecks,
  Cog,
  MapPin,
  Gauge,
  Package,
  ShoppingCart,
  Truck,
  SearchCheck,
  BarChart3,
  Zap,
  Users,
  Settings,
} from "lucide-react";

export type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  /** permission key required to see this item; omit for always-visible items */
  permission?: string;
  /** shown in the mobile bottom bar (keep this list short) */
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, mobile: true },
  { key: "myWork", href: "/my-work", icon: ListChecks, mobile: true },
  { key: "workOrders", href: "/work-orders", icon: ClipboardList, permission: "work_orders.view" },
  { key: "calendar", href: "/calendar", icon: CalendarDays, permission: "work_orders.view" },
  { key: "requests", href: "/requests", icon: Inbox, permission: "requests.view", mobile: true },
  { key: "pmPlans", href: "/pm-plans", icon: Repeat, permission: "pm_plans.view" },
  { key: "procedures", href: "/procedures", icon: ListChecks, permission: "procedures.view" },
  { key: "equipment", href: "/equipment", icon: Cog, permission: "equipment.view" },
  { key: "locations", href: "/locations", icon: MapPin, permission: "locations.view" },
  { key: "meters", href: "/meters", icon: Gauge, permission: "meters.view" },
  { key: "parts", href: "/parts", icon: Package, permission: "parts.view" },
  { key: "purchasing", href: "/purchasing", icon: ShoppingCart, permission: "purchasing.view" },
  { key: "suppliers", href: "/suppliers", icon: Truck, permission: "suppliers.view" },
  { key: "rca", href: "/rca", icon: SearchCheck, permission: "rca.view" },
  { key: "reports", href: "/reports", icon: BarChart3, permission: "reports.view" },
  { key: "automations", href: "/automations", icon: Zap, permission: "automations.view" },
  { key: "users", href: "/users", icon: Users, permission: "users.view" },
  { key: "settings", href: "/settings", icon: Settings },
];

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.mobile);
