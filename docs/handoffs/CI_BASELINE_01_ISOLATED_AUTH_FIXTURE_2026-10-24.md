# CI-BASELINE-01 isolated Config fixture — clean extraction

**Updated:** 2026-10-24  
**Status:** repository gate extracted to a clean branch from main; staging authentication remains unverified.

## Scope

This branch is based on the current main after P-COMP-01/ARC-03C integration. It carries only the CI-BASELINE-01 anonymous readiness gate, the manually dispatched authenticated gate, the isolated-fixture safety checks and this handover.

It does not change Config, Admin, Access, Viewer, Netlify functions/configuration, production data or credentials. The established local V5 browser workflows and public /config/ redirect checks remain in main.

## Current evidence

- The original issue diagnosis remains: unauthenticated /config/ redirects to /access/; that is expected access control, not proof of a Config bootstrap defect.
- Existing browser interaction workflows now exercise validated V5 data on loopback. They do not claim an authenticated production or preview session.
- The read-only anonymous browser gate records only final path/status, title, public script hashes, boolean workspace/debug flags and JavaScript error classes.
- The positive workflow is manual only. It requires the dedicated host m2d-auth-ci-isolated.netlify.app, the ci-auth-isolated GitHub environment, Supabase project ref and the least-privileged access_ci_fixture connection.
- The gate rejects the existing database ref jaedzligsqazyjelpweu, production hosts, ordinary Deploy Previews and privileged database roles. It creates a five-minute fixture grant, uses the real redeem route, verifies bootstrap and admin denial, then revokes the session and grant.

## Deferred infrastructure

No second Supabase project was created, and this branch does not try to run the positive workflow. The organization is Casa em Módulos; the quoted project cost was US$0/month. Project provisioning is deferred. The existing Supabase project is prohibited for this fixture.

The previously recorded Netlify staging site and any GitHub environment settings must be rechecked before use. Do not alter production or reuse production secrets. Once isolated infrastructure is explicitly provisioned and configured, run the manual gate and then repeat Mobile, Keyboard, Flow, Summary/Pricing and Stone under the authorized staging session.

## Exit criteria for issue #232

Keep the issue open until the anonymous gate passes, the isolated site/database/role are verified, the authenticated redeem/bootstrap/revoke gate passes, and all five positive browser flows pass without removing assertions or weakening access control.
