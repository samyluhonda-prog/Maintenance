"use client";

import { useRouter } from "next/navigation";
import { Paperclip, Upload } from "lucide-react";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadRequestAttachmentAction } from "@/lib/actions/requests";
import type { Tables } from "@/types/supabase-helpers";

export function RequestAttachments({
  orgSlug,
  orgId,
  requestId,
  attachments,
  canUpload,
}: {
  orgSlug: string;
  orgId: string;
  requestId: string;
  attachments: Tables<"request_attachments">[];
  canUpload: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadRequestAttachmentAction(orgSlug, orgId, requestId, formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Fichier ajouté.");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2">
      {attachments.length === 0 && <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>}
      <ul className="grid gap-1">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm">
            <Paperclip className="size-3.5 text-muted-foreground" />
            {a.file_name}
          </li>
        ))}
      </ul>
      {canUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            <Upload /> Joindre une photo ou un fichier
          </Button>
        </>
      )}
    </div>
  );
}
