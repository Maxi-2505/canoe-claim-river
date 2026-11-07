import { queryOptions } from '@tanstack/react-query';
import { getPolicyApi } from '@/lib/policy/api';
import { ApiError } from '@/lib/review/types';
import type { BusinessData, BusinessClaim, Impact, Quality, AuditEvent } from './types';

const base = import.meta.env['VITE_API_URL'] as string | undefined;
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = import.meta.env['VITE_API_TOKEN'] as string | undefined;
  let res: Response;
  try { res = await fetch(`${base?.replace(/\/$/, '')}${path}`, { ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } }); }
  catch { throw new ApiError("We can't reach the Business service.", 0); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Business service returned ${res.status}.`, res.status);
  return data as T;
}
export async function loadBusiness(): Promise<BusinessData> {
  if (!base) {
    const { default: fixture } = await import('./fixture.json');
    const policy = await getPolicyApi().getPolicy();
    return { impact: fixture.impact, quality: fixture.quality as Quality, claims: fixture.claims.claims as BusinessClaim[], audit: fixture.audit.events, policy, mode: 'mock' };
  }
  const [impact, quality, claims, audit, policy] = await Promise.all([
    call<Impact>('/api/impact'), call<Quality>('/api/quality'), call<{ claims: BusinessClaim[] }>('/api/claims'),
    call<{ events: AuditEvent[] }>('/api/audit'), getPolicyApi().getPolicy(),
  ]);
  return { impact, quality, claims: claims.claims, audit: audit.events, policy, mode: 'http' };
}
export const businessQuery = queryOptions({ queryKey: ['business'], queryFn: loadBusiness, staleTime: 0 });
export async function importLabels(text: string) {
  if (!base) throw new ApiError('Import labels needs the live engine.', 422);
  return call<unknown>('/api/labelled-import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
}