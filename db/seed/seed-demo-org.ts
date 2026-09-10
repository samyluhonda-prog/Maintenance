/**
 * Seeds a complete demo organization ("Recyclage Nordique", a fictional
 * waste-sorting and composting operator) so every major workflow in the app
 * can be exercised immediately after setup, per docs/INSTALL.md.
 *
 * Requires a REAL Supabase Auth backend (hosted project or `supabase start`
 * with Docker) — it calls `auth.admin.createUser`, which only exists on the
 * genuine GoTrue service, not on this repo's local_dev_shim.sql (a bare
 * Postgres table with no auth API, used only to exercise RLS directly via
 * SQL — see db/tests/rls_isolation_test.sql). Run with:
 *
 *   npx tsx db/seed/seed-demo-org.ts
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS entirely — never run this
 * against a production project with real tenant data).
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/types/database";

loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Demo1234!";
const ORG_SLUG = "recyclage-nordique";
const ORG_NAME = "Recyclage Nordique";

const DEMO_USERS = [
  { email: "owner@recyclage-nordique.demo", fullName: "Isabelle Tremblay", role: "owner" },
  { email: "admin@recyclage-nordique.demo", fullName: "Marc-André Bissonnette", role: "admin" },
  { email: "gestionnaire@recyclage-nordique.demo", fullName: "Sophie Gagnon", role: "maintenance_manager" },
  { email: "planificateur@recyclage-nordique.demo", fullName: "Julien Roy", role: "planner" },
  { email: "superviseur@recyclage-nordique.demo", fullName: "Nathalie Côté", role: "supervisor" },
  { email: "technicien1@recyclage-nordique.demo", fullName: "David Ouellet", role: "technician" },
  { email: "technicien2@recyclage-nordique.demo", fullName: "Fatima El-Amrani", role: "technician" },
  { email: "employe@recyclage-nordique.demo", fullName: "Karim Benali", role: "requester" },
  { email: "fournisseur@recyclage-nordique.demo", fullName: "Pierre Lavoie (MécanoPro)", role: "vendor" },
  { email: "auditeur@recyclage-nordique.demo", fullName: "Chantal Bergeron", role: "viewer" },
] as const;

async function main() {
  console.log(`Seeding demo organization "${ORG_NAME}"...`);

  const { data: existingOrg } = await supabase.from("organizations").select("id").eq("slug", ORG_SLUG).maybeSingle();
  if (existingOrg) {
    console.error(
      `Organization "${ORG_SLUG}" already exists (id=${existingOrg.id}). Delete it first if you want to reseed:\n` +
        `  delete from public.organizations where slug = '${ORG_SLUG}';  -- cascades to all its data`,
    );
    process.exit(1);
  }

  // 1. Users -----------------------------------------------------------
  const usersByRole = new Map<string, string>(); // role -> user id (first match wins for singular roles)
  const userIdByEmail = new Map<string, string>();

  for (const u of DEMO_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.fullName, locale: "fr" },
    });
    if (error) throw new Error(`creating user ${u.email}: ${error.message}`);
    userIdByEmail.set(u.email, data.user.id);
    if (!usersByRole.has(u.role)) usersByRole.set(u.role, data.user.id);
    console.log(`  user ${u.email} (${u.role})`);
  }
  const ownerId = usersByRole.get("owner")!;

  // 2. Organization + memberships ---------------------------------------
  const { data: orgId, error: orgError } = await supabase.rpc("create_organization_with_owner", {
    p_name: ORG_NAME,
    p_slug: ORG_SLUG,
  });
  if (orgError) throw new Error(`creating organization: ${orgError.message}`);
  await supabase.from("organizations").update({ is_demo: true }).eq("id", orgId!);
  console.log(`  organization ${ORG_NAME} (${orgId})`);

  const { data: roles } = await supabase.from("roles").select("id, key").is("org_id", null);
  const roleIdByKey = new Map((roles ?? []).map((r) => [r.key, r.id]));

  for (const u of DEMO_USERS) {
    if (u.role === "owner") continue; // already a member via create_organization_with_owner
    const userId = userIdByEmail.get(u.email)!;
    const roleId = roleIdByKey.get(u.role);
    if (!roleId) continue;
    await supabase.from("memberships").insert({ org_id: orgId!, user_id: userId, role_id: roleId, status: "active" });
  }
  console.log(`  ${DEMO_USERS.length} memberships`);

  // 3. Locations ----------------------------------------------------------
  async function loc(name: string, type: Database["public"]["Tables"]["locations"]["Row"]["type"], parentId: string | null) {
    const { data, error } = await supabase
      .from("locations")
      .insert({ org_id: orgId!, name, type, parent_id: parentId })
      .select("id")
      .single();
    if (error) throw new Error(`location ${name}: ${error.message}`);
    return data.id;
  }

  const siteTri = await loc("Centre de tri Nordique", "site", null);
  const siteCompost = await loc("Installation de compostage", "site", null);
  const batAdmin = await loc("Bâtiment administratif", "building", siteTri);
  const batTri = await loc("Hall de tri", "building", siteTri);
  const zoneReception = await loc("Zone de réception", "zone", batTri);
  const ligneOptique = await loc("Ligne de tri optique", "production_line", batTri);
  const ligneBallots = await loc("Ligne de mise en ballots", "production_line", batTri);
  const aireCompost = await loc("Aire de compostage", "zone", siteCompost);
  void batAdmin;
  console.log("  8 locations");

  // 4. Suppliers ------------------------------------------------------------
  async function supplier(name: string, contact: string, email: string) {
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ org_id: orgId!, name, contact_name: contact, email, rating: 4 })
      .select("id")
      .single();
    if (error) throw new Error(`supplier ${name}: ${error.message}`);
    return data.id;
  }
  const supplierPieces = await supplier("Pièces Industrielles Laurentides", "Marie-Claude Dubois", "commandes@pil.example.com");
  const supplierEnviro = await supplier("Équipements Enviro Plus", "Alain Fortin", "ventes@enviroplus.example.com");
  const supplierMecano = await supplier("MécanoPro Distribution", "Pierre Lavoie", "pierre@mecanopro.example.com");

  // 5. Equipment ------------------------------------------------------------
  async function equipment(input: {
    name: string;
    locationId: string;
    category: string;
    criticality: Database["public"]["Tables"]["equipment"]["Row"]["criticality"];
    manufacturer?: string;
    model?: string;
    supplierId?: string;
    parentId?: string;
  }) {
    const { data, error } = await supabase
      .from("equipment")
      .insert({
        org_id: orgId!,
        name: input.name,
        location_id: input.locationId,
        category: input.category,
        criticality: input.criticality,
        manufacturer: input.manufacturer,
        model: input.model,
        supplier_id: input.supplierId,
        parent_equipment_id: input.parentId,
        qr_code: `EQ-DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        commissioned_at: "2019-06-01",
        status: "operational",
      })
      .select("id")
      .single();
    if (error) throw new Error(`equipment ${input.name}: ${error.message}`);
    return data.id;
  }

  const convA1 = await equipment({ name: "Convoyeur d'alimentation A1", locationId: ligneOptique, category: "Convoyeur", criticality: "medium", manufacturer: "Machinex" });
  const convA2 = await equipment({ name: "Convoyeur A2", locationId: ligneOptique, category: "Convoyeur", criticality: "medium", manufacturer: "Machinex" });
  const trieur = await equipment({
    name: "Trieur optique OS-3000",
    locationId: ligneOptique,
    category: "Trieur optique",
    criticality: "critical",
    manufacturer: "TOMRA",
    model: "OS-3000",
    supplierId: supplierEnviro,
  });
  await equipment({ name: "Moteur principal (Trieur OS-3000)", locationId: ligneOptique, category: "Composante", criticality: "high", parentId: trieur });
  const eddy = await equipment({ name: "Séparateur à courant de Foucault ECS-12", locationId: ligneOptique, category: "Séparateur", criticality: "high", manufacturer: "Bunting" });
  const presse = await equipment({
    name: "Presse à ballots PB-500",
    locationId: ligneBallots,
    category: "Presse à ballots",
    criticality: "critical",
    manufacturer: "Harris",
    model: "PB-500",
    supplierId: supplierMecano,
  });
  const chargeuse = await equipment({ name: "Chargeuse sur roues L120", locationId: zoneReception, category: "Chargeuse", criticality: "medium", manufacturer: "Volvo", model: "L120H" });
  const incendie = await equipment({ name: "Système de protection incendie", locationId: batTri, category: "Sécurité", criticality: "critical" });
  const convCompost = await equipment({ name: "Convoyeur de compost C1", locationId: aireCompost, category: "Convoyeur", criticality: "low" });
  console.log("  9 equipment records");

  // 6. Meters -----------------------------------------------------------
  async function meter(equipmentId: string, name: string, unit: string, kind: Database["public"]["Tables"]["meters"]["Row"]["kind"]) {
    const { data, error } = await supabase.from("meters").insert({ org_id: orgId!, equipment_id: equipmentId, name, unit, kind }).select("id").single();
    if (error) throw new Error(`meter ${name}: ${error.message}`);
    return data.id;
  }
  const meterChargeuse = await meter(chargeuse, "Heures moteur", "h", "hours");
  const meterPresse = await meter(presse, "Cycles de pressage", "cycles", "cycles");
  const meterTrieur = await meter(trieur, "Heures de fonctionnement", "h", "hours");

  const now = Date.now();
  for (let i = 0; i < 6; i++) {
    const daysAgo = (5 - i) * 15;
    const recordedAt = new Date(now - daysAgo * 86400000).toISOString();
    await supabase.from("meter_readings").insert({ org_id: orgId!, meter_id: meterChargeuse, value: 1800 + i * 62, recorded_at: recordedAt, source: "manual" });
    await supabase.from("meter_readings").insert({ org_id: orgId!, meter_id: meterPresse, value: 4200 + i * 310, recorded_at: recordedAt, source: "manual" });
    await supabase.from("meter_readings").insert({ org_id: orgId!, meter_id: meterTrieur, value: 9000 + i * 480, recorded_at: recordedAt, source: "manual" });
  }
  console.log("  3 meters, 18 readings");

  // 7. Parts ----------------------------------------------------------------
  async function part(input: {
    number: string;
    name: string;
    category: string;
    unitCost: number;
    onHand: number;
    minThreshold: number;
    supplierId?: string;
    equipmentIds?: string[];
  }) {
    const { data, error } = await supabase
      .from("parts")
      .insert({
        org_id: orgId!,
        number: input.number,
        name: input.name,
        category: input.category,
        unit_cost: input.unitCost,
        quantity_on_hand: input.onHand,
        min_threshold: input.minThreshold,
        primary_supplier_id: input.supplierId,
        qr_code: `PT-DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      })
      .select("id")
      .single();
    if (error) throw new Error(`part ${input.name}: ${error.message}`);
    if (input.onHand > 0) {
      await supabase.from("part_transactions").insert({
        org_id: orgId!,
        part_id: data.id,
        type: "adjustment",
        quantity: input.onHand,
        unit_cost: input.unitCost,
        note: "Inventaire initial (données de démonstration)",
      });
    }
    for (const equipmentId of input.equipmentIds ?? []) {
      await supabase.from("equipment_parts").insert({ org_id: orgId!, equipment_id: equipmentId, part_id: data.id });
    }
    return data.id;
  }

  await part({ number: "PIE-1001", name: "Courroie de convoyeur 24po", category: "Convoyeur", unitCost: 145, onHand: 6, minThreshold: 4, supplierId: supplierPieces, equipmentIds: [convA1, convA2, convCompost] });
  await part({ number: "PIE-1002", name: "Roulement à billes 6205-2RS", category: "Général", unitCost: 18, onHand: 2, minThreshold: 10, supplierId: supplierPieces, equipmentIds: [convA1, convA2, chargeuse] });
  await part({ number: "PIE-1003", name: "Capteur optique NIR", category: "Trieur optique", unitCost: 890, onHand: 1, minThreshold: 2, supplierId: supplierEnviro, equipmentIds: [trieur] });
  await part({ number: "PIE-1004", name: "Huile hydraulique 15W-40 (20L)", category: "Lubrifiant", unitCost: 95, onHand: 8, minThreshold: 3, supplierId: supplierMecano, equipmentIds: [presse, chargeuse] });
  await part({ number: "PIE-1005", name: "Lame de presse PB-500", category: "Presse à ballots", unitCost: 620, onHand: 2, minThreshold: 2, supplierId: supplierMecano, equipmentIds: [presse] });
  await part({ number: "PIE-1006", name: "Filtre à air chargeuse L120", category: "Filtration", unitCost: 65, onHand: 5, minThreshold: 4, supplierId: supplierMecano, equipmentIds: [chargeuse] });
  console.log("  6 parts (2 below minimum threshold, for the low-stock automation demo)");

  // 8. Procedures -------------------------------------------------------
  const { data: procDaily } = await supabase
    .from("procedure_templates")
    .insert({ org_id: orgId!, name: "Inspection quotidienne — Convoyeurs", category: "Inspection", created_by: ownerId })
    .select("id")
    .single();
  const dailyFields: Array<[string, Database["public"]["Tables"]["procedure_fields"]["Row"]["type"], Record<string, unknown>]> = [
    ["Inspection visuelle de la courroie", "checkbox", { required: true }],
    ["Tension de la courroie conforme ?", "yesno", { required: true }],
    ["Bruit anormal détecté ?", "yesno", { required: true }],
    ["Photo de l'état général", "photo", { required: false }],
    ["Résultat global", "pass_fail", { required: true }],
  ];
  for (let i = 0; i < dailyFields.length; i++) {
    const [label, type, config] = dailyFields[i];
    await supabase.from("procedure_fields").insert({ org_id: orgId!, template_id: procDaily!.id, order_index: i, label, type, config: config as Database["public"]["Tables"]["procedure_fields"]["Insert"]["config"] });
  }

  const { data: procPresse } = await supabase
    .from("procedure_templates")
    .insert({ org_id: orgId!, name: "Entretien préventif — Presse à ballots", category: "Préventif", created_by: ownerId })
    .select("id")
    .single();
  const presseFields: Array<[string, Database["public"]["Tables"]["procedure_fields"]["Row"]["type"], Record<string, unknown>]> = [
    ["Niveau d'huile hydraulique (L)", "number", { min: 0, max: 25, required: true }],
    ["Lame de presse inspectée", "checkbox", { required: true }],
    ["Lecture du compteur de cycles", "meter_reading", { required: true }],
    ["Signature du technicien", "signature", { required: true }],
  ];
  for (let i = 0; i < presseFields.length; i++) {
    const [label, type, config] = presseFields[i];
    await supabase.from("procedure_fields").insert({ org_id: orgId!, template_id: procPresse!.id, order_index: i, label, type, config: config as Database["public"]["Tables"]["procedure_fields"]["Insert"]["config"] });
  }
  console.log("  2 procedure templates");

  // 9. PM plans -----------------------------------------------------------
  const technicianId = usersByRole.get("technician")!;
  const { data: pmTrieur } = await supabase
    .from("pm_plans")
    .insert({
      org_id: orgId!,
      name: "PM mensuelle — Trieur optique",
      equipment_id: trieur,
      procedure_template_id: procDaily!.id,
      wo_title: "Inspection préventive mensuelle — Trieur optique OS-3000",
      wo_priority: "high",
      default_assignee_id: technicianId,
      created_by: ownerId,
    })
    .select("id")
    .single();
  await supabase.from("pm_triggers").insert({
    org_id: orgId!,
    pm_plan_id: pmTrieur!.id,
    kind: "calendar",
    frequency_unit: "month",
    frequency_value: 1,
    fixed_interval: true,
    next_due_at: new Date(now + 10 * 86400000).toISOString(),
  });

  const { data: pmChargeuse } = await supabase
    .from("pm_plans")
    .insert({
      org_id: orgId!,
      name: "PM sur compteur — Chargeuse L120",
      equipment_id: chargeuse,
      wo_title: "Entretien 250h — Chargeuse L120",
      wo_priority: "medium",
      default_assignee_id: technicianId,
      created_by: ownerId,
    })
    .select("id")
    .single();
  await supabase.from("pm_triggers").insert({
    org_id: orgId!,
    pm_plan_id: pmChargeuse!.id,
    kind: "meter",
    meter_id: meterChargeuse,
    meter_interval: 250,
    meter_operator: "gte",
  });
  console.log("  2 PM plans with triggers");

  // 10. Work orders -------------------------------------------------------
  async function workOrder(input: {
    title: string;
    type: Database["public"]["Tables"]["work_orders"]["Row"]["type"];
    priority: Database["public"]["Tables"]["work_orders"]["Row"]["priority"];
    status: Database["public"]["Tables"]["work_orders"]["Row"]["status"];
    equipmentId?: string;
    assigneeId?: string;
    description?: string;
    resolution?: string;
    daysAgo?: number;
  }) {
    const { data: number } = await supabase.rpc("next_number", { p_org_id: orgId!, p_key: "work_order", p_prefix: "WO" });
    const createdAt = input.daysAgo ? new Date(now - input.daysAgo * 86400000).toISOString() : undefined;
    const { data, error } = await supabase
      .from("work_orders")
      .insert({
        org_id: orgId!,
        number: number!,
        title: input.title,
        description: input.description,
        type: input.type,
        priority: input.priority,
        status: input.status,
        equipment_id: input.equipmentId,
        primary_assignee_id: input.assigneeId,
        created_by: ownerId,
        created_at: createdAt,
        resolution: input.resolution,
        closed_at: input.status === "closed" ? createdAt : undefined,
        closed_by: input.status === "closed" ? ownerId : undefined,
      })
      .select("id")
      .single();
    if (error) throw new Error(`work order ${input.title}: ${error.message}`);
    return data.id;
  }

  await workOrder({
    title: "Inspection préventive mensuelle — Trieur optique (mars)",
    type: "preventive",
    priority: "high",
    status: "closed",
    equipmentId: trieur,
    assigneeId: technicianId,
    resolution: "Inspection complétée, aucune anomalie détectée. Capteur optique nettoyé.",
    daysAgo: 30,
  });
  await workOrder({
    title: "Remplacement courroie convoyeur A1",
    type: "corrective",
    priority: "medium",
    status: "closed",
    equipmentId: convA1,
    assigneeId: technicianId,
    resolution: "Courroie usée remplacée par une neuve (PIE-1001).",
    daysAgo: 18,
  });
  const woInProgress = await workOrder({
    title: "Bruit anormal — Séparateur à courant de Foucault",
    type: "corrective",
    priority: "high",
    status: "in_progress",
    equipmentId: eddy,
    assigneeId: technicianId,
    description: "Bruit métallique intermittent signalé par l'opérateur au démarrage.",
    daysAgo: 2,
  });
  await workOrder({
    title: "Vérification annuelle — Système de protection incendie",
    type: "safety",
    priority: "critical",
    status: "open",
    equipmentId: incendie,
    description: "Vérification réglementaire annuelle requise par l'assureur.",
  });
  await workOrder({
    title: "Fuite hydraulique — Presse à ballots",
    type: "corrective",
    priority: "critical",
    status: "assigned",
    equipmentId: presse,
    assigneeId: technicianId,
    description: "Fuite d'huile détectée sous le vérin principal.",
  });
  console.log("  5 work orders (various statuses)");

  await supabase.from("work_order_time_logs").insert({
    org_id: orgId!,
    work_order_id: woInProgress,
    user_id: technicianId,
    started_at: new Date(now - 2 * 3600000).toISOString(),
    ended_at: new Date(now - 1 * 3600000).toISOString(),
    minutes: 60,
    note: "Diagnostic initial, démontage partiel du carter.",
  });
  await supabase.from("work_orders").update({ actual_hours: 1 }).eq("id", woInProgress);

  // 11. Requests --------------------------------------------------------
  const requesterId = usersByRole.get("requester")!;
  async function request(input: {
    title: string;
    description: string;
    urgency: Database["public"]["Tables"]["requests"]["Row"]["urgency"];
    status: Database["public"]["Tables"]["requests"]["Row"]["status"];
    equipmentId?: string;
    isDown?: boolean;
  }) {
    const { data: number } = await supabase.rpc("next_number", { p_org_id: orgId!, p_key: "request", p_prefix: "REQ" });
    const { error } = await supabase.from("requests").insert({
      org_id: orgId!,
      number: number!,
      title: input.title,
      description: input.description,
      urgency: input.urgency,
      status: input.status,
      equipment_id: input.equipmentId,
      is_equipment_down: input.isDown ?? false,
      requested_by: requesterId,
      reviewed_by: input.status === "approved" || input.status === "rejected" ? ownerId : null,
      reviewed_at: input.status === "approved" || input.status === "rejected" ? new Date().toISOString() : null,
    });
    if (error) throw new Error(`request ${input.title}: ${error.message}`);
  }
  await request({ title: "Odeur inhabituelle près du convoyeur de compost", description: "Odeur forte remarquée ce matin.", urgency: "low", status: "submitted", equipmentId: convCompost });
  await request({ title: "Chargeuse difficile à démarrer", description: "La chargeuse L120 prend plusieurs essais avant de démarrer.", urgency: "medium", status: "approved", equipmentId: chargeuse });
  await request({ title: "Voyant d'alerte sur la presse à ballots", description: "Voyant rouge clignotant sur le panneau de contrôle.", urgency: "high", status: "rejected", equipmentId: presse });
  console.log("  3 requests (submitted / approved / rejected)");

  // 12. RCA -----------------------------------------------------------
  const { data: rca } = await supabase
    .from("rca_records")
    .insert({
      org_id: orgId!,
      equipment_id: trieur,
      title: "Arrêts répétés du trieur optique OS-3000",
      problem_statement: "Le trieur optique s'est arrêté de façon inattendue à trois reprises au cours du dernier mois.",
      status: "in_progress",
      created_by: ownerId,
    })
    .select("id")
    .single();
  const fiveWhys = [
    "Pourquoi le trieur s'arrête-t-il ? — Le capteur optique perd le signal.",
    "Pourquoi le capteur perd-il le signal ? — Accumulation de poussière sur la lentille.",
    "Pourquoi y a-t-il accumulation de poussière ? — Le système de nettoyage automatique est désactivé.",
    "Pourquoi est-il désactivé ? — Il a été désactivé lors d'une réparation et jamais réactivé.",
    "Pourquoi n'a-t-il pas été réactivé ? — Absence de procédure de vérification post-réparation.",
  ];
  for (let i = 0; i < fiveWhys.length; i++) {
    const [question, answer] = fiveWhys[i].split(" — ");
    await supabase.from("rca_five_whys").insert({ org_id: orgId!, rca_id: rca!.id, order_index: i, question, answer });
  }
  await supabase.from("rca_causes").insert([
    { org_id: orgId!, rca_id: rca!.id, category: "machine", description: "Système de nettoyage automatique du capteur désactivé." },
    { org_id: orgId!, rca_id: rca!.id, category: "method", description: "Absence de procédure de vérification post-réparation." },
  ]);
  await supabase.from("corrective_actions").insert({
    org_id: orgId!,
    rca_id: rca!.id,
    description: "Réactiver le système de nettoyage automatique et ajouter une étape de vérification à la procédure de réparation.",
    owner_id: technicianId,
    due_date: new Date(now + 14 * 86400000).toISOString().slice(0, 10),
    status: "open",
  });
  console.log("  1 RCA record with 5 whys, fishbone causes, and a corrective action");

  // 13. Automation rules --------------------------------------------------
  await supabase.from("automation_rules").insert([
    {
      org_id: orgId!,
      name: "Alerte immédiate — demande critique",
      trigger_event: "request.critical_created",
      actions: [{ type: "notify", params: { role: "supervisor", message: "Nouvelle demande critique soumise." } }],
      created_by: ownerId,
    },
    {
      org_id: orgId!,
      name: "Achat automatique — stock minimal atteint",
      trigger_event: "part.below_min",
      actions: [{ type: "create_purchase_request", params: {} }],
      created_by: ownerId,
    },
    {
      org_id: orgId!,
      name: "Escalade — bon de travail non pris en charge",
      trigger_event: "work_order.unassigned_timeout",
      conditions: { minutes: 30 },
      actions: [{ type: "notify", params: { role: "maintenance_manager", message: "Bon de travail critique non assigné depuis 30 minutes." } }],
      created_by: ownerId,
    },
  ]);
  console.log("  3 automation rules");

  console.log("\nDone. Demo accounts (password for all: " + DEMO_PASSWORD + "):");
  for (const u of DEMO_USERS) console.log(`  ${u.email.padEnd(38)} ${u.role}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
