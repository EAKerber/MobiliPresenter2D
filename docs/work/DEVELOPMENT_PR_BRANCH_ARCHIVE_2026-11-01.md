# PR branch archive record — 2026-11-01

Repository: `EAKerber/MobiliPresenter2D`  
Authority: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`  
Method: retain each original commit as an exact `archive/m2d/*` tag before deleting its closed, unmerged branch. The protected development retirement workflow performs the tag creation, SHA-leased deletion, and remote readback. No PR is merged by this record.

## Previously archived closed PR heads

| PR | Branch@SHA | Branch | Original SHA | Archive tag | Closed |
|---:|---|---|---|---|---|
| #175 | `work/cp-public-01-donor-staging-20261008@c81d357df3aa78c3e8f804b6334b2da35b3a75c8` | `work/cp-public-01-donor-staging-20261008` | `c81d357df3aa78c3e8f804b6334b2da35b3a75c8` | `archive/m2d/cppublic-pr175-c81d357d` | 2026-10-28 |
| #178 | `work/cp-public-02a-public-module-projection-20261008@f0c792397036836105dcb53a45f89780e10b6348` | `work/cp-public-02a-public-module-projection-20261008` | `f0c792397036836105dcb53a45f89780e10b6348` | `archive/m2d/cppublic-pr178-f0c79239` | 2026-10-28 |
| #179 | `work/cp-public-02b-public-read-endpoint-20261008@44b1d6a94c06a17b73405755e03c787780e7a455` | `work/cp-public-02b-public-read-endpoint-20261008` | `44b1d6a94c06a17b73405755e03c787780e7a455` | `archive/m2d/cppublic-pr179-44b1d6a9` | 2026-10-29 |
| #180 | `work/cp-public-02c-integrated-preview-20261008@82d85674595280a7c878848d0d5f09df29492e92` | `work/cp-public-02c-integrated-preview-20261008` | `82d85674595280a7c878848d0d5f09df29492e92` | `archive/m2d/cppublic-pr180-82d85674` | 2026-10-29 |

## Closed PR heads in the current bounded retirement waves

These closed PR heads were read back as CLOSED/UNMERGED against base `main`, with the original HEADs listed below. Their original HEADs are retained by the exact `archive/m2d/*` tags shown. The bounded retirement manifest has been applied; see the final readback below.

| PR | Branch@SHA | Branch | Original SHA | Archive tag | Closed |
|---:|---|---|---|---|---|
| #34 | `feat/exposed-sides-and-glass@20040da835d6da66b03f73642c0c44db109dd6e8` | `feat/exposed-sides-and-glass` | `20040da835d6da66b03f73642c0c44db109dd6e8` | `archive/m2d/pr34-exposed-sides-glass-20040da8` | 2026-10-29 |
| #182 | `work/cp-public-03a1-configuration-read-guard-20261008@0b398618f7f2eff23da7f782d53d86ba3ee6411b` | `work/cp-public-03a1-configuration-read-guard-20261008` | `0b398618f7f2eff23da7f782d53d86ba3ee6411b` | `archive/m2d/cppublic-pr182-config-read-guard-0b398618` | 2026-10-29 |
| #184 | `work/cp-public-03a2-0-failclosed-bootstrap-20261008@d1305ffdd8302fa06b37d3676f08d802a92e7d97` | `work/cp-public-03a2-0-failclosed-bootstrap-20261008` | `d1305ffdd8302fa06b37d3676f08d802a92e7d97` | `archive/m2d/cppublic-pr184-failclosed-bootstrap-d1305ff` | 2026-10-29 |
| #185 | `work/cp-public-03a2-1-buyer-projection-20261008@7a0d919d4e27853c50cff8afde0cdcc066e0aa0c` | `work/cp-public-03a2-1-buyer-projection-20261008` | `7a0d919d4e27853c50cff8afde0cdcc066e0aa0c` | `archive/m2d/cppublic-pr185-buyer-projection-7a0d919d` | 2026-10-29 |
| #186 | `work/cp-public-03a2-2-email-access-core-20261008@40d4b65f9e7e16e0810c2308e9b947840371cbe7` | `work/cp-public-03a2-2-email-access-core-20261008` | `40d4b65f9e7e16e0810c2308e9b947840371cbe7` | `archive/m2d/cppublic-pr186-email-access-40d4b65f` | 2026-10-29 |
| #196 | `docs/cp-public-auth-boundary-20261011@43d5fb9c5c2749c0541b99d49ee1c048d6a9a96a` | `docs/cp-public-auth-boundary-20261011` | `43d5fb9c5c2749c0541b99d49ee1c048d6a9a96a` | `archive/m2d/cppublic-pr196-auth-boundary-43d5fb9c` | 2026-10-29 |
| #231 | `architecture/p-token-02b-contextual-copy-20261022@afb80965336083209eac93e2729de77170524ee5` | `architecture/p-token-02b-contextual-copy-20261022` | `afb80965336083209eac93e2729de77170524ee5` | `archive/m2d/p-token-02b-contextual-copy-afb80965` | 2026-10-29 |
| #238 | `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103` | `ci/ci-baseline-01-isolated-auth-extraction-20261024` | `3ccce161235df925c5b708bf6feefbe6f4b10103` | `archive/m2d/ci-baseline-01-isolated-auth-3ccce161` | 2026-11-01 |

## Final archival targets

- Archive record `ds02-original-images`: DS02 original-image source is pinned at `artifacts/ds02-imagens-originais-20261015@e9c405bfc0189baed8b4b679a1113c37b6ddbd21` and retained by `archive/m2d/ds02-imagens-originais-e9c405bf`. The source tree contains 40 image assets, 42 blobs total, and a manifest blob `e1ef704920e8be04091a4ff48815747176521255`.
- PR #238 was closed unmerged on 2026-11-01 and remains **HOLD** for code adoption because its preview gate was not revalidated against the exact head; the last authenticated gate reported a marker SHA mismatch. Its branch was retired by the protected wave AY, and the exact archive tag `archive/m2d/ci-baseline-01-isolated-auth-3ccce161` points to the original SHA `3ccce161235df925c5b708bf6feefbe6f4b10103`. No merge is implied.
- PR #231 is closed unmerged as superseded by the implementation already present in `main`; its exact head is retained by its archive tag above.
- `main` remains the strong authority and is not a target. No Production deploy or database schema change is included.

## Required readback

After every batch, record the protected workflow's audit and apply conclusions, exact tag-to-SHA readbacks, deleted branch refs, and remaining live branch list here before preparing another batch. Any failed or incomplete gate leaves the next wave on HOLD.


## Readback: retirement wave AX

Protected workflow [run #41342082827](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/41342082827) passed audit and apply. It archived and removed the exact #231 head `architecture/p-token-02b-contextual-copy-20261022@afb80965336083209eac93e2729de77170524ee5` at `archive/m2d/p-token-02b-contextual-copy-afb80965` and DS02 `artifacts/ds02-imagens-originais-20261015@e9c405bfc0189baed8b4b679a1113c37b6ddbd21` at `archive/m2d/ds02-imagens-originais-e9c405bf`. Remote refs were read back at both exact SHAs. The remaining live branches were `main`, `development`, and the pinned #238 branch; main stayed at `221b54b2a41ecc8c338d1bf2cf67280cf165ce95`.

## Retirement wave AY — readback

Protected workflow [run #41342383433](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/41342383433) passed both audit and apply. The closed, unmerged PR #238 branch `ci/ci-baseline-01-isolated-auth-extraction-20261024` was deleted with SHA lease after creating `archive/m2d/ci-baseline-01-isolated-auth-3ccce161`; the tag was read back at the exact original commit `3ccce161235df925c5b708bf6feefbe6f4b10103`. The final live branch list is exactly `main` and `development` (2 branches, within the five-branch limit). `main` remains `221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; `development` remains the active integration branch and contains `main` as its ancestor. No PR was merged, no deploy or database change occurred.
