# MobiliPresenter2D — current backlog / handoff — 2026-10-07

Status: **CANONICAL HANDOFF FOR NEXT AGENT**.

Update 2026-10-07 A2A2b: native v5 admin Save branch `cp-sd-06a2a2b-admin-native-v5-save`, PR #159 COMPLETE / PASS (7/7 GitHub workflows, Netlify preview). It preserves legacy v3 Save and validates v5 response + GET readback, restores confirmed revision, and prevents v3-only Puxadores repair in v5. A2A3 offline rehearsal is next; production migration disabled and not authorized. Docs: `docs/backlog/schema-driven-ui-cp-sd-06a2a2b-admin-v5-save-2026-10-07.md`.

Update 2026-10-07 A2A2a: repository-only native server v5 admin-save support is COMPLETE / PASS in PR #158 (7/7 GitHub workflows, Netlify preview). Only when source storage is already v5, admin-authorized validated v5 PUT uses revision, ETag CAS and exact readback. A2A2b admin UI wiring and A2A3 rehearsal remain prerequisites before live activation; see `docs/backlog/schema-driven-ui-cp-sd-06a2a2a-server-v5-save-2026-10-07.md`.

Update 2026-10-07 (A2A0): a repository-only readiness audit found v5 consumer blockers after the successful storage migration implementation. Buyer app.js still normalizes API output as v3 and silently ignores errors; admin Save still projects v5 to v3 and server normal PUT rejects persisted v5. **Do not activate A2**. See `docs/architecture/schema-driven-ui-cp-sd-06a2a0-consumer-readiness-audit-2026-10-07.md`; A2A1a pure v3/v5 buyer input projection is COMPLETE / PASS in PR #156 (6/6 CI workflows plus Netlify preview), without runtime wiring; A2A1b browser integration and fail-closed tests are COMPLETE / PASS in PR #157 (8/8 CI workflows and Netlify preview); next A2A2 admin/server and A2A3 offline integration before live approval.

Update 2026-10-07 (A1b): migration operation support is COMPLETE / PASS in PR #154 (7/7 functional CI workflows, Netlify preview), behind source-code `V5_MIGRATION_ENABLED = false`. The source/digest/CAS/readback operation is tested only with fake stores. Next is CP-SD-06A2 (`docs/backlog/schema-driven-ui-cp-sd-06a2-authenticated-v5-publication-2026-10-07.md`), which remains NOT AUTHORIZED for live operation. `docs/backlog/schema-driven-ui-cp-sd-06a1b-guarded-migration-2026-10-07.md` is its execution document.

Update 2026-10-07: CP-SD-06A1 was split for safer review. A1a v5 server read support is **COMPLETE / PASS in PR #153 (7/7 CI workflows and Netlify preview green)**, branch `cp-sd-06a1a-v5-read-support`. This checkpoint never authorizes live migration or a production configuration mutation. A1b conditional migration-operation support follows only after A1a passes. See `docs/backlog/schema-driven-ui-cp-sd-06a1a-safe-v5-read-2026-10-07.md`.

Repository:
- `EAKerber/MobiliPresenter2D`
- resume from live `main`;
- PR #151 (CP-SD-06A0) was merged at `cabdffdaad26945e57eb32856c5d2c4c034d3b48`;
- do not assume embedded SHAs remain the permanent main head — query `main` live.

Primary resume files:
1. `CURRENT_STATE.md`
2. `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`
3. this handoff
4. active checkpoint:
   `docs/backlog/schema-driven-ui-cp-sd-06a1-server-v5-read-migration-support-2026-10-07.md`

## Working rules for the next agent

- Use the repository/GitHub connector already used by this project; do not switch to `gh` CLI.
- Keep work in small self-contained slices and persist docs/checkpoints before moving on.
- PR #97 is still the accepted buyer visual/interaction baseline unless a later accepted checkpoint explicitly changed that area.
- Do not invent catalog/product/commercial data.
- Missing semantic data must fail closed or remain absent; renderer/runtime must not recreate missing semantic UI from hard-coded fallbacks.
- Production configuration writes are **not** authorized as part of repository-only checkpoints.
- The production v5 migration must remain behind the authenticated publication boundary.
- Browser/install flakes have occurred repeatedly. If a job never reaches the actual test, do not “fix” runtime code speculatively. Distinguish runner/install failure from a reproducible test failure.
- Documentation is part of every gate: update the checkpoint doc, roadmap and `CURRENT_STATE.md` before merging a completed slice.

