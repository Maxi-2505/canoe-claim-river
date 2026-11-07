import { Link, createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { markRequested } from "@/lib/claims.functions";
import { HorizonLine, Wordmark } from "@/components/canoe/brand";
import { RecommendationLabel } from "@/components/canoe/RecommendationLabel";

const casesQuery = queryOptions({
  queryKey: ["cases"],
  queryFn: async () => {
    const { data, error } = await supabase.from("claim_rows")
      .select("case_id,case_status,claim_summary,recommendation,rule,policy_version,missing_fields,request_status")
      .order("case_id");
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Cases — Canoe" },
      { name: "description", content: "Internal list of cases with the rules engine's recommendation and open requests." },
      { property: "og:title", content: "Cases — Canoe" },
      { property: "og:description", content: "Internal case list with information requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(casesQuery),
  component: CasesPage,
});

function CasesPage() {
  const { data } = useSuspenseQuery(casesQuery);
  const qc = useQueryClient();
  const [links, setLinks] = useState<Record<string, string>>({});
  const send = async (caseId: string) => {
    try {
      const res = await markRequested({ data: { caseId } });
      const link = `${window.location.origin}/continue/${res.caseId}?missing=${res.missing.join(",")}`;
      setLinks((l) => ({ ...l, [caseId]: link }));
      try { await navigator.clipboard.writeText(link); toast("Link copied."); } catch { toast("Link ready — copy it below."); }
      await qc.invalidateQueries({ queryKey: ["cases"] });
    } catch { toast("We couldn't mark this request. Try again."); }
  };
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8">
      <header className="flex items-center justify-between"><div className="flex items-center gap-5"><Wordmark /><Link to="/review" className="font-mono text-[11px] uppercase tracking-[0.14em] text-stone hover:text-ink">Review</Link><Link to="/policy" className="font-mono text-[11px] uppercase tracking-[0.14em] text-stone hover:text-ink">Policy</Link></div></header>
      <p className="eyebrow mt-8">Internal</p>
      <h1 className="font-display mt-2 text-3xl">Cases</h1>
      <p className="mt-1 text-sm text-stone">{data.length} case{data.length === 1 ? "" : "s"}. Recommendations come from the rules engine.</p>
      <HorizonLine className="my-4" />
      <div className="card-calm overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-stone/25">
              {["case_id", "status", "claim summary", "recommendation", "rule", "policy_version", "missing_fields", "request_status", ""].map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2.5 font-normal text-stone">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.case_id} className="border-b border-stone/15 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-mono">{r.case_id}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.case_status}</td>
                <td className="max-w-[280px] truncate px-3 py-2" title={r.claim_summary}>{r.claim_summary}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r.recommendation || r.case_status === "closed" ? <RecommendationLabel recommendation={r.recommendation} closed={r.case_status === "closed"} infoTone="cedar" /> : <span className="text-stone">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">{r.rule}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.policy_version}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">{r.missing_fields}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.request_status ?? ""}</td>
                <td className="px-3 py-2">
                  {r.recommendation === "request_information" && (
                    <div className="space-y-1">
                      <button onClick={() => send(r.case_id)} className="btn-quiet whitespace-nowrap px-3 py-1 text-xs">Send request</button>
                      {links[r.case_id] && <p className="max-w-[260px] select-all break-all font-mono text-[10px] text-stone">{links[r.case_id]}</p>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
