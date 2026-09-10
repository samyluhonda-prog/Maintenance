"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase-helpers";

export function NotificationsList({
  orgSlug,
  orgId,
  notifications,
}: {
  orgSlug: string;
  orgId: string;
  notifications: Tables<"notifications">[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function markRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(orgSlug, id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      {unreadCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => startTransition(async () => {
            await markAllNotificationsReadAction(orgSlug, orgId);
            router.refresh();
          })}
        >
          Tout marquer comme lu ({unreadCount})
        </Button>
      )}
      {notifications.map((n) => {
        const content = (
          <div className={cn("flex items-start justify-between gap-3 rounded-md border p-3", !n.is_read && "bg-info/5")}>
            <div>
              <div className="flex items-center gap-2">
                {!n.is_read && <Badge variant="info" className="h-1.5 w-1.5 rounded-full p-0" />}
                <p className="font-medium">{n.title}</p>
              </div>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-CA")}</p>
            </div>
            {!n.is_read && (
              <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                Marquer lu
              </Button>
            )}
          </div>
        );
        return n.link ? (
          <Link key={n.id} href={n.link} onClick={() => !n.is_read && markRead(n.id)}>
            {content}
          </Link>
        ) : (
          <div key={n.id}>{content}</div>
        );
      })}
      {notifications.length === 0 && <p className="py-10 text-center text-muted-foreground">Aucune notification.</p>}
    </div>
  );
}
