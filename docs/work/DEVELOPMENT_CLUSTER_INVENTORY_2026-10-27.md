# Inventário de integração por proximidade — MobiliPresenter2D

**Data:** 27/10/2026. **Base auditada:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`.

**Estado pré-trabalho:** 61 refs (`main` + 60), 12 PRs abertas, última execução observada de Branch hygiene na main PASS. `development` e `integration/00-inventory-governance-20261027` foram criadas do mesmo SHA base, sem integrar código legado. O deploy publicado em Netlify era READY no exato SHA da main. Não equivale a comprovar status de branch deploys futuros.

## Resultado quantitativo

- 60 branches históricas indexadas por SHA; 56 têm commits fora da main; 4 são ancestrais da main; 1 diffs possivelmente truncados pelo limite da API (requerem checkout completo).
- 12 PRs abertas — nenhuma será fechada automaticamente.
- As cinco matrizes brutas estão em [`inventory-evidence-20261027/`](inventory-evidence-20261027/). Índice estruturado: [`DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json`](DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json).

## Blocos de proximidade (heurística por nomes + arquivos, não por semântica comprovada)

| Bloco | Branches | PRs abertas | Ancestrais da main | Tocam superfície sensível¹ |
|---|---:|---:|---:|---:|
| Operações e branches ancestrais (`00-ops`) | 2 | 0 | 2 | 0 |
| CI, autenticação e fixtures de diagnóstico (`01-ci-auth`) | 15 | 1 | 0 | 12 |
| Acesso privado, sessão e DTO do comprador (`02-access-dto`) | 8 | 5 | 0 | 7 |
| Landing, viewer público e projeção de módulos (`03-public-pages`) | 6 | 4 | 0 | 2 |
| Design System, tokens, contraste e acessibilidade (`04-tokens-a11y`) | 10 | 1 | 1 | 0 |
| Páginas, headers e navegação (`05-navigation`) | 7 | 0 | 1 | 1 |
| Configurador, administração, preços e viewer (`06-config-viewer`) | 9 | 0 | 0 | 6 |
| Renderização, laterais e recursos gráficos (`07-scene-assets`) | 2 | 1 | 0 | 1 |
| Documentação histórica e decisões auxiliares (`08-documentation`) | 1 | 0 | 0 | 0 |

¹ Detecção baseada em nomes de caminhos; não substitui auditoria de segurança.

## Método e destino recomendado

**`main`** continua o único ramo estável. **`development`** receberá integrações validadas porém não prontas para produção, sem promoção automática à main. Auxiliares serão criadas sob demanda a partir do HEAD atualizado de `development`, não uma por branch antiga; depois de absorvidas, reconciliadas e comprovadamente recuperáveis, serão fechadas/removidas.

**A primeira auxiliar é estritamente documental:** `integration/00-inventory-governance-20261027`. Ela registra diffs de 60 refs sem alterar código de execução, rotas, segurança, preço, schema ou Netlify.

Sequência proposta: (1) isolar os testes úteis de CI/autenticação e reconciliar PR #238; (2) páginas/headers/tokens acessíveis, com pin de DS; (3) projeção pública e DTO/acesso D03; (4) configurador/viewer; (5) renderização/assets; (6) arquivo histórico/poda. A ordem muda se gates revelarem dependência real.

### Regras para incorporar um bloco

- Pin de cada origem por SHA, mapa de conflitos por caminhos e diff semântico. Documentar `origem/commit/arquivo → destino/commit/teste`.
- `D01=A`: integração incremental após gates. `D02=B`: teste isolado pode passar primeiro, mas não autoriza alegar login real ou segurança de produção. `D03=A`: extrair e reconciliar antes de fechar PRs. `D04=A`: preservar e comparar proveniência antes de consolidar.
- Testes de autorização e fail-closed para `netlify/access`, API V5, sessão e grants; testes funcionais/visuais reais quando a mudança justificar; não restaurar etapas hardcoded antigas.
- Nenhum branch histórico com PR aberta será apagado sem encerramento justificado. Não tratar `ahead > 0` como comprovadamente novo; verificar conteúdo funcional.
- Branch auxiliar consolidada em `development` somente após auditoria e readback de SHA. O produto não deve fazer deploy da development automaticamente. Verificar regras Netlify de Branch Deploy/Deploy Preview antes de abrir PRs de código; evite previews redundantes para economizar banda.
- Como o produto não tem rulesets GitHub configuradas na API, não assumir que main/development têm proteção efetiva. Antes de poda divergente, criar tags histórico-DAG protegidas ou prova de retenção equivalente, tal como concluído no repositório de Design System.
- Os manifests existentes de branch hygiene são de outro ciclo; **não reexecutar**. Planejar novas ondas com hashes e readbacks independentes.

## Matriz dos blocos

### Operações e branches ancestrais

Só refs já ancestrais são candidatas iniciais a higiene; não apagar antes do readback de HEAD e vínculos de workflow/PR.

- `maintenance/branch-retirement-r10-squash-20261026` — `74562dd8a26b`; behind, +0/−2, 0 caminhos, ANCESTOR_CANDIDATE.
- `maintenance/branch-retirement-r9-operational-20261026` — `535a2edf9d7b`; behind, +0/−5, 0 caminhos, ANCESTOR_CANDIDATE.

### CI, autenticação e fixtures de diagnóstico

PR #238 não foi integrada; fixtures isoladas e preview antigo não comprovam segurança real. Preservar 401/403/503, permissões mínimas, não vazamento e gates WebKit 1050/1051.

- `ci-auth-base-20261025` — `fd61a37a11dd`; diverged, +80/−137, 17 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-auth235-only-20261023` — `17dac20ecef8`; diverged, +37/−147, 71 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-config-readiness-20261022` — `dcfec5b7666b`; diverged, +2/−158, 2 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-isolated-auth-extraction-20261024` — `3ccce161235d`; diverged, +102/−137, 20 caminhos, OPEN_PR_HOLD, PR #238.
- `ci/ci-baseline-01-isolated-session-fixture-20261023` — `cb0ae8b1e05b`; diverged, +15/−147, 48 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-nav-sequence-probe-20261023` — `b9be8bfdac10`; diverged, +54/−147, 69 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-public-projection-test-20261022` — `387da6a57c41`; diverged, +3/−158, 2 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-published-preview-fixture-20261023` — `60773a62cd6d`; diverged, +37/−147, 84 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-shared-db-preview-20261023` — `1e164dc55cc1`; diverged, +23/−147, 61 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-baseline-01-v5-local-diagnostics-20261023` — `5ce7327a9e4c`; diverged, +30/−147, 62 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `ci/ci-global-auth-boundary-repair-20261023` — `cacd0e916043`; diverged, +49/−147, 85 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `fix/ci-baseline-v5-nav-flow-clean-20261023` — `62c5521d7e88`; diverged, +8/−154, 11 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `fix/config-stage-nav-grid-track-20261025` — `dbfbd9a7bca0`; diverged, +98/−137, 20 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `security/oidc-ci-preview235-v0-20261023` — `833f36a52456`; diverged, +62/−147, 79 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `tooling/migration-inspector-v0-20261023` — `2b00351acc1d`; diverged, +7/−154, 4 caminhos, DIVERGED_NEEDS_RECONCILIATION.

### Acesso privado, sessão e DTO do comprador

D03=A: não reutilizar endpoints de concessão de acesso, migrations antigas ou DTO legado sem mapeamento de contrato V5 e testes de segurança.

- `docs/cp-public-auth-boundary-20261011` — `43d5fb9c5c27`; diverged, +16/−221, 3 caminhos, OPEN_PR_HOLD, PR #196.
- `work/cp-public-03a-security-and-hygiene-inventory-20261008` — `67089791497b`; diverged, +4/−238, 5 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `work/cp-public-03a1-configuration-read-guard-20261008` — `0b398618f7f2`; diverged, +23/−238, 17 caminhos, OPEN_PR_HOLD, PR #182.
- `work/cp-public-03a2-0-failclosed-bootstrap-20261008` — `d1305ffdd830`; diverged, +32/−238, 24 caminhos, OPEN_PR_HOLD, PR #184.
- `work/cp-public-03a2-1-buyer-projection-20261008` — `7a0d919d4e27`; diverged, +15/−238, 12 caminhos, OPEN_PR_HOLD, PR #185.
- `work/cp-public-03a2-2-email-access-core-20261008` — `40d4b65f9e7e`; diverged, +42/−238, 29 caminhos, OPEN_PR_HOLD, PR #186.
- `work/cp-public-03a2-3-contract-integration-20261008` — `68362325972a`; diverged, +41/−238, 80 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `work/cp-public-03a2-buyer-session-and-bootstrap-plan-20261008` — `8e2124bfd299`; diverged, +3/−238, 5 caminhos, DIVERGED_NEEDS_RECONCILIATION.

### Landing, viewer público e projeção de módulos

Projeção pública só expõe campos permitidos; preservar rotas atuais e não reviver modelos estáticos/dados brutos.

- `experiment/public-landing-commercial-viewer` — `0e28f7ec8ac0`; diverged, +1/−478, 42 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `work/cp-public-01-donor-staging-20261008` — `c81d357df3aa`; diverged, +31/−246, 45 caminhos, OPEN_PR_HOLD, PR #175.
- `work/cp-public-02a-public-module-projection-20261008` — `f0c792397036`; diverged, +17/−238, 4 caminhos, OPEN_PR_HOLD, PR #178.
- `work/cp-public-02b-public-read-endpoint-20261008` — `44b1d6a94c06`; diverged, +23/−238, 8 caminhos, OPEN_PR_HOLD, PR #179.
- `work/cp-public-02c-integrated-preview-20261008` — `82d856745952`; diverged, +47/−238, 62 caminhos, OPEN_PR_HOLD, PR #180.
- `work/cp-public-04a-main-flow-test-fixture-20261008` — `9503ad1caff4`; diverged, +1/−237, 1 caminhos, DIVERGED_NEEDS_RECONCILIATION.

### Design System, tokens, contraste e acessibilidade

Decisões homologadas no Design System são imutáveis sem novo consentimento; pinar paleta, contrastes/temas e verificação visual.

- `a11y/image-failure-scalable-placeholder-20261025` — `6840d8986e44`; diverged, +9/−137, 5 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `architecture/p-token-01b-reference-pin-20261022` — `854cc0589652`; diverged, +12/−158, 10 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `architecture/p-token-02b-contextual-copy-20261022` — `afb809653360`; diverged, +24/−158, 22 caminhos, OPEN_PR_HOLD, PR #231.
- `audit/public-text-contrast-coverage-20261022` — `ace851004713`; diverged, +8/−154, 6 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `docs/ds05a-theme-lab-20261017` — `6120a294e0de`; diverged, +2/−199, 20 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `fix/focus-ring-about-approved-vis002-20261024` — `e7b02c04308e`; behind, +0/−129, 0 caminhos, ANCESTOR_CANDIDATE.
- `fix/vis002c-public-text-contrast-20261022` — `007fc8e0ca8d`; diverged, +3/−154, 8 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `integration/consolidated-arc03c-vis002c-token-20261023` — `c239012c126c`; diverged, +5/−147, 41 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `integration/vis002c-contextual-support-v02-20261024` — `a285a2dc6f54`; diverged, +2/−137, 32 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `integration/vis002c-p-token-02b-v2-20261023` — `34a305c1ddb9`; diverged, +29/−158, 33 caminhos, DIVERGED_NEEDS_RECONCILIATION.

### Páginas, headers e navegação

Distinguir NAV-004 header primário de NAV-005 Viewer; evitar duas fontes de verdade para HTML compilado.

- `architecture/arc03-primary-header-fragment-prototype-20261022` — `e459b9bd85c4`; diverged, +13/−157, 12 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `architecture/arc03c-static-page-build-20261022` — `fbd00a9628c8`; behind, +0/−144, 0 caminhos, ANCESTOR_CANDIDATE.
- `architecture/p-comp-01-public-menu-20261021` — `4ba9384733a8`; diverged, +14/−158, 9 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `experiment/shared-public-header-controller-20261020` — `fdeb931af285`; diverged, +10/−184, 8 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `experiment/ui-declarative-landing-benefits-20261020` — `176cd0931056`; diverged, +22/−184, 10 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `fix/how-it-works-accordion-grid-20261021` — `6260df944b6b`; diverged, +9/−184, 3 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `fix/mobile-menu-scene-stacking-20261019` — `b81308a22c2a`; diverged, +1/−187, 1 caminhos, DIVERGED_NEEDS_RECONCILIATION.

### Configurador, administração, preços e viewer

Schema data-driven V5 e publicação de módulos, preços/medidas devem permanecer controlados por Administração.

- `experiment/viewer-overview-editorial-20261021` — `8ad1405f176e`; diverged, +7/−184, 4 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `feat/cp-sd-06a1-server-v5-read-migration-support` — `ee4ffe153ffa`; diverged, +16/−482, 13 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `feat/cp-ux-04-hierarchy-layout` — `5d8347edb6ea`; diverged, +53/−698, 25 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `feat/cp-ux-05a-publication-prep` — `de0358134963`; diverged, +12/−694, 7 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `feat/cp-ux-05a-publication-prep-v2` — `1872ca2a7958`; diverged, +1/−692, 1 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `feat/cp-ux-05a-v4-publication-prep` — `ba22963ad304`; diverged, +7/−696, 7 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `feature/viewer-base-prices-global-off-20261021` — `82e4d09a842d`; diverged, +7/−167, 17 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `fix/auth-first-login-session-reconciliation-20261021` — `70ed9ce49694`; diverged, +7/−184, 5 caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `fix/viewer-secondary-header-nav005-20261021` — `10445ad8c20a`; diverged, +9/−184, 5 caminhos, DIVERGED_NEEDS_RECONCILIATION.

### Renderização, laterais e recursos gráficos

PR #34 continua decisão de produto: validar máscaras, custo de arquivos, renderização e fidelidade antes de incorporar.

- `artifacts/ds02-imagens-originais-20261015` — `e9c405bfc018`; diverged, +1/−200, 300+ [LIMITE API] caminhos, DIVERGED_NEEDS_RECONCILIATION.
- `feat/exposed-sides-and-glass` — `20040da835d6`; diverged, +9/−795, 66 caminhos, OPEN_PR_HOLD, PR #34.

### Documentação histórica e decisões auxiliares

Não substituir handover vigente por rastros antigos; copiar somente documentos comprovadamente úteis com SHA.

- `docs/handover-reconcile-20261023` — `d6c238946526`; diverged, +6/−154, 1 caminhos, DIVERGED_NEEDS_RECONCILIATION.

## Limitações e próximos gates

GitHub Compare pode limitar arquivos a 300; contagens de caminhos e prefixos não equivalem a equivalência funcional. O inventário não adotou decisões de descarte, não transferiu automaticamente código e não alterou produção. Exigir revisão manual para diferenças críticas e condicionais/leases para futuras deleções.
