# CP-SD-06A2 — temporary one-shot v5 cutover operator — 2026-10-07

Status: TEMPORARY CODE IN PR / PROD EXECUTION PENDING.

User authorized a guarded production migration after successful live read-only preflight and saved raw v3 backup. **This authorization is not evidence that the write occurred.** The authenticated Netlify Identity session is available only within the user's browser, not through the GitHub/Netlify project-management connectors.

## Scoped deviation from the original A2 plan

The general migration route `PUT /api/configuration` remains disabled (`V5_MIGRATION_ENABLED=false`). Instead this checkpoint adds a **temporary, separate** Netlify Function `PUT /api/publish-v5-once`, automatically present only during this explicitly authorized cutover and removable independently without altering the ordinary configuration endpoint. Its handler:
- Accepts PUT exclusively in Netlify deploy context `production` (never preview), with an unexpired short time window ending **2026-10-09 03:00 UTC**, so stale activation closes even if the operator goes offline.
- Rejects requests before Blob reads unless the session has Netlify Identity `admin` role, the origin is same-origin, and the SHA-256 source digest exactly matches the previously inspected v3 revision-6 backup.
- Rejects any candidate that is not canonical v5 with source revision 6. The shared `publishV5Migration` service independently reads fresh raw v3, re-derives the canonical candidate, validates digest/revision, uses ETag conditional write and verifies strong readback, expected revision 7 and publication signature.
- Does not expose unauthenticated preflight or arbitrary Blob access; does not auto-retry on errors.
- Is *not* a generalized transactional store: a short freeze of all other admin writes remains mandatory due to Netlify Blobs last-write-wins caveats.

## Operator action (only after this PR's tests and production deploy are green)

1. Ensure no concurrent admin editing/saving; keep the privately saved unmodified raw v3 revision-6 JSON backup.
2. Open the production `https://casaemmodulos.casa/admin.html` with an admin Identity account and reload it to pick up the new build.
3. The **Converter publicação v3 → v5 (operação única)** button appears only on v3 revision 6. Click it once and type `MIGRAR V5` in the explicit dialog.
4. The UI requests authenticated preflight twice, matches the source ETag/digest/revision across confirmation, and sends exactly the second server-generated candidate. It does not publish local draft edits.
5. Successful response must be `published_v5_verified` with the exact expected digest/signature and v5 revision 7. The UI then reads normal public configuration and confirms v5 revision 7. **If any request fails or times out, do not press twice or refresh as a retry; stop for a new raw inspection.**
6. The user should send only the redacted outcome (success/error, schema, revision, no production ETag or token). Then promptly remove this temporary Function, button, test and any activation documentation that no longer applies via a separate revert PR; verify a 404/405 on the one-shot endpoint and normal `GET`/admin v5 Save. The ordinary v3→v5 migration flag was never switched on.
7. Confirm buyer modules/finishes/services/summary, Puxadores, skirting, PiP/dock, totals, mobile and admin save without making speculative additional live mutations. Persist redacted evidence in `CURRENT_STATE.md` and close CP-SD-06 only after live proof and temporary endpoint removal.

## Stop/recovery

- Old revision, digest drift, missing admin identity, expiry, nonproduction deploy, noncanonical candidate => **fail-closed before writing**.
- Missing/failing ETag compare, unknown transport outcome or mismatched readback => **stop; never blindly resend**; obtain an authorized fresh strong raw read to find out whether publication landed.
- Production functions deploy before/after cutover must run on `main`; an isolated preview does not prove live Blob state. Explicitly verify the production deploy id/sha.
- If UI still shows v3 after deployed changes, do not force the normal admin Save route to v5 (it is not migration).
- Retain the separately saved original v3 backup. Do not commit its bytes, admin session or ETags.

Next gate: remove the temporary publication route immediately after verified cutover and update the canonical handoff. No live user-store writes are executed by repository tests.
