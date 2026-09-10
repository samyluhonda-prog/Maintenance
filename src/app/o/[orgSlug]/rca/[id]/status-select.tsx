"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateRcaStatusAction } from "@/lib/actions/rca";

const LABELS: Record<string, string> = { open: "Ouverte", in_progress: "En cours", completed: "Terminée" };

export function StatusSelect({ orgSlug, rcaId, status }: { orgSlug: string; rcaId: string; status: string }) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Select
      value={status}
      onValueChange={(value) =>
        startTransition(async () => {
          await updateRcaStatusAction(orgSlug, rcaId, value as "open" | "in_progress" | "completed");
          router.refresh();
        })
      }
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
