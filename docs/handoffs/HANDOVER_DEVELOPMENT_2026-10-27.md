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



## Higiene A1 — três auxiliares ancestrais removidas (27/10/2026)

- O executor isolado `tools/development_aux_retirement.py` foi criado na `integration/01-aux-retire-gate-20261027`, com **11/11 testes negativos**, auditoria read-only [#40543878275](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40543878275) **PASS**, correção do pin histórico de proposta `994d7f...` para baseline de trabalho `00eadf...` sem afrouxar a comparação de ancestralidade.
- Após fast-forward SHA `071c9ed266c060aa55b2c646ebc3552d3e29ed33` na development, [apply A1 #40544066545](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40544066545) **PASS**; recibo `dev-aux-apply-40544066545` artifact ID `12752625724`: três refs exatas removidas com leases e readback: `integration/00-inventory-governance-20261027@ac7ace579bb69bdf4ca709a352c1462a1c65061b`, `integration/00-migration-inspector-20261027@89d5343f7e627ea5f8bebccb4ecb78c4eb962bfb`, `integration/01-ci-nav-boundary-20261027@ab7d2d06ca798fe56327d25ba563aebfed972754`.
- Ref count caiu de **69 para 66**; os três HEADs continuam ancestralmente acessíveis na development, 60 branches legadas e 12 PRs intactas, main estável `221b54b2a41ecc8c338d1bf2cf67280cf165ce95`. Os quatro workflows receberam remoção de triggers para refs auxiliares consumidas; os workflows continuam acionáveis pela development, nenhum código de aplicação ou deployment foi modificado.
- **NÃO REEXECUTAR A1:** o manifesto `ops/development-aux-retirement-batch.json` foi consumido. Não alterar o manifesto antigo para repetir A1. Para retirar as três auxiliares restantes, criar A2 com seis SHAs originais retidos, três explicitamente já ausentes, inventário remoto esperado 66 e gates negativos equivalentes. `integration/01-aux-retire-gate-20261027` é operacional e deve ser encerrada em etapa própria, sem eliminar seu HEAD durante a execução.
- Três auxiliares ainda presentes: `integration/01-ci-auth-identity-20261027@27d5945f4eda0fb6ed875fb2e62f44b2637cf3da`, `integration/01-ci-r9-container-20261027@a653745f5b485dc473156871d1209b2abf3193e5` e `integration/01-ci-label500-invariant-20261027@994d7f613db144cbb07d638b05754820170a20a4`. O operacional está presente também. Usar gate separado para eliminá-los.



## Auxiliar A2 consumida — seis refs ancestrais removidas (27/10/2026)

- [Auditoria A2 #40545886571](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40545886571) PASS com 12 testes e comprovação do receipt A1. O lote independente `ops/development-aux-retirement-batch-a2.json` reobservou 66 refs e os 60 SHAs legados, todas 12 PRs, integridade de `main`, ancestralidade dos seis commits e ausência das três refs consumidas no A1.
- [Apply A2 #40546084945](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40546084945) **PASS/readback**, removendo com leases as três refs: `integration/01-ci-auth-identity-20261027@27d5945f4eda0fb6ed875fb2e62f44b2637cf3da`, `integration/01-ci-r9-container-20261027@a653745f5b485dc473156871d1209b2abf3193e5` e `integration/01-ci-label500-invariant-20261027@994d7f613db144cbb07d638b05754820170a20a4`. Branches 66→63, seis auxiliares iniciais removidas desde A1, todos os commits acessíveis pela development, 60 refs originais e 12 PRs intocadas.
- **A1 e A2 estão consumidos; NÃO REEXECUTAR**, nem copiar seus manifests para outras branches. A branch única operacional `integration/01-aux-retire-gate-20261027@8bc69de89f977b9e82960c5b0c950c6fe6854fc1` permanece; sua eventual retirada exige gate terminal próprio, incluindo remoção do trigger explícito de workflow, lease SHA, ancestralidade em development e confirmação das 60 refs históricas.
- O teste de container-query 500px, ao repetir o push do A1, revelou falha intermitente Chromium/dark/536 (a largura interna 507px já havia estabilizado mas `font-size:0` ainda não). A atualização **somente do teste** `tests/ci/nav-label500-invariant.cjs` aguarda, por até cinco segundos, que o estilo computado reflita a largura real; divergência persistente continua FAIL. [Revalidação #40544646000](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40544646000) **PASS 136/136**. R9 responsivo [#40544066407](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40544066407) também PASS. Não houve alteração do CSS/runtime.
- Próxima frente funcional: cluster `05-navigation`; `ARC-03C` compilador já está incorporado e `app/landing/header-menu.js` atual tem a mesma semântica que a proposta `p-comp-01`. Comparar contratos e testes restantes, não mesclar o histórico completo nem duplicar lógica.



## Higiene terminal — somente as 60 refs históricas mais main e development (27/10/2026)

- Após A1 ([Actions #40544066545](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40544066545), 3 HEADs) e A2 ([Actions #40546084945](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40546084945), 3 HEADs), a branch operacional `integration/01-aux-retire-gate-20261027@8bc69de89f977b9e82960c5b0c950c6fe6854fc1` foi removida por gate independente.
- [Actions terminal #40547046013](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40547046013) **audit PASS + apply PASS**: 10/10 testes negativos, SHA lease da única ref operacional, ancestralidade comprovada em development, listagem de 63 refs exatas pré-operação e **62 exatas pós-operação**, 60 branches históricas sem drift, 12 PRs abertas intactas, ruleset/branch protection verificadas. Artifacts: `dev-terminal-audit-40547046013` ID `12753770567`, `dev-terminal-apply-40547046013` ID `12752569786`.
- O workflow consumido `.github/workflows/development-aux-retirement.yml` foi desativado para execução automática. O executor terminal `tools/development_aux_terminal.py` e manifesto `ops/development-aux-terminal.json` são **uso único e consumidos**, não alterar nem reexecutar. A próxima limpeza precisa de novos waves a partir de novo inventário.
- **Estado remoto verificado:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, `development@a5fbf390aafaced54bd564b49c788d4a6a1b8fbd` no término do terminal, **62 branches** (somente main, development e as 60 do inventário legadas), **12 PRs abertas**. As 60 legadas são deliberadamente preservadas, inclusive as divergentes e as ligadas a PR. Nenhuma alteração no Netlify e nenhuma escrita na main.
- O branch seguinte `integration/05-navigation-contracts-20261027` deve ser criado **sob demanda** a partir da development corrente, após avaliação semântica do cluster `05-navigation` e dos padrões ARC-03C/NAV homologados. Não copiar HEADs antigos automaticamente.



## NAV-004 / NAV-005 — reconciliação sem transplante de runtime (27/10/2026)

- Matriz semântica das sete refs históricas do cluster 05: [`docs/work/DEVELOPMENT_NAVIGATION_CLUSTER_2026-10-27.md`](../work/DEVELOPMENT_NAVIGATION_CLUSTER_2026-10-27.md). Nenhum HEAD divergente foi incorporado integralmente. `ARC-03C` já é fonte autoritativa de três páginas; `NAV-005` do Viewer é independente. Os controladores de menu e accordion já existem no código atual; só adicionamos uma suíte nova e um workflow estritamente local.
- Auxiliar `integration/05-navigation-contracts-20261027@09ba40a6c2aae340c8ed8e4ecbc638e141a9e532` foi validada em [Actions #40551975218](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40551975218): **48/48 PASS**, 24 Chromium + 24 WebKit (4 rotas × 3 larguras × 2 temas). A suite ARC-03C passou 4/4, `npm run pages:check` PASS.
- Primeira execução [#40551701062](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40551701062) foi FAIL por duas premissas do **teste**: `./` em `/how-it-works/` é link relativo válido para `aria-current`; iframe sem origem de armazenamento pode negar `localStorage` ao initScript do teste. Corrigidos URL resolvida e try/catch limitado à instalação do tema em iframe, sem relaxar expectativas sobre a aplicação.
- Fast-forward com lease em `development@09ba40a6c2aae340c8ed8e4ecbc638e141a9e532`. Segunda execução na development [#40552434658](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40552434658) **PASS 48/48**, 24 Chromium + 24 WebKit. O menu de Quem somos, teclado/Escape/foco, fechamento por pointer/link, estados de rota, Viewer ordem **Ambientes → tema → menu** e não ativação do menu em Viewer foram testados. **Não se trata de teste de dispositivos reais nem de login/Netlify.**
- Alterações funcionais de produto/HTML/CSS/schema/auth = **zero**. Só `tests/ci/public-navigation-semantic-browser.mjs`, workflow de localhost e documentação. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` intacta; 12 PRs ainda abertas antes do terminal.
- **Higiene pendente/planejada:** a branch auxiliar está totalmente ancestral à development. `tools/development_nav_aux_retire.py` e workflow de uso único devem retirar somente o ref `integration/05-navigation-contracts-20261027` após readback completo dos 60 heads legados e os dois HEADs permanentes, aprovação do gate #40552434658, ausência de PR/ruleset/proteção e lease exato. Não executar poda das 60 origens. O resultado terminal será registrado separadamente após o Action.
