"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addCorrectiveActionAction,
  addFiveWhyAction,
  addRcaCauseAction,
  deleteRcaCauseAction,
  updateCorrectiveActionStatusAction,
} from "@/lib/actions/rca";
import { RCA_CAUSE_CATEGORIES } from "@/lib/validation/rca";
import type { Tables } from "@/types/supabase-helpers";

const CATEGORY_LABELS: Record<string, string> = {
  method: "Méthode",
  machine: "Machine",
  material: "Matériel",
  man: "Main-d’œuvre",
  measurement: "Mesure",
  environment: "Environnement",
};

export function FiveWhysPanel({
  orgSlug,
  orgId,
  rcaId,
  whys,
}: {
  orgSlug: string;
  orgId: string;
  rcaId: string;
  whys: Tables<"rca_five_whys">[];
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function add() {
    startTransition(async () => {
      const result = await addFiveWhyAction(orgSlug, orgId, rcaId, whys.length + 1, { question, answer });
      if (result.error) toast.error(result.error);
      else {
        setQuestion("");
        setAnswer("");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3">
      {whys.map((w) => (
        <div key={w.id} className="rounded-md border p-3 text-sm">
          <p className="font-medium">
            {w.order_index}. {w.question}
          </p>
          <p className="text-muted-foreground">{w.answer}</p>
        </div>
      ))}
      {whys.length < 5 && (
        <div className="grid gap-2 rounded-md border border-dashed p-3">
          <Input placeholder={`Pourquoi (${whys.length + 1})…`} value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Input placeholder="Réponse…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <Button type="button" size="sm" variant="outline" onClick={add} disabled={pending || !question.trim() || !answer.trim()}>
            Ajouter
          </Button>
        </div>
      )}
    </div>
  );
}

export function FishboneCausesPanel({
  orgSlug,
  orgId,
  rcaId,
  causes,
}: {
  orgSlug: string;
  orgId: string;
  rcaId: string;
  causes: Tables<"rca_causes">[];
}) {
  const [category, setCategory] = useState<(typeof RCA_CAUSE_CATEGORIES)[number]>("machine");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function add() {
    startTransition(async () => {
      const result = await addRcaCauseAction(orgSlug, orgId, rcaId, { category, description });
      if (result.error) toast.error(result.error);
      else {
        setDescription("");
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteRcaCauseAction(orgSlug, id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {RCA_CAUSE_CATEGORIES.map((cat) => (
        <div key={cat} className="rounded-md border p-3">
          <p className="mb-2 text-sm font-semibold">{CATEGORY_LABELS[cat]}</p>
          <ul className="mb-2 grid gap-1 text-sm">
            {causes
              .filter((c) => c.category === cat)
              .map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  {c.description}
                  <button type="button" onClick={() => remove(c.id)} className="text-xs text-destructive">
                    Retirer
                  </button>
                </li>
              ))}
          </ul>
          {category === cat && (
            <div className="flex gap-1">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cause…" className="h-8" />
              <Button type="button" size="sm" onClick={add} disabled={pending || !description.trim()}>
                +
              </Button>
            </div>
          )}
          {category !== cat && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCategory(cat)}>
              + Ajouter
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

const ACTION_STATUS_LABELS: Record<string, string> = { open: "À faire", in_progress: "En cours", done: "Fait", verified: "Vérifiée" };

export function CorrectiveActionsPanel({
  orgSlug,
  orgId,
  rcaId,
  actions,
  memberOptions,
}: {
  orgSlug: string;
  orgId: string;
  rcaId: string;
  actions: (Tables<"corrective_actions"> & { profiles: { full_name: string } | null })[];
  memberOptions: { userId: string; fullName: string }[];
}) {
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function add() {
    startTransition(async () => {
      const result = await addCorrectiveActionAction(orgSlug, orgId, rcaId, {
        description,
        ownerId: ownerId === "none" ? null : ownerId,
        dueDate,
      });
      if (result.error) toast.error(result.error);
      else {
        setDescription("");
        setDueDate("");
        router.refresh();
      }
    });
  }

  function updateStatus(actionId: string, status: "open" | "in_progress" | "done" | "verified") {
    startTransition(async () => {
      await updateCorrectiveActionStatusAction(orgSlug, actionId, status);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      {actions.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
          <div>
            <p>{a.description}</p>
            <p className="text-xs text-muted-foreground">
              {a.profiles?.full_name ?? "Non assigné"} {a.due_date && `· échéance ${a.due_date}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={a.status === "verified" ? "success" : "outline"}>{ACTION_STATUS_LABELS[a.status]}</Badge>
            <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v as typeof a.status)}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}

      <div className="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-4">
        <Input
          className="sm:col-span-2"
          placeholder="Action corrective…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger>
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non assigné</SelectItem>
            {memberOptions.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Button type="button" size="sm" variant="outline" className="sm:col-span-4" onClick={add} disabled={pending || !description.trim()}>
          Ajouter l’action
        </Button>
      </div>
    </div>
  );
}
