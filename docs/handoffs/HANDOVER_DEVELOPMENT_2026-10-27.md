# Handover corrente — estratégia de desenvolvimento por blocos (27/10/2026)

## Objetivo homologado no chat

O produto `EAKerber/MobiliPresenter2D` deve convergir preferencialmente a **duas branches permanentes**, `main` (estável/publicada) e `development` (integração não estável), usando `integration/<bloco>` auxiliares de vida curta para trabalho próximo e rebaselined em `development`. Não mesclar 60 branches indiscriminadamente na main.

## Identidade das evidências

- main observada no início: `221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; 61 refs inicialmente, 60 legadas, 12 PRs abertas.
- Matriz consolidada [`docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json`](../work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json), índice humano [`docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.md`](../work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.md) e cinco shards de compare com SHAs completos.
- `development` e auxiliar inicial `integration/00-inventory-governance-20261027` nasceram idênticas à main. Após integrar a auxiliar na development, confirmar o SHA vivo antes de prosseguir.
- Netlify produção `mobilipresenter2d`: READY em commit `221b54b2a41ecc8c338d1bf2cf67280cf165ce95` na verificação; branch deploy settings não são disponibilizadas pelo conector. Nenhum build/preview deve ser provocado sem necessidade e sem garantir isolamento.

## Prioridades e bloqueios

1. Tratar CI-BASELINE-01 e PR #238 como primeiro cluster técnico e extrair só testes válidos de branches antigas; distinguir CI isolada de runtime autenticado.
2. Páginas/headers e tokens VIS-002 sob autoridade do DS (NAV-004/NAV-005), com A11y; evitar aplicar variantes divergentes simultaneamente.
3. CP-PUBLIC sob D03=A: contrato V5 público e protegido, dados brutos privados, 401/403/503/fail-closed. PRs antigas ficam HOLD até mapa campo-destino.
4. Viewer/preços/medidas e Config sob schema data-driven, com estado global de publicação.
5. Renderização e lado exposto/vidro com evidências de fidelidade antes de considerar #34 obsoleta.
6. Higiene e poda somente após retenção DAG histórica protegida e consolidação de proveniência. Script P12/R10 antigo não é autorização para replay.

**Documentação é gate preparatório, não afirmação de absorção funcional.** Manter a `main` intacta. Não criar todas as auxiliares de imediato; abrir apenas o bloco em execução. Este handover não autoriza exclusão de refs. Testes D01–D04 aplicam-se a cada integração.


## Gate concluído — primeiro bloco técnico absorvido em development (27/10/2026)

- **Auxiliar:** `integration/00-migration-inspector-20261027@89d5343f7e627ea5f8bebccb4ecb78c4eb962bfb`, derivada da `development` documentada.
- **Fontes históricas preservadas literalmente:** `tools/migration-inspector.mjs` blob `0d862e435898daa8443ada12f7d093c5ab6232bc` e `tests/migration-inspector.test.mjs` blob `abe491f840c82b12e93c578442a9c548f47f8a5a`, provenientes de `tooling/migration-inspector-v0-20261023@2b00351acc1d1369116d8eeb546146a6b363072e`. O restante da branch de origem **não foi fundido**.
- **CI na auxiliar:** [Actions #40522017182](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40522017182), PASS; 4/4 testes, relatório determinístico, 8 rotas, 58 assets diretos, 29 compartilhados, 5 pares de classes lexicais candidatos, zero referências estáticas faltantes.
- **Integração:** fast-forward SHA-exato da auxiliar para `development@89d5343f7e627ea5f8bebccb4ecb78c4eb962bfb`; diff da auxiliar = quatro arquivos (ferramenta, teste, workflow scoped e recibo), sem runtime. [Actions development #40522167157](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40522167157) PASS.
- **Produção intacta:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` e Netlify production deploy `6adfce5d891219db4d8ed416` READY, mesmo commit, sem deploy manual nesta rodada. Nenhuma exclusão e as 12 PRs permanecem abertas.
- **Próximo bloco recomendado:** `01-ci-auth`, começando pelo diagnóstico seguro #238/issue #232, extraindo casos úteis (WebKit 1050/1051 e fronteira auth) sem mesclar fluxos legados. Outra auxiliar deve partir do HEAD novo da development e passar gates negativos de segurança. Reavaliar suas dependências antes de adotar o código.
- **Auxiliares de inventário e inspector** ainda existem como refs temporárias; seus commits foram incorporados à `development`. Excluí-las somente com gate de ref ancestral/lease e readback, nunca para atingir contagem arbitrária.

A `development` pode avançar independentemente da `main` sem herdar estabilidade ou publicação. Nenhuma automação nesta etapa promove branches antigas, nem o Inspector autoriza redução de testes de forma negativa.


## R9: teste responsivo do bloco CI integrado à development (27/10/2026)

