# R5 — Reconciliação de branches divergentes (26/10/2026)

**Estado:** inventário e destinações condicionais; **nenhuma branch divergente autorizada para exclusão**.  
**Base observada:** MobiliPresenter2D `main@18a1f316010468b9ab507918ce2aee072896149d`; Design System `main@6b5bc4c889cf441e71305b4dfe76692fe9d66ba1`.  
**Fonte canônica de segurança:** [R1](r1-branch-hygiene.md). Este documento registra somente relações e pendências; não constitui manifesto de exclusão. Não alterar `ops/branch-hygiene-batch.json` com base nele sem nova validação e aprovação de lote.

## Semântica dos resultados

- **Ancestral direto (branch A → branch B)**: `compare A...B` respondeu `behind=0`. Os commits de A estão dentro da história de B, **mas B ainda pode não estar na main**.
- **Divergentes**: commits independentes existem em ambas as branches. Não inferir que o conteúdo está ausente/integrado a partir dessa informação: squash, cherry-pick e reescrita de arquivo geram ambiguidades.
- **Supersedida por PR**: afirmação expressa na descrição da PR fechada, a ser corroborada por equivalência de comportamento/arquivos antes de qualquer exclusão.
- **Arquivos exclusivos ou modificados**: hashes Git Blob distintos ou arquivo inexistente na main. Isso não prova que o recurso foi perdido, mas **bloqueia limpeza sem análise funcional**.

## CI-BASELINE-01, autenticação, fixture, Config — mantenha até integração