## High-level state

Completed:
- CP-SD-00 — authority/redundancy audit
- CP-SD-01 — schema/presentation contract
- CP-SD-02 — buyer semantic hierarchy authority consolidation
- CP-SD-03 — responsive presentation primitives
- CP-SD-04 — interaction affordance cleanup
- CP-SD-05 — typed pricing authoring/runtime/PriceBook 2.0
- CP-SD-06A0 — production v5 publication preflight

In progress:
- **CP-SD-06 — production schema publication / legacy retirement**

Immediate next:
- **CP-SD-06A1 — server v5 read + guarded migration support**
- repository/deploy code only;
- **no live production mutation**.

## Recent PR chain that matters

### PR #144 — CP-SD-04A2 admin password reveal
Merged.
- two live admin password fields gained accessible adjacent reveal controls;
- auth/submission/value semantics unchanged;
- CP-SD-04 closed COMPLETE/PASS.

### PR #145 — CP-SD-05A0 typed pricing discovery
Merged.
- froze typed pricing contract shape and migration boundary;
- only proven percentage basis: `eligible-module-base`;
- handle allocation explicitly separated from percentage basis.

### PR #146 — CP-SD-05A1 typed pricing contract
Merged.
- added `CommercialPricingRules 1.0`;
- strict rule validation;
- exact legacy v3 bucket -> typed migration;
- fail-closed typed -> legacy projection.

### PR #147 — CP-SD-05A2 typed buyer runtime
Merged.
- buyer calculator consumes typed pricing rules;
- legacy buckets remain only compatibility input;
- preserved exact totals, per-module percentage rounding and handle allocation.

### PR #148 — CP-SD-05A3a v5/admin typed pricing ownership
Merged.
- unpublished `ConfiguratorAdministration2D 5.0` owns typed pricing directly;
- admin rows edit typed roles;
- representable states project exactly to v3;
- non-representable front-finish amount fails with `pricing_requires_publication`.

### PR #149 — CP-SD-05A3b admin pricing type authoring
Merged.
- only `frontFinishAdjustment` exposes amount/percentage selector;
- choices derive from `ROLE_CAPABILITIES`;
- switching type resets numeric value to zero;
- percentage shows explicit basis;
- amount finish remains valid local v5 state but Publish stops before any current-v3 PUT.

### PR #150 — CP-SD-05A4 PriceBook 2.0 / legacy runtime retirement
Merged.
- public source is now `CommercialEstimatePriceBook 2.0`;
- nested `CommercialPricingRules 1.0` is canonical;
- buyer/admin normal runtime no longer reads legacy PriceBook pricing buckets;
- `configuration.js` owns the explicit typed -> legacy v3 compatibility seam;
- corrected latent module-detail fallback to call `pricing.itemEstimate(..., pricingRules)`;
- CP-SD-05 closed COMPLETE/PASS.

### PR #151 — CP-SD-06A0 production v5 preflight
Merged at `cabdffdaad26945e57eb32856c5d2c4c034d3b48`.
Final PR head:
- `e51f1dfd346f656ac4ef136b3c831f6ea0b5ff45`
- all 6 path-triggered workflows passed;
- Netlify preview passed.

A0 added:
- `app/tools/v5-publication-preflight.js`
- deterministic v3 -> v5 offline preflight;
- canonical JSON SHA-256 digests;
- source/candidate/readback verification;
- skirting consistency precondition;
- Puxadores ownership precondition;
- exact v5 candidate derivation;
- exact projection back to source v3;
- expected readback revision = source revision + 1;
- readback digest + publication-signature verification.

No production configuration write occurred.

## Canonical pricing state after CP-SD-05

### Public source
`CommercialEstimatePriceBook 2.0`

Contains:
- estimate metadata;
- nested `CommercialPricingRules 1.0`.

It does **not** publish parallel legacy top-level pricing buckets.

### Typed pricing roles
- `itemBase` — amount only
- `handleChoiceTotal` — amount only
- `frontFinishAdjustment` — amount or percentage
- `localAdjustment` — amount only
- `globalAdjustment` — amount only
- `allocation.handleFrontTotal` — allocation metadata

