# Canoe — motor claim intake

Build the brief as written, with the product named "Canoe". The app only collects facts and writes one CSV-format row per claim. It never makes a decision.

## What gets built
- **Brand**: an inline SVG canoe drawn as one line, with the "Canoe" wordmark in Fraunces. Paper, ink, cedar, reed, stone and mist colors in light and dark mode. Fraunces for headings, Inter for everything else. Curved horizon dividers, 16px cards.
- **River progress**: a canoe that glides along a river line, with a "6 of 9 details" label.
- **Screens** (all on `/`): choose what happened (Car is live; Home and Health are previews), documents first (mocked sample uploads with a scan line, highlight boxes and a "Looks right / Edit" card), one question per screen (Yes / No / I'm not sure, keys 1/2/3, Enter, Backspace, autosave), check your claim (source icons, each line editable), and done (shows the claim reference).
- **Claim File panel**: sticky on the right on desktop. On mobile it becomes a pill that opens a bottom sheet. Fact chips appear with a ripple.
- **Motion**: only the motions in the brief (advance, fill, skip, glide) with the paddle easing. Reduced-motion users get plain fades.
- **Injury = Yes**: shows the specialist message and marks the remaining questions optional.
- **On submit**: a mocked insurer check (EXP, DUP, and the 5% evidence conflict). Then one row goes to `claim_rows` and every fact goes to `fact_log`.
- **`/rows`**: a denser table with "Export CSV" in the exact column order, with a header row.
- **`/continue/$caseId?missing=a,b`**: asks only the missing fields, updates the same row and ends with "Your claim is moving again."
- **Demo menu** (bottom-left): Easy claim, Incomplete claim, Electric car and Reset.

## Technical details
- Lovable Cloud tables `claim_rows` (text columns, in spec order, plus created_at), `fact_log`, and a sequence that makes FORM-0001 style IDs. Writes go through server functions. Reads are open, because the brief asks for no login.
- Questions live in `src/config/motor.json` and follow the schema in the brief. The renderer is generic.
- Pure logic in `src/lib/intake/`: `nextQuestion`, the show_if checks, derived mappings (inverted liability, repair_type), progress, the insurer lookup and CSV formatting. Vitest tests cover each rule: inverted mapping, repair_type, "not sure" stays blank, never re-asking known facts, hidden answers kept but inactive, EXP/DUP, the 5% conflict, True/False formatting and column order.
- Answers autosave to localStorage until submit.
- Add framer-motion. Load the fonts through `<link>` in the root head. Each route gets its own head metadata.
