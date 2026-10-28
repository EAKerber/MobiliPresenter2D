# Bloco 34 — duas DAGs ancestrais de PR e triagem VIS-002C (28/10/2026)

**Escopo:** prova offline, sem código de produto, autenticação, Netlify, banco, CSS transplantado ou deploy. Autoridades: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; baseline `development@5c6e0be9a0d3530d08477e15e09374c2afc264bc`. O lote de higiene anterior AA foi CONSUMED e não será reexecutado.

## Duas referências candidatas a arquivamento, não a merge

1. `fix/config-stage-nav-grid-track-20261025@dbfbd9a7bca0e9f581e5d8ac4a765e01829d6ce9` é **ancestral estrito** de `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103`, head aberto da PR [#238](https://github.com/EAKerber/MobiliPresenter2D/pull/238). `merge-base` é o SHA original, **4 commits subsequentes** no head da PR, zero commits exclusivos na fonte. O diff fonte→PR modifica seis arquivos de CI/fixture e não acrescenta arquivo de UI; a versão de navegação da fonte **não prevalece** sobre a autoridade atual da main. A PR #238 continua HOLD por identidade do deploy autenticado e alterações próprias de runtime/SQL/Netlify. Preservar DAG por tag `archive/m2d/config-nav-grid-pr238-dbfbd9a7`, não executá-la e não tocar na PR.
2. `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9850dc194f68b16fa097c6691c06b` é **ancestral estrito** da PR [#231](https://github.com/EAKerber/MobiliPresenter2D/pull/231), `architecture/p-token-02b-contextual-copy-20261022@afb80965336083209eac93e2729de77170524ee5`. `merge-base` é o SHA original, **5 commits posteriores** no head da PR, zero commits exclusivos na fonte. **Importante:** o *tree* atual da PR não mantém todos os arquivos v0.2 do ancestral; ancestralidade sozinha NÃO significa equivalência de produto. Preservar SHA íntegro por tag `archive/m2d/vis002c-token-v02-pr231-34a305c1`; não transformar a fonte v0.2 em CSS vigente e não encerrar PR #231.

Nenhuma destas duas branches encabeça PR aberta; as doze PRs continuam protegidas. Pelo contrato do executor bounded, cada alvo requer `archive-diverged`, `snapshotPath`, `semanticGate`, tag apontando diretamente ao SHA e verificação exata de SHA e roster remoto. A auxiliar 34, após integração FF, só poderá ser removida como ancestral de development.

## Comparação causal VIS-002C (não confundir versões e intentos)

| Artefato | Origem 23/10 v0.2 | `main`/ `development` v0.3 (24/10) |
|---|---|---|
| Distribuição | `approved-contextual-support-text-v2.css@39591876eb0a563553214dcd64062258c7eb35c0` | `vis002c-long-copy-light-v0.3.0.css@9e7f243039a717d02f897d7320a4c383856f8fa0` |
| Mapa | `design-system/pins/vis-002/context-v0.2.0/contextual-mapping.json@717b400da8d5590a03118e4ce58f07fcbababc48` | `context-v0.3.0/contextual-mapping.json@e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d` |
| Papel | **8 seletores** somente tema claro, token `--ds-vis002-approved-support-text-light: #705C4B` | **10 seletores** somente tema claro, `--ds-vis002c-long-copy-light: #292723` |
| Governo | paleta homologada, explícita e escopada; etapa v0.2 não mergeada | candidata de integração mais recente, não equivalência visual universal e **sem alegação de release** |
| Documentação | `docs/architecture/vis002c-p-token02b-integration-2026-10-23.md` | `docs/architecture/vis002c-v03-product-integration-2026-10-24.md` |

As dez aplicações da main abrangem os oito seletores históricos e duas áreas adicionais, mantendo dark theme; **a mudança de tonalidade é deliberada**, não uma regressão a tratar por merge cego. O `designSystem.decisionGitBlob` base `63b60f8d...` é o mesmo mas a versão/contrato dos consumidores mudou. Não importar versão mais antiga por simples proveniência de CSS.

Outras duas branches do grupo **continuam divergentes/HOLD** e não entram nesta poda:
- `integration/consolidated-arc03c-vis002c-token-20261023@c239012c126c9b3e2c477778ea4b2d37b74c963f`: diverge da fonte v0.2 (16 commits exclusivos do consolidado versus 29 no token; merge-base `840a0cda361b3ce215fc934badc26df72dffc6e8`). Seu documento fala em gating/integração ARC-03C; requer inspeção independente de HTML gerado e fontes.
- `integration/vis002c-contextual-support-v02-20261024@a285a2dc6f543f33f45615ba653a296236f8b3ac`: também diverge da fonte v0.2 (23 commits exclusivos do support versus 29 no token; merge-base `840a0cda361b3ce215fc934badc26df72dffc6e8`). Seu documento exige rastreabilidade dos templates `architecture/pages/`, build e manifesto. Não presumir que alterações nas fontes de geração estejam cobertas pela distribuição v0.3 atual.

**Próximo recorte recomendado:** auditoria comparativa **`architecture/pages/` → `app/` gerado** das duas fontes divergentes contra a main; transferir apenas evidência/teste ou implementação que comprove intenção autorizada mais recente e passe gates ARC/visual. Não aposentar fontes divergentes até provas independentes; evitar preview Netlify salvo necessidade justificada.

## Gate de segurança do bloco

`tests/test_development_pr_ancestors_vis002c.py` valida com `git` de histórico completo: ancestralidade estrita de ambas refs em PRs distintas; quatro e cinco commits de avanço; pin de SHA de tags-alvo; `main`/development v0.3 e código de runtime exatamente inalterados; preservação de `v0.1.0`; presença de dois corpos divergentes; leitura do mapa de seletores e CSS por `git show` sem executar scripts legados. A workflow usa Python puro, sem tokens, grants, playwright ou Netlify.

**Autorização limitada:** depois de gate auxiliar e destino PASS, manifesto *novo* de lote AB poderá arquivar/taguear somente as duas referências ancestrais e remover a auxiliar consumida, mediante AUDIT+APPLY/readback. Não mover `main`, não fechar PRs, não tratar o status de staging/auth como verificado.