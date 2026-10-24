# CI-BASELINE-01 isolated Config fixture — clean extraction

**Updated:** 2026-10-24  
**Status:** anonymous gate passed; authenticated integration is prepared for the existing internal test database.

## Scope

This branch starts from current main and carries the CI-BASELINE-01 anonymous readiness gate, the manually dispatched authenticated gate, the isolated-fixture safety checks, a least-privilege database migration and this handover.

It does not change Config, Admin, Access, Viewer or production Netlify functions/configuration. Existing browser workflows continue to use validated V5 data on loopback.

## Current evidence

- The issue diagnosis remains: unauthenticated /config/ redirects to /access/; that is expected access control, not proof of a Config bootstrap defect.
- The anonymous browser gate passed on commit f843007. It records final path/status, title, public script hashes, boolean workspace/debug flags and JavaScript error classes.
- The user confirmed the current Supabase project is an internal test database and authorized its use. No additional Supabase project will be created.
- An initial read-only snapshot found 18 rows in each access table. Later readback found additional historical GitHub Actions OIDC fixture rows. No rows from this branch's fixture identity exist, and this work did not insert, revoke or delete access records.
- The positive workflow remains manual only and is pinned to m2d-auth-ci-isolated.netlify.app plus project ref jaedzligsqazyjelpweu.
- Migration ci_config_fixture_role_20261024 is applied to the test database. The CI database role has LOGIN but no password, no elevated role attributes, no direct table permissions and execution access only to the two fixture functions. PUBLIC cannot execute them.
- The fixture functions create a fixed five-minute Config grant for the reserved fixture address and revoke only that grant and its sessions.
- Set the role password through Supabase Dashboard, then place the connection URI only in GitHub environment ci-auth-isolated as CI_STAGING_DATABASE_URL. Set CI_STAGING_SUPABASE_REF to the confirmed project ref.
- The Netlify site record exists, but its published deploy is still unverified. Confirm it serves the expected staging app before running the positive workflow.

## Required completion

Configure the role password and GitHub environment values without sharing credentials in chat. Verify the dedicated Netlify deploy, then manually run the authenticated redeem/bootstrap/admin-denial/revoke gate. Keep issue #232 open until the current gate and remaining legacy workflow reconciliation are complete.
