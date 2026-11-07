import type { Draft, Preview, PreviewRow } from '@/lib/policy/types';
import type { BusinessClaim, Impact, Quality } from './types';

/** Equality only: policy decisions remain entirely in the external engine. */
export const isNewDraft = (draft: Draft, live: Draft) => JSON.stringify(draft) !== JSON.stringify(live);
export const share = (claims: BusinessClaim[], version: 'before' | 'now') => {
  const open = claims.filter(c => c.case_status === 'open');
  const known = open.filter(c => version === 'now' || c.recommendation_v1 !== undefined);
  if (!open.length || known.length !== open.length) return null;
  return known.filter(c => (version === 'before' ? c.recommendation_v1 : c.recommendation_latest) === 'routine_processing').length / open.length;
};
export function publishedPreview(impact: Impact, claims: BusinessClaim[]): Preview {
  const from = impact.rechecks.at(-1)?.from_version ?? impact.versions.at(-2) ?? impact.latest_version;
  const to = impact.rechecks.at(-1)?.to_version ?? impact.latest_version;
  const rows: PreviewRow[] = claims.map(c => {
    const recheck = impact.rechecks.find(r => r.case_id === c.case_id && r.to_version === to);
    const retained = c.case_status !== 'open';
    const before = recheck?.from_recommendation ?? c.recommendation_v1 ?? c.recommendation_latest;
    const after = retained ? before : recheck?.to_recommendation ?? c.recommendation_latest;
    return { case_id: c.case_id, status: c.case_status, from: before, to: after, rule_from: c.rule_v1 ?? (recheck ? '' : c.rule), rule_to: c.rule, changed: !retained && before !== after, retained, summary: c.summary };
  });
  return { from_version: from, to_version: to, open_claims: impact.open_claims, closed_untouched: impact.closed_claims, changed: impact.recheck_total, moves: impact.moves, rows, warnings: [], draft_quality: { versions: {}, changed_cases: { count: 0, cases: [], regressions: [], fixed: [] } } };
}
export function impactVerdict(i: Impact) {
  const p = publishedPreview(i, []);
  const routine = Object.entries(i.moves).some(([k, n]) => k.split(/\s*->\s*/)[1] === 'routine_processing' && n > 0);
  return `${p.from_version} → ${p.to_version} changed ${i.recheck_total} of ${i.open_claims} open claims. ${i.closed_claims} closed claims stayed as decided. ${routine ? 'Some claims moved to routine.' : 'Nothing moved to routine.'}`;
}
export interface Assumptions {
  claims: number; simpleMinutes: number; escalationMinutes: number; salary: number; days: number; hours: number; overhead: number;
  wrongRoutineCost: number | null; unnecessaryCost: number | null; implementation: number | null; annualRun: number | null; changeWeeks: number | null; changePeople: number | null;
}
export const DEFAULT_ASSUMPTIONS: Assumptions = { claims: 200000, simpleMinutes: 2.5, escalationMinutes: 9, salary: 40000, days: 220, hours: 8, overhead: 1.3, wrongRoutineCost: null, unnecessaryCost: null, implementation: null, annualRun: null, changeWeeks: null, changePeople: null };
export function calculateBusiness(a: Assumptions, routineShare: number | null, quality: Quality, measuredMinutes?: number) {
  const hourly = a.days > 0 && a.hours > 0 ? a.salary / (a.days * a.hours) : null;
  const loaded = hourly === null ? null : hourly * a.overhead;
  const today = loaded === null || routineShare === null ? null : a.claims * (routineShare * a.simpleMinutes + (1 - routineShare) * a.escalationMinutes) / 60 * loaded;
  const canoe = loaded === null || routineShare === null ? null : a.claims * (1 - routineShare) * a.escalationMinutes / 60 * loaded;
  const net = today === null || canoe === null || a.annualRun === null ? null : today - canoe - a.annualRun;
  const payback = net === null || net <= 0 || a.implementation === null ? null : a.implementation / net * 12;
  const errorCosts = Object.fromEntries(Object.entries(quality.versions).map(([v, q]) => [v,
    q.incorrect_routine_rate == null || q.unnecessary_human_review_rate == null || a.wrongRoutineCost === null || a.unnecessaryCost === null ? null :
    a.claims * (q.incorrect_routine_rate * a.wrongRoutineCost + q.unnecessary_human_review_rate * a.unnecessaryCost)]));
  const changeToday = loaded === null || a.changeWeeks === null || a.changePeople === null ? null : a.changeWeeks * 5 * a.hours * a.changePeople * loaded;
  const changeCanoe = loaded === null || measuredMinutes === undefined || a.changePeople === null ? null : measuredMinutes / 60 * a.changePeople * loaded;
  return { hourly, loaded, today, canoe, net, payback, errorCosts, changeToday, changeCanoe };
}
export function csv(rows: unknown[][]): string {
  return rows.map(row => row.map(value => {
    const text = String(value ?? '');
    const safe = /^[=+@-]/.test(text) && typeof value !== 'number' ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}