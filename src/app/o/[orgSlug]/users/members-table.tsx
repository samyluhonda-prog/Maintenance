"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { removeMemberAction, revokeInvitationAction, updateMemberRoleAction } from "@/lib/actions/users";

export type MemberRow = { membershipId: string; fullName: string; roleId: string; roleKeyLabel: string };
export type InvitationRow = { id: string; email: string; roleLabel: string };

export function MembersTable({
  orgSlug,
  members,
  invitations,
  roles,
  canManage,
  currentUserMembershipId,
}: {
  orgSlug: string;
  members: MemberRow[];
  invitations: InvitationRow[];
  roles: { id: string; nameFr: string }[];
  canManage: boolean;
  currentUserMembershipId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeRole(membershipId: string, roleId: string) {
    startTransition(async () => {
      const result = await updateMemberRoleAction(orgSlug, membershipId, roleId);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function remove(membershipId: string) {
    startTransition(async () => {
      const result = await removeMemberAction(orgSlug, membershipId);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function revoke(invitationId: string) {
    startTransition(async () => {
      await revokeInvitationAction(orgSlug, invitationId);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.membershipId}>
                <TableCell className="font-medium">{m.fullName}</TableCell>
                <TableCell>
                  {canManage && m.membershipId !== currentUserMembershipId ? (
                    <Select value={m.roleId} onValueChange={(v) => changeRole(m.membershipId, v)} disabled={pending}>
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nameFr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{m.roleKeyLabel}</span>
                  )}
                </TableCell>
                <TableCell>
                  {canManage && m.membershipId !== currentUserMembershipId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Retirer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Retirer {m.fullName} de l’organisation ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette personne perdra immédiatement l’accès à toutes les données de l’organisation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(m.membershipId)}>Retirer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {invitations.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Invitations en attente</h2>
          <div className="rounded-lg border">
            <Table>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.roleLabel}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)}>
                          Révoquer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
