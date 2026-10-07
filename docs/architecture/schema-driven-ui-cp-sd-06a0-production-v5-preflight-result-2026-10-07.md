# CP-SD-06A0 — production v5 publication preflight result — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-00 through CP-SD-05 — COMPLETE / PASS.
- CP-SD-06A0 plan: `docs/backlog/schema-driven-ui-cp-sd-06a0-production-v5-publication-preflight-2026-10-07.md`.

## Result summary

The repository already has a deterministic `ConfiguratorAdministration2D 5.0` upgrade/validation core, but the current production endpoint is intentionally still a v3 endpoint.

A0 therefore freezes a two-part publication boundary:

1. repository/offline preflight derives and verifies the exact v5 migration candidate from an explicit canonical v3 source;
2. a later authenticated server operation must re-read the raw live blob, verify the same source through revision + digest + ETag, derive the expected v5 candidate server-side and perform one conditional write.

A0 performs no production write.

## Repository candidate

Current candidate:

- administration schema: `ConfiguratorAdministration2D 5.0`;
- presentation contract: `ConfiguratorPresentation2D 1.1`;
- pricing contract: `CommercialPricingRules 1.0`;
- public price source: `CommercialEstimatePriceBook 2.0`.

The v5 core already provides:

- strict validation;
- deterministic v3/v4 -> v5 upgrade;
- normalized typed pricing;
- executable section behavior/component ownership;
- validated presentation policy;
- a publication signature covering hierarchy, presentation and pricing;
- lossless projection back to v3 when the v5 state is representable.

## New offline preflight tool

`app/tools/v5-publication-preflight.js` accepts an explicit JSON source and performs no network calls.

Usage:

```bash
node app/tools/v5-publication-preflight.js source-v3.json
node app/tools/v5-publication-preflight.js source-v3.json readback-v5.json
```

It freezes the following requirements:

- source schema is exactly the current `ConfiguratorAdministration2D 3.0`;
- source is already canonical: normalization must not silently change it;
- source digest is SHA-256 over a deterministic canonical JSON representation;
- contradictory legacy skirting state blocks migration;
- missing/conflicting Puxadores assignment blocks migration;
- v3 -> v5 derivation is deterministic;
- derived candidate passes current v5 validation;
- derived candidate projects exactly back to the source v3 object;
- expected readback revision is exactly source revision + 1;
- readback must match both exact digest and v5 publication-signature digest.

The tool reports evidence only; it never repairs or writes the source.

## Production consistency preconditions

The last durable production audit is historical evidence only, not a current read. It recorded revision 3 with both of these conditions:

- `stone-skirting` selected in `initialState.services` but not assigned to a stage;
- `handles-all` not assigned to a stage.

A0 does not assume those conditions are still current.

If a fresh live source still has the skirting contradiction, publication is blocked with `skirting_repair_required`.

The existing housekeeping transaction must run separately:

1. fresh live read;
2. add only the missing `stone-skirting` stage assignment if the contradiction still exists;
3. conditional write;
4. exact readback;
5. prove runtime skirting repair becomes a no-op;
6. fresh read again before any next mutation.

If the live source intentionally omits both skirting selection and control, the preflight permits that state.

After skirting consistency is established, if `handles-all` is still unassigned, publication is blocked with `handles_repair_required`.

The already-existing `persist-handles-all` transaction remains the only authorized repair:

1. fresh live read;
2. add exactly `handles-all` to Acabamentos;
3. conditional write;
4. exact readback;
5. fresh read again before v5 migration.

The v3 -> v5 migration itself never invents either assignment.

## Critical endpoint findings

Current `netlify/functions/configuration.mjs` is safe as a v3 endpoint but is not yet suitable as the v5 migration transaction.

### 1. Current GET is not migration evidence

`readPublished()` currently returns static defaults when:

- no `published` blob exists; or
- the stored blob fails v3 normalization.

That behavior is a useful buyer/admin fallback, but it means the normal GET cannot prove which raw blob was actually stored.

The v5 migration must therefore use a dedicated raw read path that never substitutes defaults.

### 2. Current PUT blocks v5 before validation

The server explicitly returns `hierarchy_publication_required` for v4/v5.

That boundary remains correct until the later authenticated migration slice.

### 3. Revision alone is not sufficient

The current endpoint checks `payload.revision === current.revision` before `setJSON`.

For the one-time schema migration, the server should additionally use the blob ETag from the same raw read and perform the write with Netlify Blobs `onlyIfMatch`.

Repository dependency is `@netlify/blobs ^11.1.1`, and current Netlify Blobs documentation exposes `onlyIfMatch` for conditional `setJSON` writes.

