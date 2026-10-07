# CP-SD-02A0 — residual semantic-renderer inventory — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`

Baseline:
- CP-SD-01 is COMPLETE / PASS;
- `ConfiguratorAdministration2D 5.0` is the frozen unpublished current repository candidate;
- production remains on guarded v3;
- accepted PR #97 buyer behavior remains the visual/interaction baseline.

## Purpose

Before deleting static buyer markup, create one concrete inventory of the **remaining places where renderer/DOM/runtime still know domain semantics that should belong to normalized data + presentation contracts**.

This checkpoint is deliberately small and read-mostly.

No buyer behavior change is allowed.

## Scope

Inspect and classify only buyer/runtime composition surfaces:

- `app/index.html`;
- `app/app.js`;
- `app/core/flow-layout.js`;
- `app/core/flow-model.js`;
- `app/core/keyboard-shortcuts.js`;
- `app/core/presentation-contract.js`;
- `app/data/hierarchy-defaults.js`;
- related focused tests that pin current semantic markup.

For each coupling record:

1. file/symbol;
2. current semantic knowledge;
3. whether that knowledge is legitimate renderer binding or duplicate domain authority;
4. current consequence if normalized data omits the section/item;
5. target owner;
6. smallest safe removal checkpoint.

## Classification

Use these categories:

- **R0 legitimate binding** — generic visual primitive or stable hook; keep;
- **R1 static semantic shell** — markup pre-creates a semantic section/item that normalized data should decide;
- **R2 runtime domain branch** — code branches on specific section/item IDs instead of generic capability/binding;
- **R3 compatibility fallback** — missing normalized data is reconstructed from DOM/default domain knowledge;
- **R4 duplicated ordering/ownership** — renderer carries stage/group/section order separately from normalized flow;
- **R5 test-only legacy pin** — tests require an obsolete semantic authority and must move with its implementation.

## Required proofs

A0 PASS requires:

- every current `data-flow-item-id`, `data-keyboard-section`, `data-configurable-item`, stage/section domain branch and fallback path is accounted for;
- Puxadores/Frentes/Pedra/Serviços/Modules/Resumo are each traced from normalized data to rendered DOM;
- identify the **first smallest deletion slice** where absence in normalized data can make one modeled semantic section disappear instead of being recreated statically;
- identify which tests must change with that slice;
- no code/runtime/production changes.

## Gate / definition

PASS when a persisted matrix is sufficient to implement the next checkpoint without a second broad audit.

The next checkpoint must be intentionally narrow. Preferred shape:

**CP-SD-02A1 — one section family becomes data-authoritative**

Candidate selection is made from A0 evidence, favoring the smallest family with:
- clear normalized owner;
- minimal scene/state side effects;
- browser coverage already available;
- a negative fixture can prove “missing data = no UI”.

Do not combine Modules companion, PiP, bottom dock, pricing or interaction polish into CP-SD-02A1.


## Completion record

PASS. The concrete matrix is persisted in:
- `docs/architecture/schema-driven-ui-cp-sd-02a0-renderer-inventory-2026-10-07.md`.

The audit selected **CP-SD-02A1 — stage navigation source cleanup** as the next smallest code checkpoint.
