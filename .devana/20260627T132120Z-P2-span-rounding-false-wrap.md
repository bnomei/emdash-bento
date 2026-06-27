DEVANA-FINDING: v1
Priority: P2 | Confidence: medium | Security-sensitive: no | Status: fixed
Location: src/layout.ts:76-85,src/admin.tsx:479-492 | Slug: span-rounding-false-wrap

# spanToGridColumns rounding wraps exact full-width rows

## Finding

`spanToGridColumns` uses per-span `Math.round((numerator / denominator) * 12)`. For some valid equal-width patterns whose fractions sum to exactly `1/1`, the rounded grid totals exceed 12 and columns wrap even though the row is not wider than a full line.

## Violated Invariant Or Contract

README states that columns wrap only when row widths add up to more than `1/1`. A row whose fractions sum to exactly `1/1` should occupy one grid row in the admin preview and in frontend layouts that use the same helper.

## Oracle

Pattern `"1/7, 1/7, 1/7, 1/7, 1/7, 1/7, 1/7"` (seven valid spans) should render all seven columns on one 12-column grid row.

## Counterexample

- Each `spanToGridColumns("1/7")` = `Math.round(12/7)` = `2`
- Row grid total = `7 × 2` = **14** (> 12) → columns wrap
- Fractional width = `7 × (1/7)` = **1** (not > `1/1`)

The same failure occurs for eight `"1/8"` columns (grid total 16, fractional sum 1).

## Why It Might Matter

Editors can enter valid patterns with denominators 7–12 that the README accepts, but the admin preview and published CSS grid layout wrap columns incorrectly, diverging from the documented wrap rule.

## Proof

**Counterexample value:** seven `"1/7"` spans pass `isValidLayoutSpan` but produce a 14-unit grid row.

**Control-flow trace:** `layoutSpans` accepts spans → admin maps `spanToGridColumns(column.span)` into `gridColumn: span N` → CSS grid wraps when summed spans exceed 12.

## Counterevidence Checked

- README wrap clause is tied to fractional sums > `1/1`, not rounded grid totals.
- `layout.test.ts` asserts per-span conversions (`1/2→6`, `1/3→4`) but not row totals.
- Intentional per-span clamping to 1–12 is tested; row-total drift is not documented as expected behavior.
- Frontend and admin both call the same helper, so the mismatch is consistent rather than admin-only.

## Suggested Next Step

Compute row-level grid allocation with a denominator-aware algorithm (for example distribute 12 units across equal fractions without per-span rounding overflow), or document that wrap follows rounded grid totals rather than fractional sums.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Added a row-aware `layoutGridSpans(spans)` helper in src/layout.ts. When the fractional total is <= 1/1 it distributes `round(total * 12)` grid units across the columns with a largest-remainder method (each column >= 1 unit), so equal-width patterns such as seven 1/7 (or eight 1/8) total 12 and stay on one grid line instead of overflowing to 14/16 and wrapping. Rows whose fractions sum to more than 1/1 keep per-span `spanToGridColumns` rounding so they still wrap as the README documents. Admin now computes one `rowGridSpans` per row and indexes it by column instead of calling `spanToGridColumns` per span; `layoutGridSpans` is re-exported from render.ts and the public index.ts for frontend layouts that share the helper. Common patterns (1/2,1/2 -> 6,6; 1/3 x3 -> 4,4,4; 1/2,1/3,1/6 -> 6,4,2) are unchanged. Added a runtime regression test. Verified: 26/26 tests pass, `tsc --noEmit` clean.

DEVANA-KEY: src/layout.ts:76-85,src/admin.tsx:479-492 | P2 | span-rounding-false-wrap
DEVANA-SUMMARY: Status=fixed | P2 medium src/layout.ts:76-85,src/admin.tsx:479-492 - Equal-width rows summing to 1/1 (e.g. seven 1/7) rounded to >12 grid units and wrapped. Fixed with a row-aware largest-remainder layoutGridSpans allocation; sum>1/1 rows still wrap.