"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, ChevronsUpDown, LogOut, Menu, QrCode, Settings, UserRound } from "lucide-react";
import { useTransition } from "react";

import { LogoMark } from "@/components/auth/logo-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS } from "@/lib/nav-config";
import { signOutAction } from "@/lib/auth/actions";
import { useOrg, usePermission } from "@/lib/org-context";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type OrgOption = { orgId: string; orgSlug: string; orgName: string };

export function AppTopbar({ orgOptions }: { orgOptions: OrgOption[] }) {
  const { orgSlug, orgName, userFullName } = useOrg();
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <header className="flex h-14 items-center gap-2 border-b bg-card px-3 sm:px-4">
      <MobileNav orgSlug={orgSlug} orgName={orgName} pathname={pathname} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="hidden gap-1 md:inline-flex">
            {orgName}
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Organisations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {orgOptions.map((o) => (
            <DropdownMenuItem
              key={o.orgId}
              onSelect={() => startTransition(() => router.push(`/o/${o.orgSlug}/dashboard`))}
            >
              {o.orgName}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/onboarding">Créer une organisation</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" asChild title="Scanner un code QR">
        <Link href={`/o/${orgSlug}/scan`}>
          <QrCode className="size-4" />
        </Link>
      </Button>

      <Button variant="ghost" size="icon" asChild title={t("notifications")}>
        <Link href={`/o/${orgSlug}/notifications`}>
          <Bell className="size-4" />
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title={userFullName}>
            <UserRound className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="truncate">{userFullName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/o/${orgSlug}/settings/profile`}>
              <Settings className="size-4" /> {t("profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void signOutAction()}>
            <LogOut className="size-4" /> Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function MobileNav({ orgSlug, orgName, pathname }: { orgSlug: string; orgName: string; pathname: string }) {
  const t = useTranslations("nav");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex items-center gap-2 px-4 py-4">
          <LogoMark className="size-6" />
          <span className="truncate text-sm font-semibold">{orgName}</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 pb-4">
          {NAV_ITEMS.map((item) => (
            <MobileNavLink key={item.key} item={item} orgSlug={orgSlug} pathname={pathname} label={t(item.key)} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavLink({
  item,
  orgSlug,
  pathname,
  label,
}: {
  item: (typeof NAV_ITEMS)[number];
  orgSlug: string;
  pathname: string;
  label: string;
}) {
  const allowed = usePermission(item.permission ?? "");
  if (item.permission && !allowed) return null;
  const href = `/o/${orgSlug}${item.href}`;
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}