- **Origem e decisão:** `ci/ci-baseline-01-nav-sequence-probe-20261023` tinha prova legada de sete larguras, mas presumia quatro etapas fixas. O teste V5 já presente na main `tests/ci/nav-flow-responsive-crossbrowser.cjs` **já cobria Chromium/WebKit e os limiares 1050/1051** com IDs data-driven. Portanto, **não** foi copiada a suíte antiga. Registro semântico: `docs/work/CI_BASELINE_R9_NAV_BOUNDARY_2026-10-27.md`.
- **Auxiliar de bloco:** `integration/01-ci-nav-boundary-20261027`; importação seletiva de 900/1200 px, mais transição ativa 1050↔1051, preservação da etapa e da ordem dinâmica da navegação; alteração de **teste, workflow local, recibo**, nenhum código/runtime/sessão.
- **Primeira falsificação:** [Actions #40524462681](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40524462681) FAIL; Chromium 16/16 PASS; WebKit 390 dark ficou temporariamente com `side-rail` após esperar 180 ms. Corrigido com espera condicional explícita pelo perfil (timeout 7500 ms), **sem flexibilizar valores esperados** e com o mesmo gate de geometria/overflow.
- **Nova verificação da auxiliar:** [Actions #40524950791](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40524950791) **PASS** 32/32 (16 Chromium + 16 WebKit), fixture V5 local, nenhum preview Netlify. `CI_NAV_RESPONSIVE_COMPLETE {completed:32,evidence:"local-validated-v5-not-authenticated-preview"}`.
- **Consolidação:** `development` foi avançada por **fast-forward com lease** até o commit de código testado `ab7d2d06ca798fe56327d25ba563aebfed972754`. CI na `development`: [Actions #40525526467](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40525526467), **EM EXECUÇÃO na observação imediatamente anterior a este checkpoint**; confirmar resultado e tratar erros antes de declarar gate final de destino PASS. Este parágrafo é histórico e não substitui readback mais recente.
- **PR #238 e erro real:** PR `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103` segue aberta; Auth Action [#40257905366](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40257905366) **FAIL**, por `BLOCKED_AUTH_FIXTURE: Deploy Preview was built from a different commit`. O deploy `6adea0c144bb0ee47add6707` do site isolado `m2d-auth-ci-isolated` foi verificado no Netlify como **READY em `41dcc1424bdeea5782d977d2b0509c88f76fe156`**, **não** no HEAD atual `3ccce...`. O bloqueio de identidade é correto; **não afrouxar o preflight**, nem assumir cinco suítes autenticadas verificadas. Sem novo deploy deliberado nesta rodada.
- **Governança:** 12 PRs legadas ainda abertas na observação de merge do bloco, nenhuma ref apagada. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` intacta. A suíte R9 é exclusivamente teste de UI em localhost, **não** prova de login autenticado em preview.
- **Seguinte:** revalidar CI de destino; depois preparar auditoria offline e contratos negativos de autorização para #238, sem copiar grant/roles/URLs legados como autoridade atual e sem encerrar PRs antes de conciliação. Limpar refs auxiliares só com gates explícitos de ancestralidade de `development` e ausência de PR.


## CI-BASELINE-01: identidade do Deploy Preview extraída em testes negativos (27/10/2026)

- Novo recorte isolado da PR [#238](https://github.com/EAKerber/MobiliPresenter2D/pull/238) para `tests/ci/preview-identity-attestation.mjs`: compara estritamente expected commit, branch, número da PR, marker `verified=true`, schemas e SHA256, recusa marcador faltante/incorreto e não inclui IDs concretos de banco, hostname de deploy ou permissão de acesso.
- Prova sintética offline na auxiliar `integration/01-ci-auth-identity-20261027@27d5945f4eda0fb6ed875fb2e62f44b2637cf3da`: [Actions #40528928050](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40528928050) **PASS 9/9**. Prova após fast-forward para `development`: [Actions #40529157447](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40529157447) **PASS**. Documentação de fonte: `docs/work/CI_BASELINE_PREVIEW_IDENTITY_EXTRACTION_2026-10-27.md`.
- **PR #238 permanece aberta/sem merge**, head `3ccce161235df925c5b708bf6feefbe6f4b10103`. O preview #238 verificado no Netlify tem `41dcc1424bdeea5782d977d2b0509c88f76fe156`, portanto o antigo teste autenticado [#40257905366](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40257905366) corretamente **bloqueou**, antes de quaisquer suítes pós-preflight.
- **R9 destino:** o workflow [#40525526467](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40525526467) terminou **CANCELLED** na instalação de browsers, sem executar os 32 cenários. A auxiliar R9 #40524950791 permanece PASS 32/32. A falha de infraestrutura não autoriza afirmar gate do destino; preparar alternativa com container oficial Playwright de versão exatamente `1.62.1`, preservando as mesmas asserções e sem rede à aplicação/Netlify.
- Nenhum endpoint/grant/banco de produção foi modificado. A `main` segue estável. O teste novo é contrato de preflight puro; **não** homologa autenticação real, revogação, Admin denial nem suite browser em Deploy Preview.

**Próximo gate:** melhorar apenas o setup da CI responsiva usando container verificado. Não declarar bloco R9 totalmente repetido no destino antes de novo PASS. Consolidar mudanças aprovadas por auxiliares temporárias e registrar os HEADs com leases.


## Reconciliação CI 15/15 e gate R9 finalmente PASS no destino (27/10/2026)

- [Ledger CI/autenticação](../work/CI_CLUSTER_RECONCILIATION_2026-10-27.md) cruza as 15 branches do inventário por SHA e classifica extração de blobs, teste já existente, adaptação semântica, ancestralidade da PR #238 e pendências.
- O container `mcr.microsoft.com/playwright:v1.62.1-noble` substituiu downloads de browsers. Auxiliar `integration/01-ci-r9-container-20261027@a653745f5b485dc473156871d1209b2abf3193e5`: [Actions #40529695931](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40529695931) **PASS 32/32**. Fast-forward para `development`; repetição [#40530168178](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40530168178) **PASS 32/32**, 16 Chromium + 16 WebKit, 8 larguras × 2 temas. Não houve regressão de navegação nem login/deploy Netlify.
- O novo teste de identidade da PR #238 foi absorvido previamente com 9/9 PASS no destino [#40529157447](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40529157447). A PR #238 propriamente dita segue **HOLD**: preview commit mismatch, sem autorização para mesclar o runtime legado.
- Teste público projetado da branch histórica `ci/ci-baseline-01-public-projection-test-20261022` já existe na development pelo mesmo blob `6a8faec2f00e0d7cd26084a1927fb6a5d9c660c3`; não duplicar.
- Ancestrais exatos de PR #238 provados por compare: `ci-auth-base-20261025` (22 commits atrás, 0 adiante) e `fix/config-stage-nav-grid-track-20261025` (4 atrás, 0 adiante). Como a PR #238 não entrou na development, a proveniência é dado de análise, não permissão de exclusão.
- Estado: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` permanece estável. Todas 12 PRs abertas foram mantidas até este checkpoint. **Próximo recorte técnico:** testar semântica da largura de rótulos 496–522px, extraindo seletivamente o que for útil do teste legado `fix/ci-baseline-v5-nav-flow-clean-20261023` (sem copiá-lo literalmente ou mudar CSS por heurística).

Este checkpoint encerra o gate de execução do R9 no destino; substitui o status *pending* da seção anterior. Nenhum deploy, exclusão de branch, escrita na main ou modificação de autenticação foi autorizado/feito.

## Gate CI de contêiner 500px concluído (27/10/2026)

- Fonte `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e883443696ce1c58c912ac4794ff75e` e teste legado `tests/ci/nav-label-width-boundary.mjs@7d15daeac6a88ecd295b5393a1878d610a809d57`. Como a `main` e a `development` tinham o mesmo blob de CSS (`d43e6fb5e66133d2389b5c39b165b76b13cfa868`), a comparação de raster antigo seria tautológica.
- Nova auxiliar `integration/01-ci-label500-invariant-20261027@994d7f613db144cbb07d638b05754820170a20a4` extraiu a **semântica** do teste sem transplantar CSS: `tests/ci/nav-label500-invariant.cjs`, workflow local e [proveniência R10](../work/CI_BASELINE_NAV_LABEL500_2026-10-27.md).
- Primeira janela de 10 larguras revelou uma lacuna: `.controls` 496–522px gerou conteúdo de `.flow-nav` 467–493px no Chromium, sempre compacto ([Actions #40537787907](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40537787907), FAIL por cobertura insuficiente, **não bug de CSS**). Ampliada para 17 larguras, cruzou o limite real de 500px.
- **PASS 136/136 na auxiliar** [Actions #40539023485](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40539023485) e, após **fast-forward SHA-pinned**, **PASS 136/136 na development** [Actions #40539657812](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40539657812). Nos dois motores, o último compacto tinha conteúdo interno nav de 500px e o primeiro completo 501px. Os painéis externos correspondentes variaram: Chromium 529→530px; WebKit 514→515px. Teste manteve temas, detalhe aberto/fechado, IDs V5 e ausência de overflow.
- Nenhum código de aplicação, visual homologado, auth, banco ou publicação Netlify foi alterado. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` intacta; 12 PRs abertas. A fonte histórica inteira continua preservada.
- **Auxiliares próprias:** seis branches de inventário/testes desta rodada foram conferidas como ancestrais da development e sem HEAD de PR aberta, incluindo a de R10. Preparado [plano não destrutivo de higiene](../work/DEVELOPMENT_AUX_RETIREMENT_PLAN_2026-10-27.json) com os seis SHAs completos e lotes preferenciais 3+3. Este plano **não executa exclusão**; criar/revisar executor com lease, inventário integral, readback e gates antes de efetuar qualquer poda. Não aplicar o lote antigo R10 da main na development.
- **Próxima extração funcional:** passar a `05-navigation` (header e menu) ou `04-tokens-a11y` conforme conflitos/risco, preservando DS como autoridade; não reabrir decisões homologadas sem evidência.
