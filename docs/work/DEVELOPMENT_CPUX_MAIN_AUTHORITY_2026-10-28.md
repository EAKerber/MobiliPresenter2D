# Bloco 25 — CP-UX histórico vs autoridade da main V5 (28/10/2026)

## Hierarquia de decisão

A `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` é autoridade forte para contrato estável. As quatro branches de 06–09/10 são fontes históricas; a `development` pode conter endurecimentos mais recentes já gated, mas não reativa implementação superada nem substitui a main automaticamente. As quatro fontes foram reconciliadas em **uma** auxiliar e 14 blobs Git históricos originais, sem reserialização (`docs/reconciliation/cpux-main-v5/manifest.json`).

| Origem | Evidência | Resultado |
| --- | --- | --- |
| `feat/cp-ux-04-hierarchy-layout@5d8347ed` (06/10) | flow layout/model, defaults e testes antigos; versões atuais diferem | **HOLD:** não inferir equivalência visual/teclado a partir da idade |
| `feat/cp-ux-05a-publication-prep@de035813` (06/10) | helper `netlify/lib/hierarchy-publication.mjs`, contrato preparatório V3/V4 e endpoint com POST | **Candidato a aposentar:** V5 nativo atual da main já substitui a migração prévia |
| `feat/cp-ux-05a-v4-publication-prep@ba22963a` (06/10) | ação HTTP antiga de migração/publicação V4 com POST; UI antiga | **Candidato a aposentar:** migração v5 já concluída e operativamente retirada |
| `work/cp-public-04a-main-flow-test-fixture-20261008@9503ad1c` (09/10) | modificação exclusiva de 31 linhas em fixture do browser (mutação de etapas flat) | **HOLD:** preservar até equivalência funcional em browser |

### O que deve prevalecer

- `main` em 26/10 usa `netlify/functions/configuration.mjs` com **somente GET/PUT**, `canManageAdministration` e `v5_migration_retired`; `app/core/v5-normal-save.js` exige V5 publicado, revisão e ETag, sem fallback V4.
- `development` mantém o mesmo contrato principal, porém **difere da main no próprio endpoint**: trata `getUser()` indisponível como HTTP 503 `identity_unavailable` e exige `canManageAdministration` antes de processar gravação. Essa melhoria posterior foi testada independentemente; registrá-la como exceção gated, não fingir equivalência de bytes com main. Nenhum endpoint modificado nesta rodada.
- No modelo hierárquico/layout/defaults/V5, os blobs atuais da `development` **são idênticos à main**, mas diferentes dos históricos CP-UX. Conservar intenção de layout avançado e PRs existentes, sem reverter a fonte estável.
- Candidatos sem PR aberta: somente os dois heads CP-UX-05A. Antes da retirada, criar tags de DAG completo `archive/m2d/legacy-cpux-05a-preparation-de035813` e `archive/m2d/legacy-cpux-05a-v4-ba22963a`, com refs/SHA originais. A auxiliar pode ser retirada como ancestral da development. Nenhuma branch protegida, PR, DB, site ou main é alvo.

### Gates

Verificar 14 blobs com SHA Git original, hashes dos seis contratos atuais na main e development (permitindo explicitamente a diferença do endpoint), rejeição de POST/migração nas duas versões e preservação de HOLD. Rodar suites isoladas de publicação V5, hierarquia, flow e endpoint público e `pages:check`. Sem Netlify Preview, credenciais, migração ou deploy. A antiga documentação da migração permanece arquivo histórico, **não instrução operacional vigente**.

## Gate no destino e manifesto S (condicional)

- [Gate da auxiliar #40691557818](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40691557818) **PASS**: 14 blobs originais conferidos, SHA da main e development, contrato de autorização/GET+PUT/rejeição de POST no endpoint atual, diferença de `identity_unavailable` documentada, suites de segurança V5/hierarquia/flow/endpoint e `pages:check`. FF com lease para `development@bfe8f099b8ea4410af15b8469a99a2f952a696e3`; [gate no destino #40691728848](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40691728848) **PASS**.
- Somente duas branches CP-UX-05A sem PR e sem proteção são alvos, com tags para preservar toda a DAG original: `archive/m2d/legacy-cpux-05a-preparation-de035813`, `archive/m2d/legacy-cpux-05a-v4-ba22963a`. Terceiro alvo é a auxiliar ancestral `integration/25-cpux-main-v5-supersession-20261028@bfe8f099b8ea4410af15b8469a99a2f952a696e3`. Os dois outros heads `ux04` e `fixture` continuam HOLD. Nenhum JS de runtime, Netlify, banco ou main foi modificado.
- O manifesto S é **one-shot**; a remoção só é comprovada após audit+apply e readback de tags/heads. Não antecipar conclusão.
