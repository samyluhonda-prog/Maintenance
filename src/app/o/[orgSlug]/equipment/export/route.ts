import Papa from "papaparse";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data } = await supabase
    .from("equipment")
    .select("name, internal_code, category, status, criticality, manufacturer, model, serial_number, qr_code")
    .eq("org_id", ctx.org.id)
    .order("name");

  const csv = Papa.unparse(data ?? []);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="equipements-${orgSlug}.csv"`,
    },
  });
}
