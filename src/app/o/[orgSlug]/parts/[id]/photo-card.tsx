"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadPartPhotoAction } from "@/lib/actions/parts";
import { usePermission } from "@/lib/org-context";

export function PhotoCard({
  orgSlug,
  orgId,
  partId,
  photoUrl,
}: {
  orgSlug: string;
  orgId: string;
  partId: string;
  photoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const canEdit = usePermission("parts.edit");
  const router = useRouter();

  function handleFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadPartPhotoAction(orgSlug, orgId, partId, formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Photo mise à jour.");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Photo de la pièce" className="max-h-48 rounded-md border object-contain" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
              <Upload /> {photoUrl ? "Remplacer" : "Téléverser"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