### Percentage
Only supported basis:
- `eligible-module-base`

Meaning:
1. take each eligible module base independently;
2. multiply by BPS;
3. divide by 10000;
4. `Math.round` per module;
5. then sum.

Do not replace with subtotal percentage.

### Current preserved commercial baselines
- default full estimate: **874000 cents**
- Cocoa default-composition finish total: **99000 cents**
- Tango full handle total: **17985 cents**
- handle front allocation remains deterministic over 14 fronts
- all current module/local/stone/service values preserved exactly
- zero-valued choices preserved

### Legacy v3 pricing
Allowed only in named compatibility seams:
- `ConfiguratorAdministration2D 3.0` normalization/validation/default/projection;
- current production endpoint while production remains v3;
- old import/migration fixtures/tests.

Do not reintroduce legacy bucket names as runtime/admin type authority.

## Current administration/schema state

Current production persistence authority:
- `ConfiguratorAdministration2D 3.0`

Current consolidated unpublished candidate:
- `ConfiguratorAdministration2D 5.0`

Related current contracts:
- `ConfiguratorPresentation2D 1.1`
- `CommercialPricingRules 1.0`
- `CommercialEstimatePriceBook 2.0`

Historical v4:
- import/history compatibility only;
- do not publish v4 merely as an intermediate step.

## CP-SD-06A0 conclusions

A0 is COMPLETE/PASS.

Important result:
- the **first v5 production publication must be a pure deterministic schema migration** from a freshly read, self-consistent canonical v3 source.
- do not combine schema migration with:
  - stone-skirting repair;
  - Puxadores repair;
  - arbitrary admin draft edits.

### Offline preflight tool

Path:
`app/tools/v5-publication-preflight.js`

Usage:
```bash
node app/tools/v5-publication-preflight.js source-v3.json
node app/tools/v5-publication-preflight.js source-v3.json readback-v5.json
```

The tool performs no network write.

It requires:
- exact current v3 schema;
- canonical source;
- consistent skirting state;
- safe Puxadores ownership;
- deterministic valid v5 derivation;
- exact v5 -> v3 equivalence;
- source/candidate/readback digest checks.

## Historical production evidence — DO NOT TREAT AS CURRENT

The last durable production audit was historical only and recorded revision 3 with:
- `stone-skirting` selected in `initialState.services` but not assigned to a stage;
- `handles-all` not assigned to a stage.

A0 explicitly does **not** assume this is still true.

A future production operation must start with a **fresh authenticated raw read**.

If the live source still has the skirting contradiction:
- stop;
- execute the isolated skirting consistency transaction first;
- exact readback;
- fresh read again.

If `handles-all` is still absent:
- stop;
- execute the existing isolated `persist-handles-all` v3 transaction;
- exact readback;
- fresh read again.

The v3 -> v5 migration must never invent either assignment.

## Critical endpoint findings from A0

Current:
`netlify/functions/configuration.mjs`

### Current GET is not sufficient migration evidence
Existing fallback behavior may return static defaults when:
- no blob exists;
- stored data fails current v3 normalization.

Therefore normal GET cannot prove what raw blob is actually stored.

A migration path needs a dedicated raw read that:
- never substitutes defaults;
- returns exact stored JSON;
- returns blob ETag;
- distinguishes absent vs invalid.

### Current PUT intentionally blocks v5
This remains correct until CP-SD-06 later activation.

### Revision-only stale-write protection is insufficient
The one-time migration should use the raw-read blob ETag and Netlify Blobs conditional write:
- `setJSON(..., { onlyIfMatch: sourceEtag })`

Repository dependency:
- `@netlify/blobs ^11.1.1`

The A0 result freezes ETag/CAS as part of the migration safety contract.

## Immediate backlog — CP-SD-06A1

Canonical plan:
`docs/backlog/schema-driven-ui-cp-sd-06a1-server-v5-read-migration-support-2026-10-07.md`

Status:
- **READY / NEXT — REPOSITORY ONLY**

A1 is **not** the production migration.

### A1 responsibility 1 — safe v5 read path

Implement server-side schema dispatch:

- raw store read obtains exact JSON + ETag;
- valid stored v3 -> validate with current v3 core;
- valid stored v5 -> validate with current v5 core;
- stored v5 must never flow through the v3 normalizer and become defaults;
- unknown schema -> fail closed;
- missing/invalid raw data remains distinguishable from valid stored data;
- preserve current resilience behavior where appropriate, but never use fallback output as migration evidence.

