"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteSupplierDocumentAction, uploadSupplierDocumentAction } from "@/lib/actions/suppliers";
import { SUPPLIER_DOCUMENT_KINDS } from "@/lib/validation/suppliers";
import { usePermission } from "@/lib/org-context";
import type { Tables } from "@/types/supabase-helpers";

const KIND_LABELS: Record<(typeof SUPPLIER_DOCUMENT_KINDS)[number], string> = {
  contract: "Contrat",
  document: "Document",
};

export function DocumentsPanel({
  orgSlug,
  orgId,
  supplierId,
  documents,
}: {
  orgSlug: string;
  orgId: string;
  supplierId: string;
  documents: Tables<"supplier_documents">[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof SUPPLIER_DOCUMENT_KINDS)[number]>("document");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const canEdit = usePermission("suppliers.edit");
  const router = useRouter();

  function reset() {
    setKind("document");
    setTitle("");
    setStartDate("");
    setEndDate("");
    setValue("");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function submit() {
    if (!file || !title.trim()) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", title);
    formData.set("kind", kind);
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    formData.set("value", value);
    startTransition(async () => {
      const result = await uploadSupplierDocumentAction(orgSlug, orgId, supplierId, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Fichier téléversé.");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(documentId: string) {
    startTransition(async () => {
      const result = await deleteSupplierDocumentAction(orgSlug, documentId);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents et contrats</CardTitle>
      </CardHeader>
      <CardContent>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="mb-4">
                <Plus /> Ajouter un document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un document</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium">Titre</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_DOCUMENT_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {kind === "contract" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Début</label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fin</label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Valeur ($)</label>
                      <Input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Fichier</label>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    className="block w-full text-sm file:mr-3 file:h-8 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:text-sm"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={pending || !file || !title.trim()}>
                  {pending ? "Téléversement…" : "Téléverser"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document pour le moment.</p>
        ) : (
          <ul className="grid gap-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{doc.title}</span>
                <span className="text-xs text-muted-foreground">{KIND_LABELS[doc.kind]}</span>
                {doc.value != null && <span className="text-xs text-muted-foreground">{doc.value.toFixed(2)} $</span>}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => handleDelete(doc.id)}
                    disabled={pending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