The migration transaction should therefore fail if the blob changed after the preflight read, even if a competing writer reused or manipulated revision metadata.

## Proposed authenticated server operation

Proposed operation name:

`x-configuration-operation: publish-v5-migration`

This is intentionally different from normal v3 PUT and from `persist-handles-all`.

### Request evidence

The authenticated request should carry:

- payload: exact v5 candidate;
- candidate `revision`: the freshly read source v3 revision;
- `x-configuration-source-digest`: SHA-256 canonical digest of the exact source v3 object;
- optionally expose/store the source ETag only as an opaque transaction token; never derive meaning from it.

### Server algorithm

1. Require authenticated user with role `admin`.
2. Strongly read `published` with metadata/ETag.
3. Reject if the blob does not exist.
4. Reject if raw source schema is not exactly current v3.
5. Normalize raw source and reject if normalization changes canonical content.
6. Verify source revision equals request candidate revision.
7. Verify canonical source digest equals `x-configuration-source-digest`.
8. Verify skirting consistency.
9. Verify `handles-all` has exactly one owner and that owner is Acabamentos/finishes.
10. Derive expected v5 candidate server-side from that exact v3 source.
11. Validate the submitted v5 payload.
12. Require submitted normalized payload to equal the server-derived candidate exactly, except that the server owns the post-write revision.
13. Set post-write revision to source revision + 1.
14. Write `published` with `onlyIfMatch: sourceEtag`.
15. If the conditional write reports `modified: false`, return conflict and do not claim success.
16. Strongly re-read raw v5.
17. Validate schema, revision, exact digest and publication signature.
18. Return the readback evidence.

No hierarchy edit, pricing edit, skirting repair or Puxadores repair is combined into this operation.

## Initial migration policy

The first v5 publication should be a deterministic schema migration only.

The server-derived v5 payload must be the exact result of the frozen upgrade from the fresh self-consistent v3 source.

Do not use the first v5 publication transaction to introduce arbitrary admin draft edits.

Normal v5 authoring/publication can be enabled only after the first migration readback is proven and the production endpoint can read/validate v5 as its normal authority.

## Read-path requirement before writing v5

The deployed server code must be capable of reading and returning a valid stored v5 record **before** the migration write is enabled.

Otherwise a successful v5 write could make the existing v3-only read path fall back to defaults.

This is a hard publication precondition.

## Evidence schema

For the later authenticated transaction, persist no secrets. Record:

```json
{
  "source": {
    "schemaVersion": "ConfiguratorAdministration2D 3.0",
    "revision": 0,
    "digest": "<sha256>",
    "etag": "<opaque>",
    "stageIds": [],
    "stoneOwners": [],
    "skirtingOwners": [],
    "skirtingSelected": false,
    "handlesOwners": []
  },
  "candidate": {
    "schemaVersion": "ConfiguratorAdministration2D 5.0",
    "revision": 0,
    "digest": "<sha256>",
    "publicationSignatureDigest": "<sha256>"
  },
  "readback": {
    "schemaVersion": "ConfiguratorAdministration2D 5.0",
    "revision": 0,
    "digest": "<sha256>",
    "publicationSignatureDigest": "<sha256>"
  }
}
```

The exact live values must come from the authenticated migration session, not from this document.

## STOP conditions

Stop without writing if any of the following is true:

- raw `published` blob is absent;
- live schema is not current v3;
- live normalization changes the raw source;
- skirting is selected but has no stage owner;
- skirting has conflicting ownership;
- Puxadores is absent, duplicated or owned by the wrong stage;
- source revision changed;
- source digest changed;
- source ETag changed;
- v5 migration throws;
- v5 validation reports an error;
- candidate cannot project exactly to the source v3;
- submitted candidate differs from the server-derived migration candidate;
- conditional write is not modified;
- readback schema/revision/digest/signature differs;
- production smoke cannot be executed.

## Next implementation slice

After A0 gates pass, the next repository slice should add **server-side v5 read + migration-operation support** while keeping the operation disabled/fail-closed until reviewed.

The actual production mutation remains a separate interactive authenticated step.


## Final gate / merge evidence

CP-SD-06A0 is closed.

Final PR:
- #151 — `CP-SD-06A0: add offline v5 publication preflight`
- final head: `e51f1dfd346f656ac4ef136b3c831f6ea0b5ff45`
- merge commit: `cabdffdaad26945e57eb32856c5d2c4c034d3b48`
- all six path-triggered workflows passed;
- Netlify deploy preview passed;
- no production configuration write occurred.

Next:
`docs/backlog/schema-driven-ui-cp-sd-06a1-server-v5-read-migration-support-2026-10-07.md`.
