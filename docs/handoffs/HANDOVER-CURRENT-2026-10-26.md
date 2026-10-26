# Handover canônico — MobiliPresenter2D + MobiliPresenter2D_DesignSystem

**Checkpoint:** 26/10/2026, America/Sao_Paulo. **Destinatário:** próximo chat/agente, sem acesso ao contexto desta conversa. **Missão:** retomar implementação e reconciliação incremental, sem reabrir decisões homologadas nem descartar conteúdo exclusivo.

## Atualização de retomada — 26/10/2026, após PR #256 (18:41 UTC)

**Estado observado após leitura integral e nova consulta aos dois repositórios:** produto `main@44bf5b5520b21bd402cc5ce8787c73adda3d2e97` (commit de integração funcional, *anterior ao commit documental desta atualização*); Design System `main@04358f892de98bdf0f2f3c12a432e296f6fc9c56`. As decisões D01=A, D02=B, D03=A, D04=A e as decisões visuais CLOSED seguem inalteradas.

**Release efetivo:** Netlify `mobilipresenter2d` Production READY, deploy `6adf9eb9129a21cc59af9131`, `commit_ref=44bf5b5520b21bd402cc5ce8787c73adda3d2e97`, publicado em 26/10/2026 18:41:20 UTC. O deploy do site isolado foi observado READY em `a285cc744956eded9e4fabe2f0067b44a0c2165a` antes da nova integração; seu estado posterior não foi usado como prova da PR #238. Esta atualização documental não é prova de publicação de seu próprio commit.

