# CP-SD-06A2 — production v5 cutover evidence — 2026-10-07

Status: **LIVE MIGRATION COMPLETE / VERIFIED BY SERVER + CLIENT; TEMPORARY FUNCTION REMOVED**. Final cross-device buyer smoke and later legacy retirement remain separate follow-up gates.

## Actual cutover (sanitized)

- User explicitly authorized live one-time migration after authenticated read-only production preflight. The owner confirmed a raw `published` v3 backup was saved privately, and the submitted v3 document matched the inspected source canonical digest. Its bytes and ETag are intentionally **not committed**.
- Preflight returned `200 / v5_preflight_ready`, stored source `ConfiguratorAdministration2D 3.0` revision `6`, digest `1bdee1066214fb097486b1b412899db751d4a1942b89c0721fb79e12fbcd7317`, and expected v5 readback revision `7`, digest `9e346639278dda462a614af5f472243c87b0d9794dd9350f1dae580d2021c5b2`. Handles, stone and skirting ownership passed the preflight.
- PR #164 (`4b711a88d9edfb9f95f73a843e47f0da318a9d8d`) deployed a *temporary* production-only, Identity-admin, canonical-digest-pinned, time-limited `PUT /api/publish-v5-once`; 7/7 CI and Netlify preview passed.
- The authenticated operator executed the button `Converter publicação v3 → v5 (operação única)` in the production admin. They supplied a screenshot showing the **green** message: `Migração concluída e confirmada pelo servidor: v5 revisão 7. Informe o resultado para remover imediatamente o endpoint temporário.`
- That specific UI branch only displays this message **after** the shared publication service confirms the strong raw postwrite readback (source ETag CAS, expected revision/digest, signature) **and** the browser `GET /api/configuration` yields schema v5 revision 7. The screenshot is the operator's observed result; no independent connector-based raw-Blob postwrite inspection was possible.
- PR #165 (`88b696b584277cedea9a6d113784df7d4e51082c`) removed the one-shot endpoint, operator button and temporary test after 7/7 CI and Netlify preview. The connected Netlify project reports production deploy `6ac6ee8a1e27d2000827daa2` **ready** at `2026-10-08T01:15:03Z`, commit `88b696b584277cedea9a6d113784df7d4e51082c`, with only the normal `configuration` function deployed. The `v5-publication-once` function is no longer present in the deployed functions list.
- Permanent `V5_MIGRATION_ENABLED = false` remains in `netlify/functions/configuration.mjs`. Native v5 buyer/administration is supported; no second migration is needed or allowed.

## Remaining verification (not silently marked complete)

- Cross-device buyer smoke: Modules, Acabamentos/Puxadores, stone+skirting, Serviços, Resumo, PiP/dock, mobile, typed pricing totals and normal admin read. The server/browser publish-readback above verifies storage and basic public schema; the full human visual walkthrough remains outstanding.
- Native v5 admin Save should only be tested with a separately authorized, intentional edit, **not** by changing production prices as a smoke fixture.
- CP-SD-06 legacy retirement: a separately reviewed cleanup of obsolete normal v3 writers where appropriate, preserving explicit historical import/migration support.
- Production migration already happened; **do not attempt it again**. Store the backup privately and do not publish credentials, raw JSON or ETags.

## Sources of authority

- Code and tests: PRs #153–#165.
- Runbook: `docs/backlog/schema-driven-ui-cp-sd-06a2a3c2-production-cutover-runbook-2026-10-07.md`.
- User-provided result: green success screenshot from the production admin, 2026-10-07.
- Netlify project deploy metadata confirmed via connected Netlify project management.

This document records the completed live migration; it does not assert that every manual visual buyer smoke is already passed.
