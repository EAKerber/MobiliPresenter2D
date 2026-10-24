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


## Verificação após deploy e reconciliação dos workflows — 24/10/2026

- Deploy isolado atual: `m2d-auth-ci-isolated`, deploy `6adc77b6603e52a336fe045d`, state `ready`, commit `5ccb2a8dde6dd16e136f03387dc833aab828c5cf`. O deploy publica as funções `access-check`, `access-redeem`, `access-session-status`, `access-session-logout`, `buyer-configuration` e `admin-bootstrap`.
- Gate anônimo: [Actions #40075575907](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40075575907) passou no head `a9129e11afeae6e92fa8a9dda88f44e01c385c8a).
- Gate autenticado real: [Actions #40075575871](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40075575871), tentativa 4, passou contra o site dedicado e o projeto Supabase de teste confirmado. Resgate, bootstrap do Config, negação de Admin e revogação foram confirmados; logs não contêm URI nem segredo.
- Reconciliação funcional legado: os cinco workflows existentes foram executados com sucesso no commit-base `5ccb2a8dde6dd16e136f03387dc833aab828c5cf`, cada um usando a fixture V5 validada em loopback (não o Deploy Preview protegido): [Mobile #40057347194](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40057347194), [Keyboard #40057347179](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40057347179), [Flow #40057347220](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40057347220), [Summary/Pricing #40057347150](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40057347150), [Stone #40057347138](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40057347138). Todos os cinco jobs concluíram SUCCESS.
- **Limite da evidência:** os cinco fluxos de interação estão validados na fixture local; o gate autenticado real verifica sessão/bootstrap e controle de Admin, não repete as cinco suítes no staging. Manter essa separação explícita. Não declarar teste de interação autenticado em Deploy Preview.
- Issue `#232` continua aberta até revisão e integração do PR; PR `#238` permanece draft. Nenhum merge foi feito.
