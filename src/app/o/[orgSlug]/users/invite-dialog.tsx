"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteMemberAction } from "@/lib/actions/users";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validation/users";

export function InviteDialog({
  orgSlug,
  orgId,
  roles,
}: {
  orgSlug: string;
  orgId: string;
  roles: { id: string; nameFr: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", roleId: roles[0]?.id ?? "" },
  });

  async function onSubmit(values: InviteMemberInput) {
    const result = await inviteMemberAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setInviteUrl(result.data!.inviteUrl);
    toast.success("Invitation créée.");
  }

  function copyLink() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Lien copié.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setInviteUrl(null);
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Inviter un membre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
          <DialogDescription>
            Aucun service courriel n’est configuré — copiez le lien généré et transmettez-le vous-même.
          </DialogDescription>
        </DialogHeader>
        {inviteUrl ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Partagez ce lien avec la personne invitée :</p>
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} />
              <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courriel</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nameFr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Générer le lien d’invitation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
