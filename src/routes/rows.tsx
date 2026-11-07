import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSV_COLUMNS } from "@/lib/intake/types";
import { toCsv } from "@/lib/intake/logic";
import { HorizonLine, Wordmark } from "@/components/canoe/brand";

const rowsQuery = queryOptions({
  queryKey: ["claim_rows"],
  queryFn: async () => {
    const { data, error } = await supabase.from("claim_rows").select("*").order("case_id");
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/rows")({
  head: () => ({
    meta: [
      { title: "Claim rows — Canoe" },
      { name: "description", content: "Internal list of submitted claim rows with CSV export." },
      { property: "og:title", content: "Claim rows — Canoe" },
      { property: "og:description", content: "Internal list of submitted claim rows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(rowsQuery),
  component: RowsPage,
});

function RowsPage() {
  const { data } = useSuspenseQuery(rowsQuery);
  const exportCsv = () => {
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "claim_rows.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <button onClick={exportCsv} className="btn-cedar px-5 py-2 text-sm">Export CSV</button>
      </header>
      <h1 className="font-display mt-8 text-3xl">Claim rows</h1>
      <p className="mt-1 text-sm text-stone">{data.length} row{data.length === 1 ? "" : "s"}</p>
      <HorizonLine className="my-4" />
      <div className="card-calm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone/25">
              {CSV_COLUMNS.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2.5 font-medium text-stone">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.case_id} className="border-b border-stone/15 last:border-0">
                {CSV_COLUMNS.map((c) => (
                  <td key={c} className={c === "claim_summary" ? "max-w-[260px] truncate px-3 py-2" : "whitespace-nowrap px-3 py-2"} title={r[c]}>{r[c]}</td>
                ))}
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={CSV_COLUMNS.length} className="px-3 py-6 text-center text-stone">No claims yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