| Branch ou conjunto | Evidência observada | Destinação R5 |
| --- | --- | --- |
| `ci/ci-baseline-01-isolated-auth-extraction-20261024` | PR [#238](https://github.com/EAKerber/MobiliPresenter2D/pull/238) **aberta**, não integrada, validada em CI/preview isolado | **ATIVA — preservar** |
| `ci-auth-base-20261025` | Ancestral direto da head #238: `0 behind / 22 ahead` na comparação para #238 | **DEPENDÊNCIA HISTÓRICA — reavaliar após merge #238** |
| `fix/config-stage-nav-grid-track-20261025` | PR [#245](https://github.com/EAKerber/MobiliPresenter2D/pull/245) encerrada como incorporada à #238; comparação com #238: `0 behind / 4 ahead` | **INCORPORADA NA BRANCH ATIVA — não em main** |
| `ci/ci-baseline-01-auth235-only-20261023`, `ci/ci-baseline-01-isolated-session-fixture-20261023`, `ci/ci-baseline-01-nav-sequence-probe-20261023`, `ci/ci-baseline-01-published-preview-fixture-20261023`, `ci/ci-baseline-01-shared-db-preview-20261023`, `ci/ci-baseline-01-v5-local-diagnostics-20261023`, `ci/ci-global-auth-boundary-repair-20261023`, `security/oidc-ci-preview235-v0-20261023` | Todas divergem do head #238; `behind` vai de 15 a 62 na comparação entre ramo antigo e #238. Há divergências reais, mesmo quando há comportamento substituído | **RECONCILIAR DIFERENÇAS ÚNICAS**, não excluir por prefixo/idade |

**Gate CI-R5:** integrar ou encerrar com justificativa a #238, validar autenticação de menor privilégio, contrato, revogação, gates de navegador e referências de workflows/fixtures; então comparar as antigas alternativas por arquivos, testes, permissões e evidências. As duas ancestrais da #238 só poderão entrar em lote após a integração ou outra preservação material equivalente. Issue [#232](https://github.com/EAKerber/MobiliPresenter2D/issues/232) continua a referência de fechamento funcional.

## VIS-002C / tokens / foco e fallback

| Branch ou PR | Evidência | Destinação R5 |
| --- | --- | --- |
| DS `feat/vis002-role-split-v03-20261024` | PR DS [#52](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/52) aberta; autoridade do artefato contextual v0.3 | **ATIVA — preservar até decisão de integração** |
| Produto `a11y/vis002-measured-copy-contrast-20261024` | PR [#241](https://github.com/EAKerber/MobiliPresenter2D/pull/241) Draft; v0.3, foco About e fallback compartilhado, nova inspeção visual ainda pendente | **ATIVA — preservar** |
| `fix/focus-ring-about-approved-vis002-20261024` | PR [#239](https://github.com/EAKerber/MobiliPresenter2D/pull/239) explicitamente supersedida; comparação para #241: **0 behind / 30 ahead** | **INCORPORADA NA BRANCH #241 — condicional ao fechamento #241** |
| `a11y/image-failure-scalable-placeholder-20261025` | PR [#246](https://github.com/EAKerber/MobiliPresenter2D/pull/246) fechada como supersedida; **não** é ancestral de #241 (38 ahead / 9 behind) | **EQUIVALÊNCIA DECLARADA, NÃO PROVADA — preservar até diff funcional** |
| `integration/vis002c-contextual-support-v02-20261024` | PR [#240](https://github.com/EAKerber/MobiliPresenter2D/pull/240) fechada como substituída por v0.3 #241; diverge (38 ahead / 2 behind) | **EQUIVALÊNCIA DECLARADA, NÃO PROVADA — preservar** |
| `architecture/p-token-02b-contextual-copy-20261022` | PR [#231](https://github.com/EAKerber/MobiliPresenter2D/pull/231) **aberta Draft**, variante anterior/infrastrutura de pin; diverge da #241 | **HOLD** até extrair pin/contratos exclusivos e decidir convivência v0.2/v0.3 |
| DS `architecture/p-token-01-executable-palette-20261022` e `architecture/p-token-02b-contextual-copy-20261022` | PRs DS #49/#50 integradas; branches antigas ainda divergem da DS #52 (9 e 5 commits exclusivos, respectivamente) | **HISTÓRICO DIVERGENTE — requer revisão de arquivo/evidências** |

**Gate VIS-R5:** DS #52 e produto #241 devem ser reconciliadas em ordem; validar proveniência de tokens e inspeção visual antes de release. Só então decidir PR #231 e branches antigas. Não promover cor para papel global não homologado. Distinguir evidência de commit, equivalência de seletor/estilo e incorporação efetiva na main.

## Família CP-PUBLIC — dependências e arquivos não absorvidos comprovadamente

| Relação | Evidência Git/PR | Destinação |
| --- | --- | --- |
| `work/cp-public-02b-public-read-endpoint-20261008` → `work/cp-public-02c-integrated-preview-20261008` | **Ancestral direto** `0 behind / 24 ahead`; PR [#180](https://github.com/EAKerber/MobiliPresenter2D/pull/180) integra contexto de #175/#178/#179 | **Preservar até decisão da #180 e das dependências** |
| `work/cp-public-03a2-0-failclosed-bootstrap-20261008` → `work/cp-public-03a2-3-contract-integration-20261008` | **Ancestral direto** `0 behind / 9 ahead` | **Preservar**; ramo sucessor não está na main |
| `work/cp-public-03a2-1-buyer-projection-20261008` → `work/cp-public-03a2-2-email-access-core-20261008` | **Ancestral direto** `0 behind / 27 ahead`; PR [#186](https://github.com/EAKerber/MobiliPresenter2D/pull/186) declara dependências #182/#184/#185 | **Preservar até decisão conjunta**, jamais merge isolado da #186 |
| `work/cp-public-02a-public-module-projection-20261008` ↔ `work/cp-public-02b-public-read-endpoint-20261008` | **Divergentes** `10 ahead / 4 behind` ao comparar #178→#179 | **Não pressupor** incorporação integral entre elas |
| `work/cp-public-01-donor-staging-20261008` ↔ `work/cp-public-02c-integrated-preview-20261008` | **Divergentes** `55 ahead / 31 behind` | **Não pressupor** absorção de todos os assets/UX |
| `work/cp-public-03a2-1-buyer-projection-20261008`, `...03a2-2-email-access-core...`, `...03a2-0-failclosed-bootstrap...` | Arquivos próprios `app/core/buyer-configuration-projection.js`, `app/access/redeem.js`, `app/core/authorized-bootstrap.js` encontrados nas branches, **ausentes por esses caminhos na main** | **RISCO DE CONTEÚDO ÚNICO**; verificar substitutos, políticas e garantias antes de qualquer descarte |
| `work/cp-public-02a...`, `...02b...`, `...02c...` | `app/core/public-module-projection.js` possui blob diferente da main; `netlify/functions/public-modules.mjs` da #179 possui blob diferente da main | **Comparar contratos e testes**, não usar coincidência de nome como equivalência |
| PRs #175, #178–#186 | Muitas ainda abertas em Draft/HOLD desde 08/10/2026, com declarações explícitas de pré-requisitos | **REVISÃO EM CONJUNTO**; não encerrar/mesclar sem reconciliar as fronteiras de segurança |

**Gate CP-R5:** reconstruir o grafo de dependências real contra os contratos atuais de autenticação, publicação e DTO V5; inventariar funções/arquivos substitutos e testes equivalentes; para cada branch marcar `absorvida`, `extrair patch`, `manter`, `suspender` ou `descartar com recibo`. Não reativar fluxo de login inseguro nem abrir dados privados para destravar testes.

## Design System: risco especial do handover

A branch `docs/current-handover-20261024` (PR DS [#51](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/51)) estava **814 commits à frente** da main anterior, com 236 caminhos alterados (228 sob `evidence/`). Não tratar esse volume como duplicação descartável: verificar grain, origem e mudança semântica antes de qualquer incorporação. É uma branch de evidências e arquitetura, não uma candidata de limpeza automática.

## Próxima sequência — R6

1. **CI:** fechar as pendências da PR #238/issue #232 e registrar diferenças únicas das tentativas antigas; preservar os ancestrais enquanto #238 não estiver na main.
2. **VIS:** vincular a integração DS #52 à inspeção visual do produto #241; só depois decidir a antiga PR #231.
3. **CP:** produzir matriz `arquivo/símbolo original → substituto atual ou pendência` começando por `authorized-bootstrap.js`, `buyer-configuration-projection.js`, `access/redeem.js`, `public-module-projection.js` e `public-modules.mjs`.
4. **Higiene operacional:** manter somente lotes explícitos de 1–3 refs comprovadas e reobservadas; ramo `architecture/arc03c-static-page-build-20261022` continua HOLD por referência em workflow e restrição à edição do gatilho; não contornar o bloqueio.

**Saldo R5:** classificação melhorada; **0 refs excluídas, 0 PRs de implementação integradas, 0 mudanças no runtime**. A redução numérica não é gate de conclusão.