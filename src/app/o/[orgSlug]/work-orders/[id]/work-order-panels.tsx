"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Paperclip, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addTimeLogAction,
  addWorkOrderCommentAction,
  addWorkOrderPartAction,
  addWorkOrderTaskAction,
  toggleWorkOrderTaskAction,
  uploadWorkOrderAttachmentAction,
} from "@/lib/actions/work-orders";
import type { Tables } from "@/types/supabase-helpers";

export function TasksPanel({
  orgSlug,
  orgId,
  workOrderId,
  tasks,
}: {
  orgSlug: string;
  orgId: string;
  workOrderId: string;
  tasks: Tables<"work_order_tasks">[];
}) {
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function addTask() {
    startTransition(async () => {
      const result = await addWorkOrderTaskAction(orgSlug, orgId, workOrderId, label);
      if (result.error) toast.error(result.error);
      else {
        setLabel("");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <label key={task.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={task.is_done}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                await toggleWorkOrderTaskAction(orgSlug, task.id, !!checked);
                router.refresh();
              })
            }
          />
          <span className={task.is_done ? "text-muted-foreground line-through" : ""}>{task.label}</span>
        </label>
      ))}
      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ajouter une tâche…"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTask())}
        />
        <Button type="button" variant="outline" onClick={addTask} disabled={pending || !label.trim()}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function PartsPanel({
  orgSlug,
  orgId,
  workOrderId,
  usedParts,
  availableParts,
}: {
  orgSlug: string;
  orgId: string;
  workOrderId: string;
  usedParts: (Tables<"work_order_parts"> & { parts: { name: string } | null })[];
  availableParts: Pick<Tables<"parts">, "id" | "name" | "quantity_on_hand" | "unit">[];
}) {
  const [partId, setPartId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function addPart() {
    if (!partId) return;
    startTransition(async () => {
      const result = await addWorkOrderPartAction(orgSlug, orgId, workOrderId, partId, Number(quantity));
      if (result.error) toast.error(result.error);
      else {
        setPartId("");
        setQuantity("1");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-1 text-sm">
        {usedParts.map((p) => (
          <li key={p.id} className="flex justify-between border-b py-1 last:border-b-0">
            <span>{p.parts?.name ?? "Pièce"}</span>
            <span className="text-muted-foreground">
              {p.quantity_used} × {p.unit_cost} $
            </span>
          </li>
        ))}
        {usedParts.length === 0 && <p className="text-muted-foreground">Aucune pièce utilisée.</p>}
      </ul>
      <div className="flex gap-2">
        <Select value={partId} onValueChange={setPartId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Choisir une pièce" />
          </SelectTrigger>
          <SelectContent>
            {availableParts.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.quantity_on_hand} {p.unit} en stock)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min="1"
          className="w-20"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={addPart} disabled={pending || !partId}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function TimePanel({
  orgSlug,
  orgId,
  workOrderId,
  logs,
}: {
  orgSlug: string;
  orgId: string;
  workOrderId: string;
  logs: (Tables<"work_order_time_logs"> & { profiles: { full_name: string } | null })[];
}) {
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const result = await addTimeLogAction(orgSlug, orgId, workOrderId, { startedAt, endedAt, note: "" });
      if (result.error) toast.error(result.error);
      else {
        setStartedAt("");
        setEndedAt("");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-1 text-sm">
        {logs.map((log) => (
          <li key={log.id} className="flex justify-between border-b py-1 last:border-b-0">
            <span>{log.profiles?.full_name ?? "Utilisateur"}</span>
            <span className="text-muted-foreground">{Math.round((log.minutes ?? 0) / 6) / 10} h</span>
          </li>
        ))}
        {logs.length === 0 && <p className="text-muted-foreground">Aucune heure enregistrée.</p>}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Début</label>
          <Input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Fin</label>
          <Input type="datetime-local" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />
        </div>
        <Button type="button" variant="outline" onClick={submit} disabled={pending || !startedAt || !endedAt}>
          <Plus /> Ajouter
        </Button>
      </div>
    </div>
  );
}

export function CommentsPanel({
  orgSlug,
  orgId,
  workOrderId,
  comments,
}: {
  orgSlug: string;
  orgId: string;
  workOrderId: string;
  comments: (Tables<"work_order_comments"> & { profiles: { full_name: string } | null })[];
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const result = await addWorkOrderCommentAction(orgSlug, orgId, workOrderId, body);
      if (result.error) toast.error(result.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-3 text-sm">
        {comments.map((c) => (
          <li key={c.id} className="rounded-md bg-secondary/50 p-2">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{c.profiles?.full_name ?? "Utilisateur"}</span>
              <span>{new Date(c.created_at).toLocaleString("fr-CA")}</span>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
        {comments.length === 0 && <p className="text-muted-foreground">Aucun commentaire.</p>}
      </ul>
      <div className="flex gap-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Ajouter un commentaire…" />
        <Button type="button" variant="outline" onClick={submit} disabled={pending || !body.trim()}>
          Envoyer
        </Button>
      </div>
    </div>
  );
}

export function AttachmentsPanel({
  orgSlug,
  orgId,
  workOrderId,
  attachments,
}: {
  orgSlug: string;
  orgId: string;
  workOrderId: string;
  attachments: Tables<"work_order_attachments">[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadWorkOrderAttachmentAction(orgSlug, orgId, workOrderId, formData);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-1 text-sm">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <Paperclip className="size-3.5 text-muted-foreground" />
            {a.file_name}
          </li>
        ))}
        {attachments.length === 0 && <p className="text-muted-foreground">Aucun fichier.</p>}
      </ul>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
        <Upload /> Ajouter un fichier
      </Button>
    </div>
  );
}
