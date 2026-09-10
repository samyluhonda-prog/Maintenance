"use client";

import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importEquipmentCsvAction } from "@/lib/actions/equipment";

export function ImportCsvDialog({ orgSlug, orgId }: { orgSlug: string; orgId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(file: File) {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setPending(true);
        const result = await importEquipmentCsvAction(orgSlug, orgId, results.data as unknown[]);
        setPending(false);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.data!.imported} équipement(s) importé(s)${result.data!.failed ? `, ${result.data!.failed} ligne(s) ignorée(s)` : ""}.`);
        setOpen(false);
        router.refresh();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload /> Importer CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer des équipements (CSV)</DialogTitle>
          <DialogDescription>
            Colonnes attendues : name, internal_code, category, manufacturer, model, serial_number,
            criticality (low/medium/high/critical), status (operational/down/in_repair/decommissioned/standby).
          </DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
          {fileName ?? "Choisir un fichier CSV"}
        </Button>
        <DialogFooter>{pending && <p className="text-sm text-muted-foreground">Importation en cours…</p>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
