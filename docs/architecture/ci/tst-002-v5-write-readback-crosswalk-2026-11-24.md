# TST-002 crosswalk slice — V5 endpoint and normal-save boundary — 2026-11-24

## Scope and evidence limits

This slice maps the V5 endpoint-safety and normal-save fixtures to persistence, authorization, migration-retirement, and readback contracts. It complements the Buyer endpoint crosswalk; it does not complete TST-002.

Readback base: Product development at 189bc7dc563e9d4bcc0079d54f152fdac9092bb4.

The tests import endpoint/core code with injected in-memory stores and Identity. They do not contact Netlify, production storage, or live Identity. The production-context case uses a mock context/store. This evidence establishes deterministic contract behavior in the fixture, not deployed-service behavior.

Evidence: E0/source-inspected means the named assertions exist and the workflow directly invokes their test files on matching paths. Execution at this exact base is not established by this receipt. Owner is UNKNOWN where no formal code-owner/contract-owner mapping is recorded.

## Source and trigger pins

| Role | Path | Blob at base |
|---|---|---|
| Endpoint contract fixture | app/tools/test-v5-endpoint-safety.js | 04beaf50607225602cac1ba3ae32ec325efc2e17 |
| Normal-save fixture | app/tools/test-v5-normal-save.js | 1e0377916e9d38b441c609bd3a55e28beb824bbe |
| HTTP endpoint consumer | netlify/functions/configuration.mjs | d5aac8c4a015bde329272c61571d86c6c2e24a40 |
| Save contract consumer | app/core/v5-normal-save.js | e9da3059ec2bbb566a0ac4c087553d383451e2e7 |
| Workflow | .github/workflows/buyer-configuration-boundary.yml | 85cc3248848970112051bdadb63f2bc28a07516e |

