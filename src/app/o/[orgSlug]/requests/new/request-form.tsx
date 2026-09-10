"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mic, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { structureRequestFromTextAction } from "@/lib/actions/ai";
import { createRequestAction } from "@/lib/actions/requests";
import { REQUEST_URGENCY, requestSchema, type RequestFormValues } from "@/lib/validation/requests";
import type { Tables } from "@/types/supabase-helpers";

// Minimal ambient shape for the (non-standard, Chrome/Edge-only) Web Speech
// API — no @types package ships one, and we only touch a handful of members.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const URGENCY_LABELS: Record<(typeof REQUEST_URGENCY)[number], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

export function RequestForm({
  orgSlug,
  orgId,
  equipmentOptions,
  defaultEquipmentId,
}: {
  orgSlug: string;
  orgId: string;
  equipmentOptions: Pick<Tables<"equipment">, "id" | "name">[];
  defaultEquipmentId?: string;
}) {
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      equipmentId: defaultEquipmentId ?? null,
      locationId: null,
      category: "",
      urgency: "medium",
      isEquipmentDown: false,
      submit: true,
    },
  });

  async function onSubmit(values: RequestFormValues, submit: boolean) {
    const result = await createRequestAction(orgSlug, orgId, { ...values, submit });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(submit ? "Demande soumise." : "Brouillon enregistré.");
    router.push(`/o/${orgSlug}/requests/${result.data!.id}`);
  }

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("La dictée vocale n’est pas prise en charge par ce navigateur.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "fr-CA";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript + " ";
      form.setValue("description", ((form.getValues("description") as string) + " " + transcript).trim());
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function structureWithAi() {
    const description = form.getValues("description") as string;
    if (!description?.trim()) {
      toast.error("Dictez ou saisissez d’abord une description.");
      return;
    }
    setStructuring(true);
    const result = await structureRequestFromTextAction(orgId, description);
    setStructuring(false);
    if (!result.available) {
      toast.error(result.reason);
      return;
    }
    form.setValue("title", result.title);
    form.setValue("description", result.description);
    form.setValue("urgency", result.urgency);
    form.setValue("isEquipmentDown", result.isEquipmentDown);
    if (result.matchedEquipmentName) {
      const match = equipmentOptions.find((e) => e.name === result.matchedEquipmentName);
      if (match) form.setValue("equipmentId", match.id);
    }
    toast.success("Demande structurée par l’IA — vérifiez les champs avant d’envoyer.");
  }

  return (
    <Form {...form}>
      <form className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle demande de maintenance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : Bruit anormal sur le convoyeur A1" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description du problème</FormLabel>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={listening ? "destructive" : "ghost"}
                        size="sm"
                        onClick={toggleDictation}
                      >
                        {listening ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}
                        {listening ? "Arrêter" : "Dicter"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={structureWithAi} disabled={structuring}>
                        <Sparkles className="size-3.5" />
                        {structuring ? "Analyse…" : "Structurer avec l’IA"}
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Équipement</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {equipmentOptions.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex. : Mécanique, Électrique…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgence</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REQUEST_URGENCY.map((u) => (
                          <SelectItem key={u} value={u}>
                            {URGENCY_LABELS[u]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isEquipmentDown"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 self-end">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">L’équipement est actuellement arrêté</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit((values) => onSubmit(values, false))}
          >
            Enregistrer comme brouillon
          </Button>
          <Button
            type="button"
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit((values) => onSubmit(values, true))}
          >
            Soumettre la demande
          </Button>
        </div>
      </form>
    </Form>
  );
}
