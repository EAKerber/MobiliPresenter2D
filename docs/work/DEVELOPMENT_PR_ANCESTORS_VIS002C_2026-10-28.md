# Bloco 34 — DAG ancestral da PR #238 e triagem VIS-002C (28/10/2026)

**Escopo:** prova offline, sem código de produto, autenticação, Netlify, banco, CSS transplantado ou deploy. Autoridades: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; baseline `development@5c6e0be9a0d3530d08477e15e09374c2afc264bc`. O lote de higiene anterior AA foi CONSUMED e não será reexecutado.

## Uma referência pronta para arquivamento; segunda referência ainda não é elegível

1. `fix/config-stage-nav-grid-track-20261025@dbfbd9a7bca0e9f581e5d8ac4a765e01829d6ce9` é **ancestral estrito** de `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103`, head aberto da PR [#238](https://github.com/EAKerber/MobiliPresenter2D/pull/238). `merge-base` é o SHA original, **4 commits subsequentes** no head da PR, zero commits exclusivos na fonte. O diff fonte→PR modifica seis arquivos de CI/fixture e não acrescenta arquivo de UI; a versão de navegação da fonte **não prevalece** sobre a autoridade atual da main. A PR #238 continua HOLD por identidade do deploy autenticado e alterações próprias de runtime/SQL/Netlify. Preservar DAG por tag `archive/m2d/config-nav-grid-pr238-dbfbd9a7`, não executá-la e não tocar na PR.
2. **HOLD após gate negativo:** `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9850dc194f68b16fa097c6691c06b` é **DESCENDENTE**, não ancestral, da PR [#231](https://github.com/EAKerber/MobiliPresenter2D/pull/231) `architecture/p-token-02b-contextual-copy-20261022@afb80965336083209eac93e2729de77170524ee5`. `merge-base` é o SHA da PR #231, com **5 commits exclusivos na fonte v0.2** e zero exclusivos na PR. O primeiro gate [#40747792240](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40747792240) falhou exatamente ao conferir a direção; nenhuma ref foi removida. O diff PR→origem tem **19 arquivos**, incluindo CSS, mapeamento, integração e testes de cor. A fonte NÃO é redundante por ancestralidade, mesmo que v0.3 seja visualmente mais recente. **Não criar tag para excluir nem aposentar a origem agora**; registrar a intenção e analisar seus 19 arquivos isoladamente antes de qualquer poda.

As duas fontes não encabeçam PR aberta, mas só a **navegação** está comprovada como ancestral recuperável da PR #238. As doze PRs continuam protegidas. Pelo contrato do executor bounded, esse alvo requer `archive-diverged`, `snapshotPath`, `semanticGate`, tag apontando diretamente ao SHA e verificação exata de SHA e roster remoto. A auxiliar 34, após integração FF, só poderá ser removida como ancestral de development.

## Comparação causal VIS-002C (não confundir versões e intentos)

| Artefato | Origem 23/10 v0.2 | `main`/ `development` v0.3 (24/10) |
|---|---|---|
| Distribuição | `approved-contextual-support-text-v2.css@39591876eb0a563553214dcd64062258c7eb35c0` | `vis002c-long-copy-light-v0.3.0.css@9e7f243039a717d02f897d7320a4c383856f8fa0` |
| Mapa | `design-system/pins/vis-002/context-v0.2.0/contextual-mapping.json@717b400da8d5590a03118e4ce58f07fcbababc48` | `context-v0.3.0/contextual-mapping.json@e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d` |
| Papel | **8 seletores** somente tema claro, token `--ds-vis002-approved-support-text-light: #705C4B` | **10 seletores** somente tema claro, `--ds-vis002c-long-copy-light: #292723` |
| Governo | paleta homologada, explícita e escopada; etapa v0.2 não mergeada | candidata de integração mais recente, não equivalência visual universal e **sem alegação de release** |
| Documentação | `docs/architecture/vis002c-p-token02b-integration-2026-10-23.md` | `docs/architecture/vis002c-v03-product-integration-2026-10-24.md` |

As dez aplicações da main abrangem os oito seletores históricos e duas áreas adicionais, mantendo dark theme; **a mudança de tonalidade é deliberada**, não uma regressão a tratar por merge cego. O `designSystem.decisionGitBlob` base `63b60f8d...` é o mesmo mas a versão/contrato dos consumidores mudou. Não importar versão mais antiga por simples proveniência de CSS.

As três branches do grupo VIS-002C **continuam HOLD** e não entram nesta poda:
- `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9850dc194f68b16fa097c6691c06b`: cinco commits próprios após a PR #231, com 19 caminhos de diff; não é ancestral da PR e precisa reconciliação de intenção v0.2→v0.3.
- `integration/consolidated-arc03c-vis002c-token-20261023@c239012c126c9b3e2c477778ea4b2d37b74c963f`: diverge da fonte v0.2 (16 commits exclusivos do consolidado versus 29 no token; merge-base `840a0cda361b3ce215fc934badc26df72dffc6e8`). Seu documento fala em gating/integração ARC-03C; requer inspeção independente de HTML gerado e fontes.
- `integration/vis002c-contextual-support-v02-20261024@a285a2dc6f543f33f45615ba653a296236f8b3ac`: também diverge da fonte v0.2 (23 commits exclusivos do support versus 29 no token; merge-base `840a0cda361b3ce215fc934badc26df72dffc6e8`). Seu documento exige rastreabilidade dos templates `architecture/pages/`, build e manifesto. Não presumir que alterações nas fontes de geração estejam cobertas pela distribuição v0.3 atual.

**Próximo recorte recomendado:** auditoria comparativa **`architecture/pages/` → `app/` gerado** das duas fontes divergentes contra a main; transferir apenas evidência/teste ou implementação que comprove intenção autorizada mais recente e passe gates ARC/visual. Não aposentar fontes divergentes até provas independentes; evitar preview Netlify salvo necessidade justificada.

## Gate de segurança do bloco

`tests/test_development_pr_ancestors_vis002c.py` valida com `git` de histórico completo: nav como ancestral da PR #238 (quatro commits seguintes), token VIS como descendente da PR #231 (cinco commits próprios), direção invertida explicitamente rejeitada; pin de SHA do único alvo de tag; `main`/development v0.3 e código de runtime exatamente inalterados; preservação de `v0.1.0`; presença de dois corpos divergentes; leitura do mapa de seletores e CSS por `git show` sem executar scripts legados. A workflow usa Python puro, sem tokens, grants, playwright ou Netlify.

**Autorização limitada:** depois de gate auxiliar e destino PASS, manifesto *novo* de lote AB poderá arquivar/taguear somente a referência ancestral de navegação e remover a auxiliar consumida, mediante AUDIT+APPLY/readback. Não mover `main`, não fechar PRs, não tratar o status de staging/auth como verificado.
## Errata de ancestralidade (gate de segurança)

A ferramenta de comparação GitHub mostra `status=behind` quando o **head** está *behind* da base. Na primeira triagem interpretamos equivocadamente `VIS→PR231: behind 5` como se o head da PR fosse cinco commits depois da fonte. `git merge-base --is-ancestor` na workflow provou a inversão. A correção não enfraquece o gate: a fonte v0.2 **não deve ser apagada** nesta onda. A falha inicial é relevante e fica registrada como prova de *fail-closed*, não como regressão no produto.

## Execuções do gate e escopo aprovado

- [Primeiro run #40747792240](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40747792240): **FAIL** na suposição de ancestralidade VIS→PR231; nenhuma operação de aposentadoria foi feita. O erro de leitura do comparador GitHub está documentado acima.
- [Gate corrigido #40748058761](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40748058761): **PASS**: confirma nav→PR238, PR231→token v0.2, mantém duas branches VIS divergentes em HOLD, valida v0.3 e impede importações de runtime. Resultado offline sem testar deploy, alterações em SQL ou identidade.
- **Elegível ao lote AB:** somente `fix/config-stage-nav-grid-track-20261025` com tag de preservação e a auxiliar ancestral após FF. `integration/vis002c-p-token-02b-v2-20261023` NÃO é elegível e não deve constar do manifesto. Manter as 12 PRs.

## Gate após fast-forward no destino

A auxiliar `integration/34-pr-ancestors-vis002c-20261028@761c8210e86b062a1c77cf22ea058933e1ef26ea` foi promovida para development por fast-forward SHA-exato desde `5c6e0be9a0d3530d08477e15e09374c2afc264bc`. Diff: **somente relatório, teste de proveniência e workflow**, nenhum arquivo de runtime ou servidor.
O [gate no destino #40748235137](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40748235137) concluiu **PASS**, repetindo os cinco testes de proveniência, versão visual e HOLD de VIS. O lote AB a seguir poderá mencionar unicamente a branch de navegação como `archive-diverged` e a auxiliar como `auxiliary-ancestor-development`. Os erros anteriores #40747792240/#40748018901 permanecem identificados e foram corrigidos antes do FF.
