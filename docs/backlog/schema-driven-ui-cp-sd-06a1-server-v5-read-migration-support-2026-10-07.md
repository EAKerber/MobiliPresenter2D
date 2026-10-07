# CP-SD-06A1 — server v5 read + guarded migration support — 2026-10-07

Status: **SPLIT INTO A1a / A1b — REPOSITORY ONLY**. A1a implemented in draft PR #153, gates pending. A1b is subsequent, with production activation disabled.

A1a execution/gate document: `docs/backlog/schema-driven-ui-cp-sd-06a1a-safe-v5-read-2026-10-07.md`.

Parent:
- CP-SD-06A0 — COMPLETE / PASS.
- Result: `docs/architecture/schema-driven-ui-cp-sd-06a0-production-v5-preflight-result-2026-10-07.md`.

## Goal

Prepare the production configuration function to understand stored v5 safely and to expose a dedicated, fully guarded v3 -> v5 migration operation in repository/deploy code.

A1 is still **not** the production mutation.

No live configuration PUT is authorized in this slice.

## Required split

A1 has two server responsibilities:

1. **read path**
   - raw store reads distinguish missing/invalid data from valid stored data;
   - normal GET can return either validated v3 or validated v5;
   - a stored v5 record must never fall through the v3 normalizer and become static defaults;
   - buyer/admin compatibility behavior for current v3 remains unchanged.

2. **migration operation**
   - dedicated operation name: `publish-v5-migration`;
   - authenticated admin only;
   - accepts only an exact deterministic migration from the freshly read raw canonical v3 source;
   - uses source revision + canonical digest + blob ETag;
   - writes with `onlyIfMatch`;
   - increments revision exactly once;
   - strongly re-reads and verifies the written v5 record before claiming success.

## Activation boundary

Repository support may be merged before the live migration, but the migration operation must remain fail-closed until the reviewed activation condition is explicit.

Preferred implementation options, in order:

1. server operation implemented but requires an explicit repository-controlled activation flag that defaults false in production;
2. separate endpoint/function deployed only in the authenticated migration checkpoint;
3. if neither is cleanly testable, split A1 into read support first and migration-operation support second.

Do not rely on a hidden client convention as the safety boundary.

## Raw read contract

Add one internal raw-reader path based on the strong-consistency store that can obtain:

- exact stored JSON;
- exact blob ETag;
- absence versus invalid-content distinction.

It must not substitute defaults.

The existing fallback reader may remain for normal legacy buyer/admin resilience only if its purpose remains explicit and v5 cannot be misread through it.

## Schema dispatch

A server-side dispatcher should validate by exact schema:

- `ConfiguratorAdministration2D 3.0` -> current v3 core;
- `ConfiguratorAdministration2D 5.0` -> current v5 core;
- historical v4 remains import history, not a normal production authority;
- unknown schema -> fail closed.

For v5 validation the function will need the same deterministic dependencies used by the current v5 tests:

- configuration core;
- flow core;
- hierarchy defaults;
- hierarchy/v5 administration core;
- presentation/pricing dependencies already transitively required;
- catalog, price book and scene.

## Migration request contract

Required request evidence:

- header `x-configuration-operation: publish-v5-migration`;
- header `x-configuration-source-digest: <sha256>`;
- v5 payload whose request revision equals the current live v3 revision.

The server must:

1. authenticate admin;
2. raw-read `published` with ETag;
3. reject missing blob;
4. reject non-v3 source;
5. require source canonicality;
6. require source revision == request revision;
7. require source digest == header digest;
8. require skirting consistency;
9. require Puxadores already correctly persisted;
10. derive expected v5 server-side;
11. validate submitted v5;
12. require submitted candidate == server-derived candidate;
13. set output revision = source revision + 1;
14. write with `onlyIfMatch: sourceEtag`;
15. require `modified === true`;
16. raw-read v5 with strong consistency;
17. verify exact digest/signature/readback;
18. return evidence.

## Existing operations

Preserve:

- normal current v3 PUT behavior until production v5 migration succeeds;
- `persist-handles-all` as its isolated v3 operation;
- current authentication/role checks;
- payload size limit;
- no-store response headers.

Do not combine skirting repair, Puxadores repair or schema migration.

## Tests

Repository tests must cover at least:

- normal GET with valid v3;
- normal GET with valid v5;
- v5 never falls back to defaults;
- unknown/invalid stored schema fails closed in raw/migration path;
- migration rejected when activation is off;
- unauthorized/forbidden migration rejected;
- wrong source digest rejected;
- stale revision rejected;
- missing/changed ETag conditional write rejected;
- missing skirting owner contradiction rejected;
- missing/wrong Puxadores ownership rejected;
- submitted candidate tamper rejected;
- exact deterministic candidate accepted in a mocked/non-production store;
- revision increments exactly once;
- exact readback verified;
- existing `persist-handles-all` tests stay green.

## Preserve

Do not change:

- production data;
- buyer pricing values;
- hierarchy defaults;
- presentation policy;
- v5 schema meaning;
- admin credentials/auth model;
- unrelated Netlify functions.

## Completion

A1 passes when server code can safely read v5 and the migration operation is fully testable but still cannot mutate live production accidentally.

The subsequent checkpoint is the explicit activation/authenticated execution boundary.
