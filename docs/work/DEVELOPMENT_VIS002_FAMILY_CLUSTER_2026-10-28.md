# Bloco 19 — reconciliação de cinco fontes VIS-002, uma auxiliar (28/10/2026)

## Justificativa da mudança de granularidade

As cinco branches têm o mesmo domínio (texto contextual público VIS-002) e código antigo sobreposto. São tratadas em **uma só auxiliar** com um único pacote de evidências e gates; isso é diferente dos lotes de higiene, cujo executor atual limita 1–3 refs por execução como mecanismo fail-closed. Não se deve usar o tamanho do lote de remoção como justificativa para gerar uma auxiliar por fonte.

## Cinco fontes pinadas e intenção atual

`audit/public-text-contrast-coverage-20261022@ace851004713f92b4425e5832c6c892825814f0a`; `fix/vis002c-public-text-contrast-20261022@007fc8e0ca8d9366efd0c9b5c7adf0da1a5325e5`; `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9850dc194f68b16fa097c6691c06b`; `integration/consolidated-arc03c-vis002c-token-20261023@c239012c126c9b3e2c477778ea4b2d37b74c963f`; `integration/vis002c-contextual-support-v02-20261024@a285a2dc6f543f33f45615ba653a296236f8b3ac`.

A intenção posterior de 24/10 aplica texto corrido `#292723` em dez seletores scoped, preserva tema escuro e exceções, e **substitui** as versões `#705C4B` desses mesmos contextos. O contrato fonte `design-system/pins/vis-002/context-v0.3.0/contextual-mapping.json` permanece `SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED`: nenhum deploy ou autorização implícita para generalizar a paleta.

## Preservação seletiva e guards

Os 14 objetos históricos de documentação, teste e CSS experimental estão sob `docs/reconciliation/vis002/legacy/` **via blobs Git exatos**, sem mover nada para `app/` e sem executar scripts antigos. `cluster.json` fixa todos os SHA de origem, arquivo e blob. O teste Python confirma que cada blob arquivado coincide com `SOURCE_SHA:original_path` e prova que os oito contextos v0.2 são subconjunto dos dez atuais; adicionalmente verifica que o CSS carregado só distribui `#292723` em tema claro. Esses registros são evidência temporal, não instruções de implementação.

As coberturas anteriores v0.1↔v0.2 same-DOM e raster full-page passam a ser **históricas**; a suite atual `tests/vis002c-v03-scoped-raster.mjs`, `tests/ci/vis002-context-browser.mjs` e pin v0.3 permanecem autoritativas. Lacuna prática recuperada: `tests/ci/vis002-family-state-browser.mjs` verifica, em Chromium/WebKit, 390/1366, claro/escuro, o CTA de Cozinha, aviso condicional de Sala, retorno ao CTA e hero visível após assentamento, sem aplicar CSS ou alterar o runtime.

## Fronteiras e gates

A auxiliar **não** inclui nem aposenta `architecture/p-token-02b-contextual-copy-20261022`, pois é HEAD da PR #231 aberta. Os outros cinco HEADs permanecem HOLD até verificação de contribuições completas, tags archive, roster/PR/main e auditoria semântica; arquivo seletivo não equivale a preservar todo o histórico de código. O primeiro gate executa 4 testes de proveniência, 3 testes de pin e 8 cenários de navegador. Só integrar por FF lease se PASS, depois repetir em development.

**Política daqui em diante:** auxiliar por família/coorte semântica; gates específicos por risco; aposentadorias em lotes pequenos, sem modificar o executor até haver necessidade comprovada de ampliar o limite.
