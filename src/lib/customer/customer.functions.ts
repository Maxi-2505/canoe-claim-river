import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildApiPayload, patchMissingColumns, stateFromStoredRow } from "@/lib/intake/logic";
import { motorConfig } from "@/lib/intake/config";
import { isPublicDemoId } from "@/lib/chat/logic";
import type { CustomerClaim } from "./status";
const input = z.object({ caseId: z.string().regex(/^(CLM-\d{4,8}|FORM-\d{4,8}|DEV-\d{3}|PRA-\d{3})$/) });
const stateSchema = z.object({ facts: z.record(z.string().max(60), z.object({ value: z.union([z.string().max(4000), z.number().finite(), z.null()]), status: z.enum(["unknown", "known", "dont_know", "pending_confirm", "system"]), source: z.enum(["customer", "upload", "system"]), timestamp: z.string().max(40) })), uploads: z.object({ quote: z.object({ amount: z.number().finite().nonnegative().optional(), itemized: z.boolean().optional(), sampleId: z.string().max(40).optional() }).optional(), police_report: z.object({ sampleId: z.string().max(40).optional() }).optional() }) });
export const createCustomerClaim = createServerFn({ method: "POST" }).inputValidator((d: unknown) => z.object({ state: stateSchema }).parse(d)).handler(async ({ data }) => {
  const base = process.env['CANOE_API_URL'] || import.meta.env['VITE_API_URL'];
  const secret = process.env['CUSTOMER_TRACKING_SECRET'];
  if (!base || !secret) throw new Error("Claim service unavailable. Please try again.");
  const token = process.env['CANOE_API_TOKEN'];
  const response = await fetch(`${base.replace(/\/$/, "")}/api/claims`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(buildApiPayload(data.state, motorConfig)), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("We couldn't send your claim. Please try again.");
  const claim = await response.json() as CustomerClaim;
  if (!/^CLM-\d{4,8}$/.test(claim.case_id)) throw new Error("The claim confirmation is unavailable.");
  const { grantClaim } = await import("./access.server");
  await grantClaim(claim.case_id, secret);
  return { caseId: claim.case_id };
});
export const getCustomerClaim = createServerFn({ method: "GET" }).inputValidator((d: unknown) => input.parse(d)).handler(async ({ data }): Promise<CustomerClaim> => {
  const secret = process.env['CUSTOMER_TRACKING_SECRET'];
  const { hasClaimAccess } = await import("./access.server");
  if (!isPublicDemoId(data.caseId) && (!secret || !await hasClaimAccess(data.caseId, secret))) throw new Error("We can't find that claim number. Check your confirmation email.");
  const base = process.env['CANOE_API_URL'] || import.meta.env['VITE_API_URL'];
  if (!base) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("claim_rows").select("case_id,case_status,recommendation,missing_fields,request_status,updated_at").eq("case_id", data.caseId).maybeSingle();
    if (!row) throw new Error("We can't find that claim number. Check your confirmation email.");
    return { case_id: row.case_id, case_status: row.case_status, created_at: row.updated_at, effective_recommendation: row.recommendation ?? undefined, request_status: row.request_status, info_requests: row.request_status === "requested" ? [{ status: "open", created_at: row.updated_at, ask_fields: (row.missing_fields ?? "").split(";").filter(Boolean) }] : [] };
  }
  const token = process.env['CANOE_API_TOKEN'];
  const response = await fetch(`${base.replace(/\/$/, "")}/api/claims/${encodeURIComponent(data.caseId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(response.status === 404 ? "We can't find that claim number. Check your confirmation email." : "Claim status is unavailable. Please try again.");
  const c = await response.json();
  if (c.case_id !== data.caseId) throw new Error("Claim status is unavailable. Please try again.");
  // Explicit projection: no personal facts, notes, rules, versions, or internal explanations.
  return { case_id: c.case_id, case_status: c.case_status, created_at: c.created_at, effective_recommendation: c.effective_recommendation, closed_at: c.closed_at, settlement: c.settlement ? { decision: c.settlement.decision, created_at: c.settlement.created_at } : null, request_status: c.request_status, info_requests: (c.info_requests ?? []).map((r: CustomerClaim["info_requests"][number]) => ({ status: r.status, created_at: r.created_at, ask_fields: r.ask_fields.filter((f) => motorConfig.questions.some((q) => q.source === "customer" && (q.field === f || q.also_for?.includes(f)))), answered_at: r.answered_at })) };
});
export const answerCustomerRequest = createServerFn({ method: "POST" }).inputValidator((d: unknown) => input.extend({ state: stateSchema }).parse(d)).handler(async ({ data }) => {
  const secret = process.env['CUSTOMER_TRACKING_SECRET'];
  const { hasClaimAccess } = await import("./access.server");
  if (!isPublicDemoId(data.caseId) && (!secret || !await hasClaimAccess(data.caseId, secret))) throw new Error("Please verify this claim through support.");
  const base = process.env['CANOE_API_URL'] || import.meta.env['VITE_API_URL'];
  if (!base) throw new Error("Claim service unavailable.");
  const token = process.env['CANOE_API_TOKEN'];
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const url = `${base.replace(/\/$/, "")}/api/claims/${encodeURIComponent(data.caseId)}`;
  const read = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!read.ok) throw new Error("Claim service unavailable.");
  const c = await read.json();
  if (c.case_status === "closed") throw new Error("This claim is closed.");
  const fields: string[] = (c.info_requests ?? []).filter((r: { status: string }) => r.status === "open").flatMap((r: { ask_fields: string[] }) => r.ask_fields);
  if (!fields.length) throw new Error("No information is requested right now.");
  const response = await fetch(`${url}/info-response`, { method: "POST", headers, body: JSON.stringify({ values: patchMissingColumns(data.state, motorConfig, fields), name: "" }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("We couldn't send the update. Please try again.");
  return { caseId: data.caseId };
});