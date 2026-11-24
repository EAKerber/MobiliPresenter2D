# TST-002 crosswalk slice — published configuration and Buyer DTO projections — 2026-11-24

## Scope and evidence limits

This slice maps the pure published-configuration reader and Buyer projection fixtures to V3/V5 compatibility, fail-closed stored-state handling, hierarchy authority, and DTO projection. It complements the Viewer price, Buyer authorization, and V5 write/readback slices; it does not complete TST-002.

Readback base: Product development at 5ccd82ef4c5336b8fd2a29b05b91a773ef7a44ca.

Both tests are local Node fixtures using in-memory objects and repository modules. They do not contact Netlify, production storage, live Identity, or browser routes.

Evidence: E0/source-inspected means the named assertions exist and the workflow directly invokes their test files on matching paths. No execution at this exact base is claimed. Owner is UNKNOWN where no formal code-owner or contract-owner mapping is recorded.

## Source and trigger pins

| Role | Path | Blob at base |
|---|---|---|
| Published storage/read fixture | app/tools/test-published-configuration.js | 732fb080a925ebb18af6bf605ef7d87ebbf8baf6 |
| Buyer projection fixture | app/tools/test-published-buyer-projection.js | c13cbbf59b761b7add3a1a3ee26d88571d610531 |
| Stored source reader | app/core/published-configuration.js | 7b5d13dfb43983a0efa622c1ad4a4531820a8ad0 |
| Buyer projection and consumer | app/core/published-buyer-projection.js | c1f8e099f2dce29bd003577e8c0a724d7b6475fa |
| Workflow | .github/workflows/buyer-configuration-boundary.yml | 85cc3248848970112051bdadb63f2bc28a07516e |

