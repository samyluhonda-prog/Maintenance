"use client";

import { createContext, useContext } from "react";

export type OrgContextValue = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  roleKey: string;
  permissions: string[];
  userId: string;
  userFullName: string;
  userAvatarPath: string | null;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  value,
  children,
}: {
  value: OrgContextValue;
  children: React.ReactNode;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider (inside /o/[orgSlug]).");
  return ctx;
}

/** UI-level convenience only — the real enforcement is Postgres RLS. */
export function usePermission(key: string) {
  const { permissions, roleKey } = useOrg();
  return roleKey === "owner" || roleKey === "admin" || permissions.includes(key);
}
