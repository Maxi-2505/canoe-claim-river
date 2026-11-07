import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { motorConfig } from "@/lib/intake/config";
import { buildRow, factLogEntries } from "@/lib/intake/logic";
import { POLICY_VERSION, type IntakeState } from "@/lib/intake/types";

const factSchema = z.object({
  value: z.union([z.string().max(4000), z.number(), z.null()]),
  status: z.enum(["unknown", "known", "dont_know", "pending_confirm", "system"]),
  source: z.enum(["customer", "upload", "system"]),
  timestamp: z.string().max(40),
});
const evidence = z.object({ amount: z.number().optional(), itemized: z.boolean().optional(), sampleId: z.string().max(40).optional() });
const stateSchema = z.object({
  facts: z.record(z.string().max(60), factSchema),
  uploads: z.object({ quote: evidence.optional(), police_report: evidence.optional() }),
});

async function writeFacts(caseId: string, state: IntakeState) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = factLogEntries(state, motorConfig).map((e) => ({
    case_id: caseId, ...e, form_version: motorConfig.form_version, policy_version: POLICY_VERSION,
  }));
  const { error } = await supabaseAdmin.from("fact_log").insert(rows);
  if (error) throw new Error(error.message);
}

export const submitClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ state: stateSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error: idErr } = await supabaseAdmin.rpc("next_case_id");
    if (idErr || !id) throw new Error(idErr?.message ?? "No case id");
    const row = buildRow(id as string, data.state as IntakeState, motorConfig);
    const { error } = await supabaseAdmin.from("claim_rows").insert(row);
    if (error) throw new Error(error.message);
    await writeFacts(row.case_id, data.state as IntakeState);
    return { caseId: row.case_id };
  });

export const updateClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ caseId: z.string().regex(/^FORM-\d{4,}$/), state: stateSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = buildRow(data.caseId, data.state as IntakeState, motorConfig);
    const { case_id, ...rest } = row;
    const { error } = await supabaseAdmin.from("claim_rows").update({ ...rest, updated_at: new Date().toISOString() }).eq("case_id", case_id);
    if (error) throw new Error(error.message);
    await writeFacts(case_id, data.state as IntakeState);
    return { caseId: case_id };
  });
