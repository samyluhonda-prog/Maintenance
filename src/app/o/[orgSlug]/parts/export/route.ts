import Papa from "papaparse";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data } = await supabase
    .from("parts")
    .select(
      "number, name, description, category, manufacturer, manufacturer_part_number, unit, unit_cost, quantity_on_hand, quantity_reserved, min_threshold, optimal_level, lead_time_days, qr_code",
    )
    .eq("org_id", ctx.org.id)
    .order("name");

  const csv = Papa.unparse(data ?? []);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pieces-${orgSlug}.csv"`,
    },
  });
}