The workflow directly invokes both test files. Its pull_request and push events target main and development, with app/core/**, app/data/**, both test paths, relevant Netlify endpoints, and the workflow in the path filters. This is a declared execution route for matching product/test changes; docs-only changes do not trigger it.

## Assertion crosswalk

| Assertion ID | Source assertion group | Contract | Risk | Consumer | State | Fixture / environment | Evidence | Trigger | Negative assertion | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| PUB-READ-01 | Raw V3 and V5 reads preserve source/schema and normalize with the matching validator | Existing published schemas are recognized and interpreted by their own validators | V3 data is misread as V5 or vice versa; raw evidence is lost | published-configuration reader | Valid V3 then valid V5 source | In-memory strong-consistency store with opaque ETag | E0; source only | Configuration boundary workflow on matching reader/test paths | Schema-specific normalized value is checked while raw source and ETag remain identifiable | UNKNOWN |
| PUB-READ-02 | Missing, malformed, invalid metadata, unknown schema, invalid V3, invalid V5 | Invalid stored state remains explicit and fail-closed | Corrupt or unsupported storage becomes plausible defaults | published-configuration reader and configuration endpoint | Missing source and distinct malformed/invalid persisted variants | In-memory store and raw JSON fixtures | E0; source only | Same | Missing and each invalid class return distinct state/error codes; unsupported or malformed source is not accepted | UNKNOWN |
| PUB-READ-03 | Endpoint dispatch and ETag-read source assertions | Endpoint chooses validation from stored schema and reads with metadata | Legacy write path downgrades V5 or source read loses concurrency evidence | configuration endpoint and published reader | Endpoint source inspection | Read-only source assertions | E0; source only | Same | Requires schema dispatch, prohibits legacy downgrade, and requires metadata read | UNKNOWN |
| PUB-FLOW-01 | V3/V5 Buyer preparation retains stage identity and item ordering | The Buyer flow derives from normalized hierarchy consistently across supported schemas | Stage/item order diverges between V3 and V5 or display becomes a second authority | Buyer projection prepare() and normalized flow | Valid V3 and V5 configurations | Pure normalized fixtures | E0; source only | Same | V3/V5 stage IDs and flattened item order match | UNKNOWN |
| PUB-FLOW-02 | V5 hierarchy source has no flat items; display list derives from normalized flow | Hierarchy is the source of truth; flat stage items are a derived compatibility view | Mixed-source hierarchy or stale flat list changes the Buyer flow | Buyer display settings and flow | Valid V5 hierarchy | Pure V5 fixture | E0; source only | Same | Source stages omit items; derived display stages omit groups and equal the normalized flow flattening | UNKNOWN |
| PUB-DATA-01 | Viewer visibility and nominal dimensions in public-module projection | Public Viewer uses viewer-specific initial visibility and declared dimensions | Admin visibility leaks into Viewer or geometry is replaced by catalog defaults | Public module projection | Admin entities differ from viewerEntities; fractional nominal width | Pure V5 source fixture | E0; source only | Same | Public state carries viewerEntities and omits admin entities; dimensions preserve 800.5 mm | UNKNOWN |
| BUYER-DTO-02 | Buyer projection omits internal fields and consume() validates schema | Buyer wire DTO is allowlisted and the consumer rejects incompatible schema | Raw source, admin revision/pricing, or malformed payload reaches buyer code | Buyer projection project() and consume() | Valid V3/V5 payload, then unknown schema mutation | Pure V3/V5 fixture | E0; source only | Same | Raw source/revision/admin pricing are absent; unknown schema is rejected | UNKNOWN |
| BUYER-DTO-03 | Pricing and presentation policy are normalized for V3 and preserved for V5 | Buyer receives the contract-specific pricing and presentation policy | V5 settings are coerced to V3 defaults or unsupported policy data silently regenerates | Buyer projection prepare() and DTO | V3 legacy settings and V5 typed amount/policy | Pure fixture with typed amount adjustment | E0; source only | Same | V3 uses explicit legacy upgrade/default; V5 amount remains cents; invalid schema/policy is rejected | UNKNOWN |
| BUYER-DTO-04 | Buyer payload includes authored dimensions and round-trips through consume() | Allowed nominal dimensions and flow survive Buyer projection and consumption | DTO projection drops geometry or changes Buyer flow | Buyer DTO and consume() | Valid V5 with published module dimensions | Pure V5 fixture | E0; source only | Same | Dimensions are equal before/after consume; consumed flow equals projected flow | UNKNOWN |
| BUYER-DTO-05 | Invalid component or broken hierarchy is rejected | Projection requires supported render components and valid hierarchy references | Unknown renderer or broken hierarchy is repaired silently and shown as valid | Buyer projection prepare() | Unknown component and empty hierarchy membership | Mutated V5 fixture | E0; source only | Same | Both incompatible states throw; no static default regeneration is asserted | UNKNOWN |
| BUYER-DTO-06 | Local Buyer server fixture upgrades checked-in defaults to V5 before validation and projection | The local UI fixture serves only a validated V5-derived Buyer DTO | A V3 default is accepted directly as the fixture's stored document | Local Buyer fixture helper and server | V3 defaults upgraded to V5; malformed V5 rejected | In-memory fixture; loopback server | Candidate PR #409: unit 5/5 plus local-V5 browser gates PASS | Matching server/test paths | V5 validator and published reader must accept before projection; invalid V5 remains fail-closed | UNKNOWN |

## Candidate readback — PR #409

Candidate base: Product `development@d4226c8393c833b8ecc754464a5f9080fbfd75c6`; head `81e1f4b38a569cabb9e548f9a4ccf464b818bee1`.

- `tests/ci/local-buyer-config-fixture.mjs` upgrades checked-in V3 defaults to V5, validates the V5 document, passes it through the published reader, and only then projects the Buyer DTO. The local server serves that DTO on loopback.
- Focused Node test passed 5/5, including parity with the previous valid V5 projection and rejection of malformed V5.
- PR browser workflows passed: Flow layout run `45498110155` (including Buyer V3/V5 parity and visible invalid-V5 failure), Summary pricing `45498110465`, Stone `45498110395`, Keyboard `45498110433`, and Mobile `45498110493`. The test-impact plan run `45498110159` also passed.
- These are local fixture and browser results only. They do not prove hosted authorization, a real published Blob, production behavior, or any mask behavior. PR #409 remains a candidate until its `development` integration and post-merge readback.

## Reachability and remaining work

- The two test files are direct workflow steps and are included by the current path filters.
- These fixtures are pure/local evidence. They do not establish behavior in deployed routes, real Blob storage, Identity, or a browser.
- The test also contains checks beyond the grouped rows. The IDs identify contract-level groups, not a claim that every assertion line has a separate identifier.
- Continue with Header/navigation/keyboard, CSS/theme, assets, and localization after the critical published/configuration families are mapped.
- No runtime, Viewer behavior, mask content, or mask consumer is changed by this documentation.
