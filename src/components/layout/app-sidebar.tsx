"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { LogoMark } from "@/components/auth/logo-mark";
import { NAV_ITEMS } from "@/lib/nav-config";
import { useOrg, usePermission } from "@/lib/org-context";
import { cn } from "@/lib/utils";

function NavLink({ item, orgSlug, pathname }: { item: (typeof NAV_ITEMS)[number]; orgSlug: string; pathname: string }) {
  const t = useTranslations("nav");
  const allowed = usePermission(item.permission ?? "");
  const href = `/o/${orgSlug}${item.href}`;
  const active = pathname === href || pathname.startsWith(href + "/");

  if (item.permission && !allowed) return null;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span className="truncate">{t(item.key)}</span>
    </Link>
  );
}

export function AppSidebar() {
  const { orgSlug, orgName } = useOrg();
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <LogoMark className="size-6" />
        <span className="truncate text-sm font-semibold">{orgName}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.key} item={item} orgSlug={orgSlug} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
