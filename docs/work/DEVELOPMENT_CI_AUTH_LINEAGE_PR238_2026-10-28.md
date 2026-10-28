# Bloco 33 — proveniência de segurança CI/auth, origem 23/10 versus PR #238

**Data:** 28/10/2026. **Natureza:** auditoria offline de *blobs, DAG e contratos de intenção*; não é smoke autenticado, autorização de fixture, merge, deploy ou aprovação de exclusão.

## Base e autoridades

- `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` é a autoridade estável; `development@1b1cd4f9d85b4169ade134c7074ff313188dc5c5` é somente candidata sob gates. Não rebaixar main por antiguidade de uma branch.
- [PR #238](https://github.com/EAKerber/MobiliPresenter2D/pull/238) **aberta**, head `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103`, base `main`; difere em **20 arquivos**. É divergente: 102 commits ahead, 137 behind da main, merge-base `5ccb2a8dde6dd16e136f03387dc833aab828c5cf`; não fazer merge integral. O `ci-auth-base-20261025@fd61a37a11dd63b3e537d3d76a2303bfdfc4f06a` é ancestral exato da PR, 22 commits atrás, não ancestral da main.
- A checagem de autenticação real no HEAD atual da PR [#40257905366](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40257905366) foi **FAIL** por marcador/commit do preview divergir, antes de validar credenciais. O deploy #238 referido no handover é da fonte `41dcc1424bdeea5782d977d2b0509c88f76fe156`, não do head `3ccce161...`. Não interpretar o texto antigo da PR com gates verdes como validação atual. **Não reconstruímos preview**, não usamos Supabase/Netlify/grants nesta rodada.
- O preflight puro `tests/ci/preview-identity-attestation.mjs@eca74f1c70a9e3bda616c9b568da6f8a8d768901` e nove negativos/sintéticos já existem na `development`. Reaproveitar sem duplicar credenciais ou bypass da identidade.

## Constatações exatas de proveniência

Seis arquivos de endpoint — `access-check.mjs`, `access-grants.mjs`, `access-redeem.mjs`, `access-session-logout.mjs`, `access-session-status.mjs` e `buyer-configuration.mjs` — têm **blobs iguais** em main, development e PR #238. Não há código novo dessas seis funções para transportar a partir das branches antigas. Em contraste, `netlify/functions/configuration.mjs` difere na development: `main/PR238@13c6997c7818189edfddcc529582941c7d2b5af5` versus `development@5189f7465bca2dec4ff1361e2ef9a3d82f822b36`; preservar a revisão e os gates da DTO de development, não substituí-la pela PR antiga.

A linhagem `ci/ci-baseline-01-isolated-session-fixture-20261023@cb0ae8b1e05bc9b5d96c51e2027732aff12577c3` traz `tests/ci/config-auth-isolation.mjs@97c014e91ce57fcac7aa696dbaf9b4a9caa4450d`, que **proíbe** o projeto de banco que julgava principal. A PR #238 traz a versão `b2aa8ae78736ce7df7f0d70d502389c25cc36056`, que passou a **permitir somente o projeto interno explicitamente confirmado**, mantendo role, site e host restritos. Esta diferença é mudança de intenção e autorização, não uma prova para copiar a política antiga nem para liberar novas credenciais. Não publicar referências de banco e não executar a fixture. O antigo browser positivo `35cdc24126...` difere da PR `b4cc427e9a...`; o teste isolado antigo `781a6627...` difere da PR `b82d0ea6...`.

O teste anônimo `tests/ci/config-auth-anonymous-browser.mjs@2e89a91db956...` permanece **idêntico** na linhagem histórica e na PR #238. Portanto esse único arquivo está preservado pelo HEAD da PR, mas isso **não** significa absorção integral da branch. `ci/ci-baseline-01-v5-local-diagnostics-20261023@5ce7327...` e `ci/ci-global-auth-boundary-repair-20261023@cacd0e9...` são outras fontes antigas com mistura de local/browser/preview, cuja conclusão auth continua HOLD.

## Classificação dos 20 arquivos da PR #238

- **Mudanças de runtime da interface:** `app/app.js`, `app/styles.css`, `tests/flow-layout-browser.cjs`, `tests/keyboard-browser.cjs` e workflow `stone-browser.yml`. A PR usa outra estratégia de navegação flex/grid e restauração de foco; não transplantar sem comparar com as suítes de navegação V5 mais recentes da main/development.
- **Site/configuração/DB com efeitos reais:** `netlify.toml`, `netlify/plugins/ci-v5-fixture/**`, `netlify/access/migrations/20261024120000_ci_config_fixture_role.sql`. O plugin oferece seed da fixture somente sob host/site/ref e contexto esperados, o SQL cria role com `SECURITY DEFINER`; verificações sintáticas não demonstram permissões efetivas ou revogação. Exigem revisão específica antes de integração.
- **Testes e comprovação isolados:** workflows `ci-baseline-01-anonymous.yml` e `ci-baseline-01-isolated-authenticated.yml`, scripts `config-auth-*`, `scripts/build-ci-preview-fixture.mjs` e testes de builder. Não duplicar os scripts antigos nem aceitar o teste local como substituto do deploy exato.

## Gate offline do bloco

`tests/test_development_ci_auth_lineage.py` confirma os pins de main/development/PR, seis endpoints compartilhados, divergência da função de configuração, evolução da policy antiga para a PR, contrato sintático da role e as vinte paths da PR. Também confirma que **nenhuma fonte app/Netlify foi alterada** na development por este bloco. A workflow dedicada roda esse gate e a suíte pura de identidade; **não roda nenhum workflow ou browser de autenticação legado, não faz fetch de preview, não grava banco, não constrói/deploya Netlify**.

**Disposição:** **HOLD sobre todas as origens auth/preview avaliadas e sobre a PR #238**. O bloco serve apenas para separar proveniência de intenção e apoiar futura revisão. Próximo passo seguro: revisar o SQL de grants/revogação e reconciliar o comportamento de navegação da PR com a main; só depois de identidade de deploy exato e gates relevantes considerar integração gradual. Sem exclusão de históricas até prova/arquivo completo e checagem de PRs.

## Verificação da auxiliar

O [gate de proveniência #40742256134](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40742256134) concluiu **PASS** no commit `440f76670c7ba0fd59194dd2e45f8c46a1c48f91`, incluindo os testes de DAG/blobs/escopo e os nove negativos de identidade do preview. Trata-se de inspeção offline, não validação de grants ou deploy. Nenhuma fonte antiga de autenticação foi executada ou aposentada. A família original e a PR #238 permanecem HOLD.

## Candidata de aposentadoria preservada — DAG antiga de auth-base

A fonte `ci-auth-base-20261025@fd61a37a11dd63b3e537d3d76a2303bfdfc4f06a` é **ancestral estrita** do HEAD aberto da [PR #238](https://github.com/EAKerber/MobiliPresenter2D/pull/238): `git merge-base = fd61a37a11dd63b3e537d3d76a2303bfdfc4f06a`, PR está 22 commits ahead e zero behind, conforme comparação GitHub em 28/10/2026. O HEAD antigo é recuperável pela história da PR; a poda é segura **somente** depois de se criar e verificar a tag de preservação integral `archive/m2d/ci-auth-base-pr238-fd61a37a`, apontando diretamente para esse SHA. Não apagar commits nem PR, não depender só da retenção futura da PR e não confundir com incorporação na main/development.

**Classificação:** `ARCHIVE_DAG_ANCESTOR_OF_OPEN_PR238` (preservação, não promoção). Gatilho semântico offline: [development #40742370534](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40742370534) PASS em `555ba8a67a643b876dcb5f8c46a1c48f91`, com pins de SHA, ancestry e 20 paths da PR, além de preflight sintético; esse gate **não aprova grants nem preview autenticado**.

Higiene planejada de lote exato `dev-20261028-ci-auth-base-archive-aa`: apenas `ci-auth-base-20261025@fd61a37a11dd63b3e537d3d76a2303bfdfc4f06a` após tag integral e a auxiliar ancestral `integration/33-ci-auth-pr238-lineage-20261028@555ba8a67a643b876dcb5f8a9130ed1f787810dc`. Executor bounded deve passar AUDIT+APPLY, SHA lease, regras/PRs, readback e integridade dos arquivos. Antes disso, não declarar ref removida.

**Permanecem HOLD:** PR #238 e as outras branches de CI/auth/preview, incluindo `ci/ci-baseline-01-v5-local-diagnostics-20261023`, `ci/ci-baseline-01-isolated-session-fixture-20261023`, `security/oidc-ci-preview235-v0-20261023`. A autorização de banco/fixture não se propaga por ancestralidade Git.