The workflow directly runs node app/tools/test-v5-normal-save.js and node app/tools/test-v5-endpoint-safety.js. Both pull_request and push target main and development; filters include the test files, app/core/**, app/data/**, the endpoint, and the workflow. A docs-only change does not trigger this gate.

## Assertion crosswalk

| Assertion ID | Source assertion group | Contract | Risk | Consumer | State | Fixture / environment | Evidence | Trigger | Negative assertion | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| V5-HTTP-01 | Anonymous and unauthorized raw configuration requests | Only an identified admin may read or write raw configuration | Administrative document disclosed or modified by anonymous, staff, or role-only caller | GET/PUT /api/configuration | Anonymous, staff, and admin role claim without principal ID | Injected Identity and in-memory preview store | E0; source only | Buyer configuration boundary workflow, matching endpoint/test paths | 401/403 before Blob access; role claim without ID cannot authorize either method | UNKNOWN |
| V5-HTTP-02 | Identity unavailable for GET and PUT | Identity failure is fail-closed | Identity outage accidentally grants or mutates access | Same endpoint | Identity lookup throws | Injected Identity failure sentinel | E0; source only | Same | Stable 503 response; no Blob open or write | UNKNOWN |
| V5-HTTP-03 | Raw admin read and deploy-context store selection | Admin reads the raw schema without exposing storage ETag; preview and production stores remain isolated | ETag leakage or preview request reading production storage | Same endpoint | Admin in deploy-preview; admin in explicit mock production context | Separate injected preview/site stores | E0; source only | Same | No ETag in response; preview does not open site store; production read does not write | UNKNOWN |
| V5-INSPECT-01 | Retired preflight and unsupported inspection | Retired inspection endpoints never become alternate read paths | Stale preflight leaks candidate/raw data or opens storage | GET /api/configuration?inspection=... | Anonymous, Buyer, and Admin; unknown inspection | Injected Identity and counters for store opens/reads | E0; source only | Same | Retired operation returns 410 and unknown operation 422 without Blob access or writes | UNKNOWN |
| V5-MIGRATE-01 | Retired one-time migration and V3-to-V5 creation attempts | V5 cannot be created through the retired migration or ordinary V3 PUT path | Uncontrolled migration or schema transition mutates published state | PUT /api/configuration | V3 source, V5 payload, retired migration header; existing V5 with legacy operations | In-memory V3/V5 stores | E0; source only | Same | Migration returns 410; ordinary V3-to-V5 and historic repair/downgrade paths are rejected without writes | UNKNOWN |
| V5-STATE-01 | Missing, malformed, invalid-metadata, unsupported-schema, and invalid stored documents | Invalid or absent stored state stays distinguishable and cannot be replaced as if it were a valid editable default | Silent repair/overwrite destroys or misrepresents source state | Endpoint GET/PUT and published reader | Missing source; malformed JSON; empty ETag; unknown schema; invalid V3 or V5 | In-memory normal and raw stores | E0; source only | Same | GET returns the specific 404/422 contract; PUT returns 409; every invalid source has zero writes | UNKNOWN |
| V5-SAVE-01 | Authorized save on an existing V5 source | Normal save increments revision and only succeeds through the V5 save contract | Unvalidated payload or wrong schema is persisted | Endpoint PUT /api/configuration; savePublishedV5() | Admin, existing valid V5 document | Injected Identity and ETag-aware mock store | E0; source only | Same | No raw ETag in response; V3 downgrade, wrong schema, wrong revision, malformed rules or required policy are rejected | UNKNOWN |
| V5-SAVE-02 | Conditional write and simultaneous editor race | Compare-and-set allows one editor for a shared source revision; the loser is not retried over the winner | Lost update or silent last-write-wins behavior | savePublishedV5() | Two editors read the same ETag and write concurrently | Deterministic in-memory concurrency fixture | E0; source only | Same | Exactly one winner and one 409 source_etag_conflict; one successful write, with one attempt per editor | UNKNOWN |
| V5-SAVE-03 | Save confirmation by ETag and exact readback | Success is reported only after readback confirms the written document | Phantom success or stale response after failed persistence | savePublishedV5() | Valid V5 document with matching write ETag and readback | ETag-aware mock store and digest comparison | E0; source only | Same | Returned value digest equals persisted document; write count is one | UNKNOWN |
| V5-SAVE-04 | Failed or tampered write/readback | Missing confirmation, ETag mismatch, or changed/invalid readback cannot be reported as success | Persisted state diverges from user-visible success | savePublishedV5() | Missing readback; CAS conflict; absent write ETag; phantom write; changed or invalid readback | Mock-store failure modes | E0; source only | Same | Each failure returns its specific error and never claims verified save | UNKNOWN |
| V5-SAVE-05 | Endpoint authorization and payload guards precede save | Save is unreachable until identity, admin role, size, and existing-V5 preconditions pass | Unauthorized or oversized request reaches persistence | configuration.mjs save call | Anonymous/staff/oversized payload; V3 source | Fixture plus explicit source-order assertions | E0; source only | Same | Source-order checks place auth and body-size guards before normal save; V5 path requires an already-V5 stored schema | UNKNOWN |

## Reachability and remaining work

- Both fixtures are directly invoked by the boundary workflow and included by its relevant source/test filters.
- These fixtures establish simulated endpoint/store contracts. They do not establish live Identity, Netlify Blobs, deployment, or /config/ behavior.
- The endpoint test includes specific error statuses for missing and malformed persisted state; the grouped row preserves those outcomes without pretending they are equivalent.
- This slice does not map every assertion inside the two long test files; it groups assertions by contract and risk. Additional per-case identifiers can be split if later audits find distinct ownership or independent triggers.
- The broader matrix still needs V5/publication, public DTOs, navigation/keyboard, CSS/theme, assets, and localization, followed by full workflow-condition and cost reconciliation.
- No runtime, Viewer behavior, mask content, or mask consumer is changed or evaluated by this receipt.
