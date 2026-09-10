"use client";

import { useRouter } from "next/navigation";
import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteEquipmentDocumentAction, uploadEquipmentDocumentAction } from "@/lib/actions/equipment";
import type { Tables } from "@/types/supabase-helpers";

const KIND_LABELS: Record<string, string> = {
  photo: "Photo",
  manual: "Manuel",
  plan: "Plan",
  document: "Document",
};

export function DocumentsPanel({
  orgSlug,
  orgId,
  equipmentId,
  documents,
}: {
  orgSlug: string;
  orgId: string;
  equipmentId: string;
  documents: Tables<"equipment_documents">[];
}) {
  const [kind, setKind] = useState<"photo" | "manual" | "plan" | "document">("photo");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadEquipmentDocumentAction(orgSlug, orgId, equipmentId, kind, formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Fichier téléversé.");
        router.refresh();
      }
    });
  }

  function handleDelete(documentId: string) {
    startTransition(async () => {
      const result = await deleteEquipmentDocumentAction(orgSlug, documentId);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos, manuels et plans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
            <Upload /> Téléverser
          </Button>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun fichier pour le moment.</p>
        ) : (
          <ul className="grid gap-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{doc.file_name}</span>
                <span className="text-xs text-muted-foreground">{KIND_LABELS[doc.kind]}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => handleDelete(doc.id)}
                  disabled={pending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