**CI-238 / progresso material:** [PR produto #256](https://github.com/EAKerber/MobiliPresenter2D/pull/256) MERGED (squash `44bf5b5520b21bd402cc5ce8787c73adda3d2e97`), após [Flow layout browser PASS](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40379417504) e [Current asset gates PASS](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40379417460). O patch restringe-se a `tests/ci/nav-flow-responsive-crossbrowser.cjs` e `.github/workflows/flow-layout-browser.yml`. Reaproveita matriz responsiva histórica sem copiar a suposição obsoleta de quatro etapas: compara os controles à configuração V5 publicada e testa 390, 700, 701, 1050, 1051 e 1366 px × claro/escuro × Chromium/WebKit, com resize, geometria, clique e navegação por teclado nas fronteiras. **24/24 PASS, 0 FAIL** no log do job `121771286343`. A fixture atualmente exercitada tinha quatro etapas, mas a asserção lê as etapas dinamicamente; não alegar teste de quantidade alternativa sem fixture específica. A execução usa V5 validada em loopback, **não** sessão autenticada real nem Deploy Preview. Nenhum novo workflow isolado, segredo, banco ou endpoint foi criado.

**PR #238 e issue #232 continuam abertas:** head `3ccce161235df925c5b708bf6feefbe6f4b10103`; em nova comparação antes da #256 estavam 102 ahead/113 behind, 20 arquivos divergentes em relação à `main@a285cc7`. Recalcular antes de novo patch. O gate de 26/10 [run #40257905366](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40257905366) passou pelo resgate e revogação de grant, mas falhou na etapa das cinco suítes protegidas, pois o preview não correspondia ao SHA; não foi uma passagem completa no head. A PR ainda inclui alterações a `app/app.js`, `app/styles.css`, `netlify.toml` (inclusive remoção de redirect `/api/access/session`), workflows e migração privilegiada de fixture no banco interno. **Não transportar nem mesclar integralmente** sem revisão explícita de contratos/autorização e de compatibilidade com os merges #241/#242/#244/#254. A regra D02=B não dispensa fail-closed, negação de privilégio, escopo e revogação.

**DS #51:** ainda aberta e divergente de `main` (814 ahead/39 behind, 236 caminhos listados no compare), `head=28062602a4ddcd1bee090742fe2587fe3837175d`; manter D04 seletiva e os sete documentos já extraídos por #56. Nenhuma alteração no repositório Design System nesta retomada.

**Próximo gate concreto:** separar os 20 caminhos de #238 em (a) testes portáveis e já cobertos, (b) testes específicos de preview/CI, (c) alterações de runtime/Netlify/DB que exigem revisão de ameaça. Checar destino dos redirects, fixture plugin e compatibilidade da navegação; preferir nova PR pequena baseada na `main`, com provas negativas e positivas reproduzíveis. Não solicitar preview por conveniência e não fechar #232 antes da revisão real.

---

> **ESTE HANDOVER SUBSTITUI O STATUS DE RETOMADA DOS RELATÓRIOS R5–R8 E DO HANDOVER DE 22/10, MAS NÃO SUAS EVIDÊNCIAS.** Alguns arquivos ainda afirmam que as PRs #241, #242 e #244 estão Draft; isso se tornou histórico. Sempre ler heads, PRs, jobs, Netlify e árvore da main *novamente* antes de agir. Não deduzir produção publicada a partir de merge.

## 0. Bootstrap do próximo chat — começar aqui

1. Abrir este documento na branch `main` do produto e conferir se existe atualização posterior: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/handoffs/HANDOVER-CURRENT-2026-10-26.md .
2. Consultar `AGENTS.md`, `CURRENT_STATE.md` (histórico com trechos contraditórios), os documentos de governaça D01–D04 e a árvore de ambos os repositórios.
3. Verificar via API/connector GitHub os heads de `EAKerber/MobiliPresenter2D` e `EAKerber/MobiliPresenter2D_DesignSystem`, PRs abertas, checks mais recentes, estado dos deploys e permissões. Não assumir que os SHAs deste snapshot seguem atuais.
4. Identificar qual tarefa tem maior benefício e menor risco: dar seguimento ao gate/integração CI #238, consolidar material da PR DS #51, reconciliar CP-PUBLIC restante ou reduzir dívida de branches com gatilhos *explícitos*.
5. Trabalhar numa branch existente de manutenção por fast-forward com CAS quando apropriado, ou branch pequena e isolada. Revisar diff, gates, PR e recibos; não disparar preview Netlify só para observar documentação. Não usar `gh`; o conector GitHub/API e os mecanismos do repositório estão disponíveis.
6. Preservar handover após mudanças materiais e informar ao usuário links Git do commit/PR, blockers reais e próximo passo.

## 1. Objetivo de longo prazo

O produto é o MobiliPresenter2D; o repositório `MobiliPresenter2D_DesignSystem` é autoridade de decisões e tokens visuais aprovados. A missão atual é integrar trabalhos úteis em ordem de dependência, corrigir gates e incompatibilidades, conciliar os arquivos e PRs antigos por evidência e retirar branches redundantes gradualmente, **sem meta numérica arbitrária** (em conversa anterior o usuário recusou reduzir de 122 para dez de uma vez).

Princípios:
- **Nunca inventar estado nem dados**. Conteúdo incompleto fica pending/HOLD até validação.
- **Design System é autoridade de paleta/roles**; `decisions.json` e cores globais não mudam oportunisticamente. Direções visuais já aprovadas são `CLOSED`; não reabrir alternativas por haver pendência técnica.
- **Não confundir** decisão aprovada, teste verde, equivalência de funcionalidade, PR integrada, deploy em produção e branch segura para excluir.
- **Minimizar consumo de bandwidth Netlify**, incluindo previews redundantes por PR. CI local via GitHub Actions/Playwright primeiro; deploy/preview só quando realmente necessário e apropriado.
- **Segurança fail-closed** em auth, dados privados, grants, sessão, acesso, DTO comprador. Não usar segredo ou senha passada no chat como improviso.
- Preferir pequenos patches rastreáveis a infraestrutura duplicada; usar testes estruturais, comportamento real e inspeção visual como evidências separadas.

## 2. Governança aprovada pelo usuário em 26/10

Registro fonte produto: [`docs/work/D01_D04_APPROVED_INTEGRATION_POLICY_2026-10-26.md`](../work/D01_D04_APPROVED_INTEGRATION_POLICY_2026-10-26.md).
Registro fonte DS: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/docs/APPROVALS_D01_D04_2026-10-26.md .

| ID | Resposta exata | Efeito |
| --- | --- | --- |
| **D01 = A** | Integração incremental após gates técnicos | Uma PR por vez, respeitando contratos e dependências. Não executar merge em massa. |
| **D02 = B** | Aceitar os testes isolados inicialmente | Smoke autenticado real **não é gate universal** da primeira integração; checks isolados reproduzíveis bastam inicialmente quando cobrem o contrato. Autorização, permissões, falha fechada e proteção de dados continuam obrigatórias; declarar claramente as lacunas de ambiente real. |
| **D03 = A** | Extrair o que ainda é útil e encerrar PRs CP-PUBLIC substituídas | Provar destino/absorção por arquivo e contrato, registrar SHAs e evidências, encerrar somente as redundantes. Fechar uma PR não apaga sua branch. |
| **D04 = A** | Consolidação seletiva com proveniência | Preservar cada artefato importante da PR DS #51 com SHA e contexto, sem mesclar cegamente centenas de arquivos divergentes. |

**Decisões estéticas CLOSED:** fallback compacto de imagem com texto completo em rolagem interna e foco de teclado quando há overflow; cor contextual VIS-002C v0.3 `#292723` apenas nos dez seletores de texto longo claro; cabeçalhos NAV-005 por profundidade; suporte opaco do anel dourado de foco do hotspot do Viewer. A imagem ilustrativa aprovada do fallback **não** é screenshot do runtime. Referência: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/DECISION_APPLICATION_MAP.md . Não transformar pendências de teste em solicitações para reconsiderar essas escolhas.

## 3. HEADS e inventário observados — revalidar antes de operações

Em leitura API nesta retomada:

- **Produto main:** `3bea2f3e037d7a43e88c840981246fe13ab2ad2a` — 71 branches no total; branch operacional reutilizável `maintenance/branch-retirement-r4-20261026` foi alinhada por fast-forward a esse head ANTES deste handover.
- **Design System main:** `04358f892de98bdf0f2f3c12a432e296f6fc9c56` — 46 branches; operacional `maintenance/bounded-retirement-wave01-20261026`.
- **Total:** 117 branches, sem objetivo final fixo. Os antigos inventários R0/R1 foram construídos quando as mains estavam em SHAs diferentes; refazer classificação e PR references no estado corrente, não reutilizar cegamente o CSV.
- Um run de produção read-only do produto **passou** na main `3bea2f3...`: https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40375985872 . Asset gates e Branch hygiene também PASS nesse SHA. O estado exato do **deploy Netlify** não foi verificado nesta leitura: consultá-lo antes de afirmar READY/produção publicada.
- O merge imediatamente anterior foi [PR #254](https://github.com/EAKerber/MobiliPresenter2D/pull/254), commit `3bea2f3...`: corrigiu falso negativo do smoke test do gate de acesso a produção. Um teste read-only em SHA intermediário `818f165...` falhou, e o run mais novo na main passou; não confundir os dois.
- Branch operacional de higiene geral continua **audit-only**; autorização destrutiva é exclusivamente por manifesto pinado.

## 4. Trabalho efetivamente realizado nesta longa conversa

### 4.1 Reconciliação e proteção (R0–R4)

- Inventário original dos dois repositórios: 122 branches, 120 fora de main. Classificação inicial: 8 ancestrais, 13 ahead-only e 99 divergentes no snapshot daquela data. Inventário e checkpoints foram persistidos na Library e os relatórios Git R5–R8 resumem triagem posterior.
- Produto [PR #247](https://github.com/EAKerber/MobiliPresenter2D/pull/247): retira exclusão automática indiscriminada do workflow `branch-hygiene.yml`; observação, plano e artefato continuam, permissão geral `contents: read`.
- Produto [PR #248](https://github.com/EAKerber/MobiliPresenter2D/pull/248): acrescenta executor bounded de 1 a 3 refs com manifesto `ops/branch-hygiene-batch.json`, SHAs imutáveis, ancestry de main, proteção e PR aberta, `planHash`, reobservação por ref, `--force-with-lease` e readback. CI inicial 19 testes de higiene. Lote R4 removeu duas refs ancestrais com recibo PASS: `ci/ci-baseline-01-browser-suite-stabilization-20261024` e `maintenance/branch-hygiene-audit-only-20261026`.
- DS [PR #53](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/53) e [PR #54](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/54): seis branches ancestrais históricas aposentadas em dois lotes de três, com SHA exato, readback e recibos GitHub Actions. Não foram apagadas branches divergentes.
- **HOLD:** `architecture/arc03c-static-page-build-20261022` (produto) contém zero commits exclusivos, mas há referência em `.github/workflows/arc03c-static-page-build-gate.yml`. A tentativa de alterar o gatilho foi bloqueada; não contornar esse bloqueio nem excluir ref enquanto dependência não resolvida.
- Se um lote for proposto novamente, primeiro verificar o manifesto atual (que pode conter pins de lote **já executado**), heads e autorizações; o fato de o executor existir não autoriza nova exclusão.

### 4.2 R5–R8 — divergência, equivalência, teste visual

Documentos detalhados na main do produto:
- [R5 — branches divergentes](../work/r5-divergent-branch-reconciliation.md).
- [R6 — conteúdo, blobs e contratos](../work/r6-branch-content-equivalence-2026-10-26.md).
- [R7 — teste raster e CI antiga](../work/r7-vis002c-raster-and-ci-test-disposition-2026-10-26.md).
- [R8 — fallback e limiar 1050/1051](../work/r8-image-fallback-keyboard-and-ci-boundary-2026-10-26.md).

R6 verificou igualdade byte-a-byte por SHA Git entre artefatos da DS #52 e da PR produto #241: CSS v0.3, manifesto e mapeamento dos dez seletores. A escolha de cor e papéis já estava homologada.

R7 portou o teste VIS-002C de comparação raster para v0.3 no produto: 12 cenários (Chromium/WebKit × 390/1366 × Landing/About/Como funciona), 40 checagens de seletores, zero pixels fora da área permitida. O `legacy` de cor é sintético no **mesmo DOM**, não baseline histórico.

R8 adicionou teste dos 19 placeholders informativos: 16 cenários (Chromium/WebKit, 390/1366, claro/escuro, 2 páginas), 152 avaliações. O teste detectou 11 descrições scrollable em Como funciona; foi implementado `tabindex=0` somente quando a área tem overflow e remoção ao recuperar imagem. Run aprovado: https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40358961528 . A decisão visual sobre manter rolagem interna foi **aprovada** pelo usuário e registrada no DS.

A família CI de diagnóstico contém teste antigo da fronteira 1050/1051 px e WebKit que ainda pode acrescentar cobertura ao branch de autenticação; **não copiar integralmente**: o código legado presume quatro etapas fixas. Os testes OIDC antigos são referência de ameaças, não fluxo de auth homologado a reativar.

### 4.3 D01–D04 executadas e merges relevantes

- DS [#52](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/52) MERGED em `9324bbcff78839a5c2b8e715c40654ea7c3f4c54`: autoridade VIS-002C v0.3.
- DS [#55](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/55) MERGED: registra escolhas visuais como CLOSED, sem cancelar gates técnicos.
- DS [#56](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/56) MERGED em `04358f892de98bdf0f2f3c12a432e296f6fc9c56`: política D01–D04 e **sete documentos** trazidos da PR histórica DS #51 com seus Git Blob SHAs preservados. Registro: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/docs/HANDOVER_SELECTIVE_EXTRACTION_2026-10-26.md .
- Produto [#253](https://github.com/EAKerber/MobiliPresenter2D/pull/253) MERGED em `2f3f810a7960b2821caf2535e1ec80b1890b7295`: política D01–D04 e **quatro documentos** CP-PUBLIC vindos das antigas PRs #181/#183, com hashes preservados. Registro: [D03 ledger](../work/CP_PUBLIC_D03_EXTRACTION_LEDGER_2026-10-26.md).
- Produto [#181](https://github.com/EAKerber/MobiliPresenter2D/pull/181) e [#183](https://github.com/EAKerber/MobiliPresenter2D/pull/183) **CLOSED SEM MERGE**, após extração dos planos/inventários. Suas refs não foram excluídas.
- Produto [#243](https://github.com/EAKerber/MobiliPresenter2D/pull/243) MERGED `7e64bb43f5658ee3688d270609eb48ae9b6c5f0b`: correção do carrossel mobile, seleção permanece visível.
- Produto [#244](https://github.com/EAKerber/MobiliPresenter2D/pull/244) MERGED `aa6c3140ec691a2d024052e09ca7c7b9990ac9b3`: header privado NAV-005 responsivo homologado.
- Produto [#242](https://github.com/EAKerber/MobiliPresenter2D/pull/242) MERGED `ca6b0b5eea03255263deed8cac75a428c6492cd6`: foco de hotspot no Viewer e fallback da imagem de cena.
- Produto [#241](https://github.com/EAKerber/MobiliPresenter2D/pull/241) MERGED `818f165bf0b11b53f5fbaba1417560066bf03637`: contraste VIS-002C e fallback acessível. **Antes do merge**, o gate keyboard em uma execução anterior foi cancelado; posteriormente o merge ocorreu. Revalidar evidências no SHA da main e regressões, não repetir "PR #241 Draft".
- Produto [#254](https://github.com/EAKerber/MobiliPresenter2D/pull/254) MERGED `3bea2f3e037d7a43e88c840981246fe13ab2ad2a`: correção do smoke test do acesso público protegido. Read-only verificação de produção PASS no head atual.
- Outros merges já persistidos: #249 R5; #250 R6; #251 R7; #252 R8 (todos documentais).

**Importante:** os merges acima são mudanças na main, não evidência automática de que Netlify publicou todos os commits. Verificar state/commit do deploy se necessário.

## 5. Pendências e riscos atuais

### Prioridade A — PR produto #238 e issue #232

- [PR #238](https://github.com/EAKerber/MobiliPresenter2D/pull/238) **ABERTA**, head `3ccce161235df925c5b708bf6feefbe6f4b10103`: CI-BASELINE-01, fixture isolada de autenticação e reparo da navegação do Config.
- Em comparação com main observada `3bea2f3...`, está **divergente**: 102 commits ahead, 111 behind e ~20 arquivos diferentes. **Não fazer merge cego**. Investigar branches de CI ancestrais e efeitos recentes de #241/#242/#244/#254. Recalcular antes de reconciliar.
- A regra D02=B aceita testes isolados inicialmente, não revoga gates de fail-closed, grant/allowlist, dados privados e permissão mínima. A issue #232 precisa de leitura ao retomar.
- Testes legados potencialmente valiosos: `tests/ci/nav-flow-profile-crossbrowser.mjs` (1050/1051, WebKit), `tests/ci/v5-container-causality.mjs`; classificar assertions úteis sem impor a sequência obsoleta de quatro etapas.

### Prioridade B — DS #51, D04, e documentação

- [PR DS #51](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/51) **ABERTA**, head `28062602a4ddcd1bee090742fe2587fe3837175d`. Na revisão anterior tinha 814 commits ahead e 236 caminhos diferentes da main (161 `evidence/architecture`, 67 `evidence/runtime`).
- **Sete documentos** runtime de interesse imediato já foram importados com SHA na PR #56. O restante, incluindo 161 rastros de arquitetura, snapshots e os três WebP da comparação de fallback, continua na branch original.
- Classificar resíduos em `importado`, `indexado sem cópia`, `redundante comprovado` ou `pendente`. Não mesclar tudo, nem fechar/excluir a PR/branch antes do mapa de cobertura e proveniência. Comparar documentos conflitantes por seção para não sobrescrever `DECISION_APPLICATION_MAP.md` recente.

### Prioridade C — CP-PUBLIC / D03

- As PRs produto #181 e #183 foram encerradas sem merge depois de preservar 4 documentos.
- A família **ainda aberta Draft/HOLD** inclui #175, #178, #179, #180, #182, #184, #185, #186; #196 continua aberta separadamente. D03=A pede extração e encerramento **após** verificar cada contrato.
- Não fundir os fluxos de 08/10 com a arquitetura atual por semelhança de nome. Confrontar `app/core/public-module-projection.js`, `app/core/published-buyer-projection.js`, `app/access/access.js`, `netlify/functions/access-redeem.mjs` e endpoints atuais contra DTO/erro/authorization/grant/privacidade históricos. O schema/DTO atual é diferente de `BuyerConfiguration2D 0.1`.
- Matriz desejada: campo legado, campo atual, autorizador, status 401/403/503, fallback, prova por teste, decisão `absorvido/extrair/manter/descartar` e commit SHA.
- Outras PRs Draft: #231 pin contextual antigo, #34 vidro/laterais expostas. DS #39 e #41 ainda estão Draft. Evitar misturar tarefas sem dependência direta.

### Prioridade D — branches e limpeza

- A maioria das branches não ancestrais tem história divergente; somente merge/cherry-pick com equivalência comprovada, ou descarte com auditoria, permite considerá-las redundantes.
- Reconciliar as duas branches operacionais quando deixar de ser necessário e a proteção equivalente já existir na main. A branch DS `docs/current-handover-20261024` é preservada até D04.
- Não criar alvo 10/20 branches por conveniência e não mexer em branch protegida, com PR aberta ou SHA alterado.
- Arquitetura de limpeza atual usa scripts/workflows existentes; NÃO criar outro orquestrador redundante. Revisar auto-invocação, intenção e ambiente antes de qualquer push com manifesto.
- O branch ARC-03C permanece HOLD por referência antiga em workflow cujo ajuste teve bloqueio.

## 6. Plano de execução recomendado ao novo chat

**Passo 1 — saúde do estado:** reconsultar GitHub mains, commits posteriores, PRs abertas, Actions da main e deploy Netlify da versão realmente publicada. Confirmar se a correção #254 resolveu a falha intermediária de smoke read-only sem presumir que a execução anterior prevalece.

**Passo 2 — CI #238:** revisar a base divergente e os ~20 caminhos conflitantes/diferenciais. Propor pequeno patch ou rebase controlado em branch de integração, executar gates isolados correspondentes, e separar a matriz de navegação WebKit 1050/1051. Não alterar autenticação fora dos limites D02. Integrar somente após gates, sem preview gratuito desnecessário. Se qualquer erro técnico persistir, documentar exatamente evidência/owner/gate.

**Passo 3 — D04:** construir índice da PR DS #51 por categoria e SHA. Consolidar próximo lote pequeno de evidências não redundantes; reavaliar notas antigas contra main nova; não fazer merge total nem importar histórico grande sem objetivo.

**Passo 4 — D03:** começar por PRs CP-PUBLIC documentais/mais simples; para cada PR, provar destino do conteúdo exclusivo, extrair docs/testes importantes e só então encerrar como superada sem deletar sua ref. Rotas de autenticação/sessão/DTO exigem revisão própria.

**Passo 5 — higiene segura:** inventário atualizado após cada onda material. Selecionar no máximo 1–3 refs com ancestry/equivalência demonstrada, autorização e SHA pinado, readback; atualizar relatório/ledger. Não usar número de branches reduzidas como métrica única de progresso.

**Passo 6 — persistência:** atualizar este handover ou criar próximo checkpoint datado com HEADs, PRs, recibos, decisões, testes e próximos gates. Sem prometer execução assíncrona.

### Gates mínimos para decisões posteriores

- **Structural:** build/teste de import/diff sem modificação inesperada, schema, CI de contrato, tipagem/lint quando houver.
- **Functional:** teste negativo e positivo de endpoints, login/segurança (se aplicável), controle de autorização e privacidade.
- **Visual:** validação automatizada não substitui inspeção estética; decisões já homologadas não retornam para votação.
- **Release:** main integrada não implica deploy publicado; confirmar estado de Netlify e evitar custo de previews redundantes.
- **Branch retirement:** matriz de conteúdo/proveniência + ausência de PR aberta + cabeça estável + lease e readback.

## 7. Referências Git canônicas

### Produto
- Repositório: https://github.com/EAKerber/MobiliPresenter2D
- Política D01–D04: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/work/D01_D04_APPROVED_INTEGRATION_POLICY_2026-10-26.md
- CP-PUBLIC ledger: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/work/CP_PUBLIC_D03_EXTRACTION_LEDGER_2026-10-26.md
- R5: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/work/r5-divergent-branch-reconciliation.md
- R6: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/work/r6-branch-content-equivalence-2026-10-26.md
- R7: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/work/r7-vis002c-raster-and-ci-test-disposition-2026-10-26.md
- R8: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/work/r8-image-fallback-keyboard-and-ci-boundary-2026-10-26.md
- Handover arquitetural histórico: https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/handoffs/ARCHITECTURE-CURRENT-2026-10-22.md

### Design System
- Repositório: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem
- Decisões visuais: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/DECISION_APPLICATION_MAP.md
- Política D01–D04: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/docs/APPROVALS_D01_D04_2026-10-26.md
- Extração seletiva e SHAs: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/docs/HANDOVER_SELECTIVE_EXTRACTION_2026-10-26.md
- Handover histórico a preservar: https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/51

## 8. Prompt sugerido ao próximo chat

> Retome o projeto MobiliPresenter2D + MobiliPresenter2D_DesignSystem. Leia primeiro https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/handoffs/HANDOVER-CURRENT-2026-10-26.md e seus links de governança e evidência. Confirme os heads vivos e o estado atual de PRs, CI e deploy antes de qualquer trabalho. Aplique D01=A, D02=B, D03=A, D04=A; decisões visuais estão CLOSED. Priorize a reconciliação técnica segura da PR #238 e, depois, handover DS #51 / CP-PUBLIC por extração seletiva e rastreável. Não reative preview/segredos sem necessidade, não faça exclusão automática indiscriminada nem use metas arbitrárias de branches. Execute avanço material e atualize o handover Git, indicando commits/PRs e blockers.
