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
