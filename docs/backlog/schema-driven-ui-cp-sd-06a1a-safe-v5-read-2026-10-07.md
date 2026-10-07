# CP-SD-06A1a — safe v5 server read — 2026-10-07

Status: **IMPLEMENTED IN PR #153 / GATE PENDING**. This is a subdivision of CP-SD-06A1, not an authorization to activate a migration.

## Scope and authority

- A strong-consistency raw blob reader obtains the exact stored JSON text and opaque blob ETag, with no default substitution.
- Explicit dispatch validates `ConfiguratorAdministration2D 3.0` using the existing v3 normalizer and `ConfiguratorAdministration2D 5.0` using the v5 validator.
- A valid stored v5 is returned as v5 on normal GET; it cannot be routed through the v3 normalizer.
- Missing blob and invalid stored v3 retain the historical default-GET resilience behavior. Unknown schemas, malformed JSON, invalid blob metadata, and invalid stored v5 fail closed rather than returning plausible defaults.
- Normal v3 PUT and the isolated `persist-handles-all` operation retain their legacy behavior while storage is v3; after v5 is stored, the old PUT endpoint refuses writes instead of downgrading the document.
- The raw reader preserves source data separately from normalized response data. Neither defaults nor normalized GET output may be used as source evidence for A1b.

## Files

- `app/core/published-configuration.js` — raw reader and explicit schema dispatcher.
- `netlify/functions/configuration.mjs` — validated GET + legacy-write downgrade guard.
- `app/data/scene-data.js` — CommonJS export of the existing unchanged scene contract for server-side validation.
- `app/tools/test-published-configuration.js` — mocked raw-store schema tests.
- `app/package.json` — includes tests in normal `npm test` gate.

## Tests and acceptance

Required:
1. Existing normal v3 shape and normalization unchanged.
2. Valid v5 round-trip and distinct v5 validator.
3. Missing, invalid JSON, unknown schema and invalid v5 are distinguishable.
4. Strong-consistency raw read retains ETag and raw source.
5. Old v3 PUT cannot overwrite a stored v5.
6. Existing `persist-handles-all` and browser/admin/price tests stay green.
7. Netlify deploy preview builds; no production data is read/written.
8. Roadmap, current-state and handoff remain synchronized.

Implementation awaits external CI and review; **do not mark COMPLETE/PASS without green gates**.

## Out of scope

- No `publish-v5-migration` endpoint/activation or source digest/revision/CAS write.
- No production schema mutation.
- No buyer, viewer, landing or pricing behavior change.

## Next

CP-SD-06A1b: an explicitly disabled-by-default admin-authenticated v3 → v5 migration operation, validated against fresh raw v3, source digest/revision/ETag, exact candidate, conditional write and exact strong readback. Review potential SDK false-positive conditional-write acknowledgements: a reported `modified` flag alone is never proof of publication.
