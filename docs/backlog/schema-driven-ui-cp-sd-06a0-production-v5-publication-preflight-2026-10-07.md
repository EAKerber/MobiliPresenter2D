# CP-SD-06A0 — production v5 publication preflight — 2026-10-07

Status: **IN PROGRESS / REPOSITORY PREFLIGHT IMPLEMENTED; GATE PENDING**.

Parent:
- CP-SD-00 through CP-SD-05 — COMPLETE / PASS.
- CP-SD-05 closure: `docs/architecture/schema-driven-ui-cp-sd-05-typed-pricing-closure-2026-10-07.md`.

## Goal

Prepare the consolidated `ConfiguratorAdministration2D 5.0` candidate for the later authenticated production publication without performing any production write in this slice.

This checkpoint is repository/readiness work only.

## Authorization boundary

Current production publication remains guarded by Netlify Identity and server-side admin-role verification.

A repository/chat session must not bypass that boundary.

A0 may:

- inspect repository schemas, migrations, server code and gates;
- freeze the exact v5 candidate contract;
- design the authenticated transaction and rollback/fail-closed rules;
- add repository-only validation/preflight tooling;
- prove migration on fixtures and non-production data.

A0 must not:

- send a production configuration PUT;
- claim current live production revision/content without a fresh authenticated read;
- embed credentials in code, docs or chat;
- relax server authentication or revision guards.

## Preflight questions

Before any authenticated publication slice:

1. What exact live schema/revision/content is currently published?
2. Has the isolated v3 Puxadores repair already been executed in production, or must the migration consume the still-unrepaired live source?
3. Are any independent housekeeping transactions still pending and intentionally separate?
4. Does the current v5 upgrade from the exact live v3 source preserve every non-hierarchy/non-presentation/non-pricing semantic exactly?
5. Which v5 states are intentionally new and therefore cannot be proven through v3 round-trip alone?
6. Does the server accept the final v5 schema only under an explicit new publication operation?
7. What revision/content-digest guard prevents migration of a stale live source?
8. What exact readback and buyer/admin smoke constitutes success?
9. What is the fail-closed behavior if any invariant changes between read and write?

## Repository preflight deliverables

A0 should produce:

- one exact v5 publication candidate/schema inventory;
- one live-read evidence schema (revision, schemaVersion, digest, relevant structural facts) without storing secrets;
- one deterministic v3 -> v5 migration command/helper that accepts an explicit source object and performs no network write;
- one equivalence report covering catalog/materials/objects/assets/initial state/dependencies/events/pricing/hierarchy/presentation;
- one server contract proposal for authenticated v5 publication;
- one readback verifier;
- one production smoke checklist;
- explicit STOP conditions.

## Required STOP conditions

Do not publish if:

- live source cannot be freshly authenticated/read;
- revision or digest changes between candidate derivation and write;
- live schema is unexpected;
- migration/validation reports any error;
- unrelated commercial values change;
- pricing changes type/value/basis unexpectedly;
- hierarchy loses an item or invents an absent item;
- presentation policy fails validation;
- server cannot independently validate the v5 payload;
- exact readback cannot be performed.

## Relationship to CP-UX-05

The existing authenticated publication safety rules remain authoritative. CP-SD-06 consolidates the final candidate to v5; it does not weaken the earlier CP-UX-05 transaction discipline.

The isolated `persist-handles-all` v3 repair remains a separate guarded operation until live production evidence proves it has already been executed or the v5 migration plan explicitly consumes the current live state safely.

## A0 gate

A0 passes when repository-side publication readiness is deterministic and reviewable, while production remains unchanged.

The next slice after A0 may cross the authenticated boundary only with an interactive authenticated session and a fresh live read.


## Implementation checkpoint

Repository-only A0 work is implemented on branch `docs/cp-sd-06a0-production-v5-preflight`.

Outputs:

- offline tool: `app/tools/v5-publication-preflight.js`;
- v5/admin test coverage for deterministic migration, digest/readback verification, skirting consistency and Puxadores preconditions;
- architecture result: `docs/architecture/schema-driven-ui-cp-sd-06a0-production-v5-preflight-result-2026-10-07.md`.

Important result: the initial v5 migration is now defined as a pure schema migration from a freshly read, self-consistent, canonical v3 source. It must not combine skirting repair, Puxadores repair or arbitrary admin draft edits.

The production endpoint remains unchanged in A0 and v5 publication remains blocked.


## Gate retry checkpoint

Functional/preflight head `d59afbccf53566d895478c2f97cbb1184f72e5b4` passed:

- App build purity;
- Current asset gates, including the new v5 publication preflight tests;
- Current variant fidelity;
- Summary pricing browser;
- Mobile browser;
- Netlify deploy preview #151.

Stone browser did not reach its functional test and remained blocked in isolated browser-tool installation. No Stone/runtime assertion failed.

This documentation-only checkpoint creates a fresh head so Stone can execute on a clean runner. A0 remains IN PROGRESS until Stone browser completes successfully.
