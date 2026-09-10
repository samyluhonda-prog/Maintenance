"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { QrCode } from "lucide-react";

import { MOBILE_NAV_ITEMS } from "@/lib/nav-config";
import { useOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";

/**
 * Bottom tab bar for phones: large touch targets (usable with work gloves),
 * the QR scanner front and center since it's the fastest path into a job on
 * the shop floor.
 */
export function MobileBottomNav() {
  const { orgSlug } = useOrg();
  const pathname = usePathname();
  const t = useTranslations("nav");

  const items = MOBILE_NAV_ITEMS.slice(0, 2);
  const rest = MOBILE_NAV_ITEMS.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t bg-card md:hidden">
      {items.map((item) => (
        <Tab key={item.key} href={`/o/${orgSlug}${item.href}`} label={t(item.key)} icon={item.icon} pathname={pathname} />
      ))}

      <Link
        href={`/o/${orgSlug}/scan`}
        className="-mt-5 flex flex-1 flex-col items-center justify-center gap-1"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
          <QrCode className="size-6" />
        </span>
      </Link>

      {rest.map((item) => (
        <Tab key={item.key} href={`/o/${orgSlug}${item.href}`} label={t(item.key)} icon={item.icon} pathname={pathname} />
      ))}
    </nav>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
        active && "text-primary",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
