# Bloco 11 — reconciliação por intenção e recência, acordeões em Como funciona

Data: 27/10/2026. Política: [DEVELOPMENT_SEMANTIC_RECONCILIATION_2026-10-27.md](DEVELOPMENT_SEMANTIC_RECONCILIATION_2026-10-27.md#critério-homologado-de-precedência-instrução-do-usuário-de-27102026).

## Escopo, versões, intenção

**Objetivo declarado:** corrigir a aparência em que a abertura de um card do tipo `<details>` faz seus irmãos, ainda fechados, parecerem igualmente abertos/esticados em `/how-it-works/`. Preservar a interação nativa independente com mouse, Enter e Espaço e os layouts responsivos; não criar estado global de expansão que force um só card aberto.

**Candidatas e cronologia de origem (datas de commit Git, UTC):**
- Histórico `fix/how-it-works-accordion-grid-20261021@6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b`: CSS do grid corrigido em `72a7068da684a3397b8ec7f02b7ad530023858bf`, **21/10 13:47**. Teste inicial e verificações de WebKit em 21/10; teste aprimorado em `eedda76c6ce543974e44f95d064dde2a132e18ab`, **25/10 18:40**, serializando screenshots; ajuste final em `6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b`, **25/10 18:47**, medindo e recortando a região antes da captura (blob `42cfde7bb249bd4f20a24607a0e82e32a80dd0b3`).
- A CSS atual de `development` inclui `@media(min-width:901px){.foundation-list,.study-topics{align-items:start}}` e possui alterações posteriores para acesso, paleta VIS-002 e fallback de imagem até **26/10**. O blob de CSS atual não equivale ao histórico porque contém outras melhorias. **Preservar a CSS atual**, não restaurar a fonte antiga.
- O teste de navegador existente na `development` tinha blob `3012904473e0071b29c34ecc39f602ccb3b3c7e5`, vindo do commit `c99e73a5073625c94cf04999fad4fe1fc70cfcf3`, de **21/10 18:33**. Não incluía as melhorias do teste histórico datadas de **25/10**.

**Decisão conforme a instrução mais recente do usuário:** seleção híbrida fundamentada, não cherry-pick indiscriminado. **KEEP_NEWER** para CSS / markup de development, **EXTRACT_OLDER** para o teste mais recente *em cronologia real* que ainda estava em branch histórica. O teste histórico foi recuperado **byte a byte (blob idêntico)** em `tests/how-accordion-grid-browser-gate.mjs` na auxiliar `integration/11-accordion-latest-tests-20261027`. A comparação não transforma a branch histórica inteira em fonte de verdade do runtime.

## Gates e destinação

- `.github/workflows/development-accordion-semantic-reconcile.yml` executa sem Netlify o novo teste em Chromium e WebKit, comparando HTML/CSS e estados fechados contra o baseline imutável `1878ae1057ce7c6190e0c8cb08a1f3baadd49463`, que reproduzia o alongamento. Exercita 390/1366px × tema claro/escuro × dois grupos; exige irmãos fechados não esticados, teclado, abertura independente, ausência de erro e rastreia divergência pixel WebKit sem afirmar paridade falsa.
- **Nenhuma aposentadoria histórica será executada antes de resultado PASS no código integrado e da prova de que workflow antigo é substituído.** Preservar `fix/how-it-works-accordion-grid-20261021` via tag Git exata antes de remoção, somente via novo lote da higiene com manifest, 12 PRs, rulesets e readback.
- Arquivos não reconstruídos/alterados: `app/how-it-works/how-it-works.css`, `app/how-it-works/how-it-works.js`, `app/how-it-works/index.html`, `architecture/pages/how-it-works.page.html`, assets originais, Viewer, Admin, produção e `main`.

Estado de execução: **testes e destino ainda dependem do gate online**. Atualizar aqui com o resultado antes de declarar a reconciliação concluída.

## Compatibilidade com a página posterior e primeiro resultado

- O primeiro gate [#40608052660](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40608052660) falhou em uma condição de **comparação**, não no comportamento: o teste mais recente exigia o mesmo valor absoluto de `y` para `.study-topics` na página antiga e na página atual. Outras seções acima mudaram e moveram o componente verticalmente; suas medidas e estilos internos continuavam os mesmos no diff mostrado.
- Ajuste estritamente no teste recuperado: remover `x/y` absolutos de `closedMetrics`, mantendo altura, largura, estilos, DOM, interação independente e avaliação do navegador. A captura mais recente continua serializada e recortada, mas a coordenada de `page.screenshot({clip})` foi corrigida com `scrollX/scrollY`, porque `boundingBox()` retorna posição relativa à viewport.
- O **conteúdo exato** do teste em 25/10 é recuperável no commit `6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b`; o arquivo atualizado é uma **adaptação compatível com o site mais recente**, não mais um blob idêntico. O workflow confirma o blob histórico e os dois ajustes. Sem alteração no CSS/HTML/JS publicado e sem afirmar aprovação dos screenshots antes do gate final.


### Segundo ajuste do gate — captura abaixo da dobra

A segunda tentativa não alcançou o browser porque o checkout dentro de `mcr.microsoft.com/playwright:v1.56.0-noble` exigiu configuração explícita de `git safe.directory` antes do `git fetch` do commit histórico. O workflow foi ajustado, sem mudar a app.

A terceira tentativa [#40608367733](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40608367733) confirmou que o recorte `page.screenshot({clip})` do teste de 25/10 não era transportável para elementos que ficam abaixo da dobra: falhou com `Clipped area is either empty or outside the resulting image`. A adaptação posterior usa `locator.screenshot()` com `scrollIntoViewIfNeeded()`, verificação positiva de dimensões e capturas **serializadas** em Chromium/WebKit. Isto mantém o objetivo da correção mais nova (captura isolada e reproduzível do componente) sem seu mecanismo frágil de viewport. A lógica de teclado, independência e paridade CSS continua preservada.

**Registro de discrepância de recência:** não afirmar que o teste recuperado é idêntico ao antigo depois desta adaptação: sua proveniência é pinada por SHA; a versão atual é *derivada com reparos comprovadamente necessários*. Testes de navegador continuam obrigatórios antes de integrar ou podar.


## Gate final na auxiliar (resultado comprovado)

[GitHub Actions #40608533308](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40608533308), `PASS` em Chromium e WebKit. O gate usou o commit do teste histórico pinado `6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b`, baseline anterior ao fix `1878ae1057ce7c6190e0c8cb08a1f3baadd49463`, dois grupos, larguras 390 e 1366 e temas claro/escuro; verificou a altura dos irmãos fechados, semântica de detalhes abertos, teclado Enter/Espaço, ausência de erros, e capturas de tela dos componentes. Artifact de evidência: `accordion-semantic-40608533308` (ID `12782077690`).

A execução inicial [#40608052660](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40608052660) detectou dependência indevida da coordenada vertical `y` da página inteira. A seguinte esbarrou em `git safe.directory` no contêiner. A terceira [#40608367733](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40608367733) detectou que o recorte manual fora da viewport era inválido. Todas estas falhas foram corrigidas **apenas no teste/workflow**; o gate final passou integralmente. O mecanismo resultante mantém a captura serializada (mais recente), utiliza `locator.screenshot()` e não compara `x/y` absolutos entre páginas de gerações distintas.

**Contrato escolhido:** CSS e HTML contemporâneos de `development` (incluem melhorias mais recentes) + teste consolidado com controles mais recentes de captura e execução. A homologação original de correção de card aparentemente esticado está preservada. Esta prova é funcional automatizada em navegador; não equivale a aceite visual manual em todos os dispositivos.


## Identidade de recuperação para eventual onda E

- Ramo histórico imutável: `fix/how-it-works-accordion-grid-20261021@6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b`.
- **Nome da tag de recuperação, a criar ANTES da exclusão:** `archive/m2d/how-accordion-grid-6260df94` apontando para `6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b`. O registro desta intenção não significa que a tag já exista.
- A documentação e o workflow antigo da origem não serão copiados indiscriminadamente; o mecanismo offline em `development` implementa a mesma finalidade com o teste mais recente corrigido para a árvore atual.
- A retenção do histórico continua obrigatória até aprovação do gate em `development` e o executor de higiene concluir auditoria completa e aplicar o lease de exclusão.


## Onda E aplicada e comprovada

- **Fast-forward** da auxiliar para `development` usando lease `17fb0754c9729d16896b6793a2b685422acb1651 -> 0456909026d6a1229f4e5a692190a4f32496c0fc`; arquivo de JS/CSS/HTML do produto não sofreu alteração. [Gate em development #40608839476](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40608839476) **PASS**, com as mesmas 8 combinações navegador/largura/tema e os dois grupos, abertura independente, irmãos fechados, teclas e screenshots.
- **Higiene** [#40609050186](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40609050186): **AUDIT PASS / APPLY PASS**, artifacts `12781614106` e `12781168327`. Antes da remoção foi criada e lida de volta a tag `archive/m2d/how-accordion-grid-6260df94 -> 6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b` para reter integralmente o DAG original. Removidos a branch histórica e o auxiliar absorvido por desenvolvimento. O executor verificou roster completo, 12 PRs, protections/rulesets e SHA leases.
- Estado pós-onda: **54 branches** (52 históricas + `main` + `development`), 8 das 60 fontes originais aposentadas, 2 auxiliares integradas e retiradas, 12 PRs abertas, sem deploy Netlify.
- Historial durável: `ops/development-retirement-history.json`, quinta onda E. O workflow do scanner passa a reagir também a alterações do ledger de aposentadorias para repetir automaticamente o inventário de sobreviventes. A recência de implementação e de intenção continua sendo analisada separadamente do mero hash de arquivo.
