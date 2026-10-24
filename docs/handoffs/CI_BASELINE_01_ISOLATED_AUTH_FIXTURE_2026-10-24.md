# CI-BASELINE-01 isolated Config fixture — clean extraction

**Updated:** 2026-10-24  
**Status:** anonymous gate passed; authenticated integration is prepared for the existing internal test database.

## Scope

This branch starts from current main and carries the CI-BASELINE-01 anonymous readiness gate, the manually dispatched authenticated gate, the isolated-fixture safety checks, a least-privilege database migration and this handover.

It does not change Config, Admin, Access, Viewer or production Netlify functions/configuration. Existing browser workflows continue to use validated V5 data on loopback.

## Current evidence

- The issue diagnosis remains: unauthenticated /config/ redirects to /access/; that is expected access control, not proof of a Config bootstrap defect.
- The anonymous browser gate passed on this branch. It records final path/status, title, public script hashes, boolean workspace/debug flags and JavaScript error classes.
- The user confirmed the current Supabase project is an internal test database and authorized its use. No additional Supabase project will be created.
- Read-only inspection found 18 existing rows in each access table. The migration and fixture target only the grant created with a fresh UUID; cleanup is by that UUID, and the existing rows are preserved.
- The positive workflow remains manual only and is pinned to m2d-auth-ci-isolated.netlify.app plus project ref jaedzligsqazyjelpweu.
- The CI database role receives no direct table permissions. Two SECURITY DEFINER functions create a fixed five-minute Config grant and revoke that specific fixture grant/session.
- The database role has no password until set through Supabase Dashboard. Store the connection URI only in GitHub environment ci-auth-isolated as CI_STAGING_DATABASE_URL, and set CI_STAGING_SUPABASE_REF to the confirmed project ref.
- The Netlify site record exists. Recheck its published deploy serves the expected staging app before running the positive workflow.

## Required completion

Apply the reviewed migration to the existing internal test database. Configure the role password and GitHub environment values without sharing credentials in chat. Verify the dedicated Netlify deploy, then manually run the authenticated redeem/bootstrap/admin-denial/revoke gate. Keep issue #232 open until that gate and the five positive browser flows pass.
