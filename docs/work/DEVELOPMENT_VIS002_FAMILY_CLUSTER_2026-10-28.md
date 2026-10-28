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

## Destino validado e lote M (somente duas fontes sem PR)

- [Gate auxiliar #40676957154](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40676957154) **PASS**: cinco SHA fontes e 14 blobs históricos exatos, 4 testes de proveniência, 3 testes do pin atual, 8 estados de disponibilidade reais Chromium/WebKit (390/1366, light/dark), `pages:check` PASS. FF com lease para `development@2c7c4ed68744bb4f6370dc808ed84c1716901802`. [Gate development #40677120764](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40677120764) **PASS**, mesmos critérios.
- A auditoria de 22/10 `audit/public-text-contrast-coverage-20261022@ace851004713f92b4425e5832c6c892825814f0a` tem patch experimental e gates sobre cores superadas. Preservação integral da DAG antes de excluir: `archive/m2d/vis002-audit-ace85100` para `ace851004713f92b4425e5832c6c892825814f0a`; auditor público atual `tests/ci/public-text-contrast-semantic.mjs` adaptado, relatórios e CSS candidato históricos retidos por blob.
- A correção de 22/10 `fix/vis002c-public-text-contrast-20261022@007fc8e0ca8d9366efd0c9b5c7adf0da1a5325e5` também usava cor temporal `#705C4B` nos cinco contextos antigos. Tag obrigatória `archive/m2d/vis002-fix-007fc8e0` para `007fc8e0ca8d9366efd0c9b5c7adf0da1a5325e5`; três testes históricos e documento preservados byte a byte, enquanto os dez contextos v0.3 e estados reais são guardados pelos testes atuais. Não reaplicar CSS antigo.
- A auxiliar `integration/19-vis002-cluster-semantic-20261028@2c7c4ed68744bb4f6370dc808ed84c1716901802` é ancestral de development e também será removida somente após verificação SHA. **HOLD:** outras três branches do mesmo cluster por sobreposições ARC-03C/v0.2 não analisadas até o nível de aposentadoria, PR #231 com HEAD ativo e todos os ramos de segurança/DTO. Lote M tem até três targets; manifesto é de uso único.

## Gate M consumido — duas fontes históricas encerradas após consolidação de cinco

[Actions #40677382474](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40677382474) **AUDIT+APPLY PASS** (28 testes de seleção; exatos SHA, tag antes de delete e readback). O lote retirou somente `audit/public-text-contrast-coverage-20261022@ace851004713f92b4425e5832c6c892825814f0a`, `fix/vis002c-public-text-contrast-20261022@007fc8e0ca8d9366efd0c9b5c7adf0da1a5325e5` e a auxiliar `integration/19-vis002-cluster-semantic-20261028@2c7c4ed68744bb4f6370dc808ed84c1716901802` (ancestral da development). Tags `archive/m2d/vis002-audit-ace85100 -> ace851004713f92b4425e5832c6c892825814f0a`, `archive/m2d/vis002-fix-007fc8e0 -> 007fc8e0ca8d9366efd0c9b5c7adf0da1a5325e5` verificadas por consulta remota. Artifacts audit `12811251744`, apply `12810728552`. O [gate de repetição #40677382533](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40677382533) **PASS** na nova development antes da poda.

**Inventário comprovado:** 48→45 branches; 43 refs históricas, 17 das 60 aposentadas, 10 auxiliares aposentadas, main e development, 12 PRs intactas. O manifest M foi consumido, **não reexecutar**. Três outras fontes v0.2 e consolidada, e a PR #231, seguem HOLD. Snapshot e tags não autorizam publicar a v0.3 nem validar os casos visuais não inspecionados.