Dependencies for server-side v5 validation:
- configuration core;
- flow core;
- hierarchy defaults;
- hierarchy/v5 administration core;
- presentation/pricing dependencies;
- catalog;
- PriceBook 2.0;
- scene.

### A1 responsibility 2 — guarded migration operation

Dedicated operation:
- `x-configuration-operation: publish-v5-migration`

Still repository/deploy support only.

The operation must be admin-authenticated and must:

1. raw-read `published` with ETag;
2. reject missing blob;
3. reject non-v3 source;
4. require source canonicality;
5. require source revision == request revision;
6. require canonical source digest == `x-configuration-source-digest`;
7. require skirting consistency;
8. require Puxadores already correctly persisted;
9. derive expected v5 candidate server-side;
10. validate submitted v5;
11. require submitted candidate == server-derived candidate;
12. set output revision = source revision + 1;
13. write with `onlyIfMatch: sourceEtag`;
14. require conditional write success;
15. raw-read v5 again;
16. verify exact schema/revision/digest/publication signature;
17. return evidence.

### Activation boundary

Preferred safety order:
1. implement operation behind a repository-controlled activation flag that defaults **false** in production;
2. alternatively use a separate endpoint/function deployed only for the authenticated migration checkpoint;
3. if neither stays clean/testable, split A1 into:
   - A1a v5 read support;
   - A1b migration-operation support.

Do not use a hidden client convention as the safety boundary.

### Existing behavior A1 must preserve

- current normal v3 PUT behavior;
- `persist-handles-all` isolated operation;
- current authentication / admin-role checks;
- payload size limit;
- no-store response headers;
- buyer pricing values;
- hierarchy defaults;
- presentation policy;
- v5 schema meaning;
- unrelated functions.

### Required A1 tests

At minimum:
- normal GET valid v3;
- normal GET valid v5;
- stored v5 never falls back to defaults;
- raw/migration path rejects unknown/invalid schema;
- migration rejected while activation is off;
- unauthorized migration rejected;
- forbidden non-admin migration rejected;
- wrong source digest rejected;
- stale revision rejected;
- changed/missing ETag conditional write rejected;
- skirting contradiction rejected;
- missing/wrong Puxadores ownership rejected;
- tampered candidate rejected;
- exact deterministic candidate accepted in mocked/non-production store;
- revision increments exactly once;
- exact readback verified;
- existing `persist-handles-all` tests remain green.

### A1 completion gate

A1 passes only when:
- server can safely read current v5 if stored;
- migration operation is fully testable;
- production migration still cannot occur accidentally;
- no live production mutation has been performed;
- docs + `CURRENT_STATE.md` are synchronized.

## After A1

The A1 plan says the subsequent checkpoint is the **explicit activation/authenticated execution boundary**.

Do not execute that future checkpoint unless:
- there is an interactive authenticated admin session;
- a fresh raw live read is available;
- exact live revision/digest/ETag are captured;
- skirting/Puxadores preconditions are already satisfied;
- server v5 read support is deployed first;
- conditional migration write is enabled deliberately;
- exact readback and production smoke can be executed immediately.

If any invariant differs between read and write: STOP without claiming success.

## Known documentation wrinkle

Before this handoff, the A0 result document header still said:
`REPOSITORY PREFLIGHT IMPLEMENTED / GATE PENDING`

while:
- the A0 plan contains the final COMPLETE/PASS result;
- `CURRENT_STATE.md` marks A0 COMPLETE/PASS;
- PR #151 is merged and green.

This handoff commit should synchronize that result header to COMPLETE/PASS so a new agent does not treat A0 as open.

## Suggested first actions for the next agent

1. Query live `main`.
2. Read `CURRENT_STATE.md`.
3. Read this handoff.
4. Read the A1 execution doc.
5. Inspect `netlify/functions/configuration.mjs`, current endpoint tests and Netlify Blobs usage.
6. Design A1 as small slices; prefer read support before migration support if one PR becomes too broad.
7. Add mocked store tests before enabling any migration operation.
8. Keep activation disabled.
9. Close each slice with repository gates and documentation.
10. Do **not** read or mutate live production configuration until the later explicitly authenticated execution checkpoint.
