import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motorConfig } from "@/lib/intake/config";
import { openMissing, parseMissing, stateFromLog, stateFromStoredRow } from "@/lib/intake/logic";
import { IntakeFlow } from "@/components/canoe/IntakeFlow";
import { eur } from "@/components/canoe/samples";

const claimQuery = (caseId: string) => queryOptions({
  queryKey: ["claim", caseId],
  queryFn: async () => {
    const { data: row, error } = await supabase.from("claim_rows").select("*").eq("case_id", caseId).maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const { data: log, error: e2 } = await supabase.from("fact_log").select("field,value,status,source,timestamp").eq("case_id", caseId);
    if (e2) throw e2;
    return { row, log: log ?? [] };
  },
});

export const Route = createFileRoute("/continue/$caseId")({
  validateSearch: (s: Record<string, unknown>) => ({ missing: typeof s["missing"] === "string" ? (s["missing"] as string) : undefined }),
  head: ({ params }) => ({
    meta: [
      { title: `Continue claim ${params.caseId} — Canoe` },
      { name: "description", content: "Add the details still missing from your claim." },
      { property: "og:title", content: "Continue your claim — Canoe" },
      { property: "og:description", content: "A few details and your claim moves again." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(claimQuery(params.caseId));
    if (!d) throw notFound();
  },
  component: ContinuePage,
});

const CLAIM_TYPE: Record<string, string> = { motor_own_damage: "Damage to my car", theft: "Theft" };
const present = (v: string) => (v === "True" ? "yes" : v === "False" ? "not yet" : "—");

function ContinuePage() {
  const { caseId } = Route.useParams();
  const { missing: raw } = Route.useSearch();
  const { data } = useSuspenseQuery(claimQuery(caseId));
  const row = data!.row;
  const missing = useMemo(() => parseMissing(raw ?? row.missing_fields), [raw, row.missing_fields]);
  const initial = useMemo(
    () => openMissing(data!.log.length ? stateFromLog(data!.log) : stateFromStoredRow(row), motorConfig, missing),
    [data, row, missing],
  );
  const quote = row.quote_eur !== "" && Number.isFinite(Number(row.quote_eur)) ? Number(row.quote_eur) : undefined;
  const summary: [string, string][] = [
    ["What happened", row.claim_summary || "—"],
    ["Claim type", CLAIM_TYPE[row.claim_type] ?? (row.claim_type || "—")],
    ["Repair quote", quote != null ? eur(quote) : "—"],
    ["Incident report", present(row.incident_report_present)],
    ["Itemized quote", present(row.itemized_quote_present)],
  ];
  const header = (
    <div className="mb-8 rounded-2xl border border-stone/20 p-4 opacity-70">
      <p className="text-sm font-medium">Claim {caseId} · {missing.length} thing{missing.length === 1 ? "" : "s"} missing</p>
      <ul className="mt-2 grid gap-x-4 gap-y-1 text-xs text-stone sm:grid-cols-2">
        {summary.map(([k, v]) => <li key={k} className="truncate" title={v}>{k}: {v}</li>)}
      </ul>
    </div>
  );
  return <IntakeFlow mode={{ kind: "missing", missing }} initialState={initial} caseId={caseId} header={header} quoteTotal={quote} />;
}
