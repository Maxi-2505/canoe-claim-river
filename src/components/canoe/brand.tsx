import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accent word: oxblood, upright, with a thin hand-drawn wavy underline — a quiet nod to the river. */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block not-italic text-cedar">
      {children}
      <svg viewBox="0 0 60 6" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-[0.14em] left-0 h-[0.14em] w-full text-cedar/60">
        <path d="M0 3 Q7.5 0.5 15 3 T30 3 T45 3 T60 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/** One continuous line: a shallow crescent hull crossed by a single paddle stroke. */
export function CanoeMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("text-cedar", className)}
    >
      <path
        d="M3 17.5c4.2 4.6 21.8 4.6 26 0-6.5 1.6-19.5 1.6-26 0Z M20.5 9.5 L13 23.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CanoeMark size={size} />
      <span className="font-display text-xl text-ink">Canoe</span>
    </span>
  );
}

/** Horizon line: 1px with a very gentle curve. */
export function HorizonLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 8" preserveAspectRatio="none" className={cn("h-2 w-full text-stone/40", className)} aria-hidden="true">
      <path d="M0 5 Q200 1 400 5" stroke="currentColor" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
