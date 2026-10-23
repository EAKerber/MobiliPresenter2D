# CI-BASELINE-01 global access-boundary repair — preparatory branch

**Branch:** ci/ci-global-auth-boundary-repair-20261023. Based on the existing PR #235 fixture, **not main**. No preview creation or production merge. Patch intended for narrowly selected CI checks, not fixture publication.

## Failure classification from the existing PR #235
- Mobile, Keyboard, Flow, Summary and Stone: old GitHub Actions workflows open /config/ as anonymous and wait for .workspace. The auth gate redirects anonymous clients to /access/; these five failures do not test the logged-in flow. Actual protected Config was verified through [OIDC Actions 5/5 twice](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40039882104).
- Public routing: its browser job waits for private .workspace and the smoke expects Config to be public, a revoked interim contract. Updated to enforce Landing/Viewer public, Config workspace/debug/API private.
- Preview fixture: a blanket git diff denied any netlify change, including precisely the two preview-pinned OIDC files. Updated to fail on every unexpected netlify path, forbid private app modifications, and verify preview pin, deploy-preview context and config-only scope.
- Remains NOT solved: five old workflows need authenticated/local rearchitecture; do not skip them or claim green based on another branch's CI. PR #235 is an experimental fixture, Draft/HOLD.

## Isolated gate
The GitHub workflow ci-global-access-boundary-isolated.yml checks real existing preview Landing, Viewer, public projections, buyer denial, /access/, static contracts and frozen runtime boundaries on branch push. It installs Playwright in GitHub Actions; no Netlify Preview is created. Success here proves only the public route boundary.

## Next move
If isolated gate passes, selectively port the two workflow/test fixes to PR #235 with skip netlify, keeping Draft/HOLD. Build a separate authenticated/local replacement for the five historical workflows with explicit ownership and fail-closed controls; never mark an unexecuted test PASS.

## No-user-action policy
OIDC remains pinned to trusted workflow branch security/oidc-ci-preview235-v0-20261023, environment ci-auth-preview. No new token, password, invitation or email required. Ephemeral auth never grants Admin.
