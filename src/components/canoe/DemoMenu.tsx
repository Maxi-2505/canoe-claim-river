import { useState } from "react";
import { answer, applyDocument, emptyState } from "@/lib/intake/logic";
import type { IntakeState } from "@/lib/intake/types";

export interface Preset { name: string; state: IntakeState }

const story = (s: IntakeState) =>
  [
    ["what_happened", "motor_own_damage"],
    ["description", "I scraped the rear bumper on a bollard while parking outside the supermarket."],
    ["incident_date", "2026-11-02"],
    ["policy_number", "MX-482131"],
    ["other_party", "no"],
    ["injury", "no"],
  ].reduce((acc, [k, v]) => answer(acc, k!, v!), s);

function easy() {
  let s = story(emptyState());
  s = answer(s, "is_electric", "no");
  s = applyDocument(s, "quote", { amount: 1240, itemized: true, sampleId: "quote-a" });
  s = applyDocument(s, "police_report", { sampleId: "report-c" });
  return s;
}
function incomplete() {
  let s = story(emptyState());
  s = answer(s, "is_electric", "no");
  s = applyDocument(s, "quote", { amount: 1240, itemized: true, sampleId: "quote-a" });
  s = answer(s, "has_report", "no");
  return s;
}
function electric() {
  let s = story(emptyState());
  s = answer(s, "description", "A car reversed into my front left wing in a car park. It's an electric car.");
  s = answer(s, "is_electric", "yes");
  s = answer(s, "battery_affected", "yes");
  s = applyDocument(s, "quote", { amount: 1850, itemized: true, sampleId: "quote-b" });
  s = answer(s, "has_report", "no");
  return s;
}

export function DemoMenu({ onPick }: { onPick: (p: Preset | "reset") => void }) {
  const [open, setOpen] = useState(false);
  const presets: [string, () => IntakeState][] = [["Easy claim", easy], ["Incomplete claim", incomplete], ["Electric car", electric]];
  return (
    <div className="fixed bottom-4 left-4 z-30 text-xs">
      {open && (
        <div className="card-calm mb-2 flex w-44 flex-col p-1.5">
          {presets.map(([name, fn]) => (
            <button key={name} onClick={() => { onPick({ name, state: fn() }); setOpen(false); }} className="rounded-lg px-3 py-2 text-left hover:bg-paper">{name}</button>
          ))}
          <div className="my-1 h-px bg-stone/20" />
          <button onClick={() => { onPick("reset"); setOpen(false); }} className="rounded-lg px-3 py-2 text-left text-stone hover:bg-paper">Reset</button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="text-stone hover:text-ink">Demo</button>
    </div>
  );
}
