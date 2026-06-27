DEVANA-FINDING: v1
DEVANA-STATE: open | P2 | high | security=no
DEVANA-KEY: src/render.ts:15-18 | is-layout-builder-row-primitive-throws

# isLayoutBuilderRow throws TypeError when a row's columns[0] is a non-null primitive

## Finding

`isLayoutBuilderRow` is an exported type guard (re-exported from `src/index.ts:20`) whose job is to classify an arbitrary `unknown` value. For a value that is a record with a `columns` array whose first element is a non-null primitive (string/number/boolean) and that has no own `layout` key, the guard throws `TypeError: Cannot use 'in' operator to search for 'span' in <primitive>` instead of returning a boolean.

```ts
export function isLayoutBuilderRow(value: unknown): value is LayoutBuilderRow {
  const columns = isRecord(value) && Array.isArray(value.columns) ? value.columns : [];
  return isRecord(value) && ("layout" in value || "span" in (columns[0] ?? {}));
}
```

The `columns[0] ?? {}` guard only substitutes for `null`/`undefined`. A non-nullish primitive (e.g. `"x"`) passes straight through into `"span" in "x"`, and the `in` operator throws when its right operand is a primitive.

## Violated Invariant Or Contract

A type-guard / predicate of shape `(value: unknown) => value is T` must be total over `unknown` and return a boolean for any input. It must never throw. This guard violates that contract for a reachable class of inputs.

## Oracle

The function signature `value is LayoutBuilderRow` and its sibling `?? {}` defensive coding both encode the intent that arbitrary/malformed input is expected and must be handled safely. The neighboring `isRecord` guard and the `?? {}` fallback show the author anticipated non-conforming shapes; the fallback is simply incomplete (covers nullish, not primitives).

## Counterexample

```js
isLayoutBuilderRow({ columns: ["x"] });
// also: { columns: [0] }, { columns: [true] }, { columns: ["a","b"] }
```

Trace:
1. `isRecord(value)` → true; `Array.isArray(value.columns)` → true, so `columns = ["x"]`.
2. `"layout" in value` → false (no `layout` key), so `||` evaluates the right side.
3. `columns[0] ?? {}` → `"x"` (non-nullish), so the expression is `"span" in "x"`.
4. `in` with a primitive right operand throws `TypeError`.

Verified directly under Node: `"span" in ("x" ?? {})` → `THROWS: Cannot use 'in' operator to search for 'span' in x`.

## Why It Might Matter

`isLayoutBuilderRow` is a public render-side classifier. A host iterating stored rows (`rows.filter(isLayoutBuilderRow)` or `rows.some(isLayoutBuilderRow)`) over legacy/imported/hand-authored JSON would crash the whole render pass on a single malformed row, instead of the row being classified as `false` and skipped. The thrown error escapes the guard, defeating its defensive purpose.

## Proof

- Control-flow trace + counterexample value (above): branch where `"layout"` is absent and `columns[0]` is a non-null primitive reaches `"span" in <primitive>` and throws.
- Runtime confirmation of the `in`-operator throw on a primitive.

## Counterevidence Checked

- The `columns[0] ?? {}` fallback: only guards `null`/`undefined`, so `columns: [null]` safely returns `false`. The crash specifically needs a non-null primitive first element — confirmed not covered.
- Could the host pre-normalize before calling the guard? The guard is exported precisely to be run on un-normalized `unknown` input (it is the gate before normalization), so requiring prior normalization would make the guard pointless. No caller in this repo proves pre-normalization.
- Strongest reason it might be false: maybe such inputs never occur. But `columns` is plain stored JSON; an array of primitive placeholders (or a corrupted/legacy entry) is a realistic shape, and the guard's own signature promises totality over `unknown`. Distinct from `is-layout-builder-row-span-gap` (a non-throwing misclassification) and from `normalize-layout-column-null-throws` (a different function, and the `null` case here is safely handled).

## Suggested Next Step

Guard the right operand of `in` against non-records, e.g. `isRecord(columns[0]) && "span" in columns[0]`, or wrap with the existing `isRecord` helper before using `in`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` prefix. Keep `DEVANA-KEY:` stable unless the same finding moved.

## Status Notes

- 2026-06-27: open by Devana. Found via outside-in-entrypoints trail; `in`-operator throw on primitive confirmed at runtime.

DEVANA-KEY: src/render.ts:15-18 | is-layout-builder-row-primitive-throws
DEVANA-SUMMARY: Status=open | P2 high src/render.ts:15-18 - isLayoutBuilderRow throws TypeError on a row whose columns[0] is a non-null primitive because the `?? {}` fallback only guards nullish values before `"span" in ...`.
