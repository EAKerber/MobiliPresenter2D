# Bloco 05 — proveniência e contratos de navegação pública (27/10/2026)

## Escopo homologado

A consolidação `main` estável e `development` de testes/integráveis não deve importar indiscriminadamente HEADs de branches antigas. Comparar o conteúdo funcional e as decisões homologadas (NAV-004 header primário; NAV-005 Viewer secundário), mantendo ARC-03C como fonte de HTML gerado para `/`, `/about/`, `/how-it-works/`. Viewer permanece deliberadamente fora de ARC-03C. Não modificar a tipografia, a estrutura visual, auth, dados públicos ou Netlify neste bloco.

Base de auditoria: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, `development@18f5401922b32a8264c51115d4fe457021dabff6`; inventário completo em `docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json`.

## Sete refs históricas — matriz de reconciliação

| Origem fixa | Situação comprovada | Destino e cautela |
|---|---|---|
| `architecture/arc03-primary-header-fragment-prototype-20261022@e459b9bd85c4e9c8bb96813ae6758789de75dc13` | Protótipo antigo divergente: `scripts/compile-primary-pages.mjs` era blob `951aa15839d14d8af7f6d615127bd99a892b611d`, enquanto compilador autoritativo atual é `0ce09d056e8c59a8703c12ed6b1e2ca6e1eb8023`. | `ARC03C_ALREADY_IN_PRODUCT`: validar gerador atual, não transplantar protótipo. |
| `architecture/arc03c-static-page-build-20261022@fbd00a9628c81b4902a8c679abb7ac72e93ca549` | Nenhum commit à frente da main no inventário; já ancestral. | `ANCESTOR`: não extrair nem mesclar novamente. |
| `architecture/p-comp-01-public-menu-20261021@4ba9384733a8cb46ad8a6c7c8ef3b9aebe25cd93` | O controlador público já existe; antigo blob `60a459a6456347343a0f3d0ad93827e93e47ff2b` e atual `ff6afb51007e659bffd573fa2d6a83fd5df8db51` têm diferenças de redação/forma. | `FUNCTIONAL_EQUIVALENCE_NEEDS_BROWSER_GATE`; não mesclar UI/HTML legado. |
| `experiment/shared-public-header-controller-20261020@fdeb931af285f6cf76795ccdd50a8b75d0f25aef` | Outra implementação histórica do controlador, blob `b9a8a0a02437f5e6d1f9ebaab471bbee287a19cf`. | `OVERLAPPING_PROTOTYPE`: uma fonte de JS ativa; conferir inicialização única e navegação. |
| `experiment/ui-declarative-landing-benefits-20261020@176cd0931056ad6814317f3aa580a624f6f2e871` | Touches landing/data/composição e CSS/HTML; 22 commits à frente na fotografia do inventário. | `HOLD_OTHER_CLUSTER`: requer reconciliação de conteúdo e dados, sem mesclar em NAV. |
| `fix/how-it-works-accordion-grid-20261021@6260df944b6b82f3a86d9eed4d9bc3eacd8bc48b` | Suíte `tests/how-accordion-grid-browser-gate.mjs` já existe com mudanças: antigo blob `42cfde7bb249bd4f20a24607a0e82e32a80dd0b3`, atual `3012904473e0071b29c34ecc39f602ccb3b3c7e5`. O CSS antigo (`52f36d212d286ef5157a20fc822cbfab25e09b2f`) difere do atual (`c38677d7950b46d7e7027935371dec72d726bcb4`). | `BEHAVIOR_ALREADY_PRESENT`: testar expansão independente sem transplantar CSS. A origem divergente permanece intacta. |
| `fix/mobile-menu-scene-stacking-20261019@b81308a22c2a9d281037306f5ebf9eecb521d15e` | Um único commit sobre `app/styles.css` antigo, com 187 commits de atraso no inventário. | `HOLD_CSS`: não incorporar estilo global anterior sem diff de impacto atual. |

## Contratos vivos (não provas por igualdade com a main)

- `architecture/fragments/primary-header.routes.json@7d2027e4701c80e93b4b940730e34756fe94fc12` estabelece 3 rotas, ativa `Ambientes` na landing e `Quem somos`/`Como funciona` nas respectivas páginas; `/viewer/` é explicitamente excluído.
- `app/about/index.html@5124d3d930073fdfad1a8602cca999ea3413cd5e` já carrega `/landing/header-menu.js` com `defer`, além de skip link `#main`. O comportamento móvel deve ser aferido nos navegadores, não presumido pela presença do script.
- `app/landing/header-menu.js@ff6afb51007e659bffd573fa2d6a83fd5df8db51`: controlador único com teclado, Escape, fechamento após clique em link, click-away e atributos de acessibilidade.
- O Viewer usa `viewer-header`, sem `aria-current=page` no menu, e mantém **Ambientes → tema → menu** no header. Os headers das três páginas primárias são gerados por ARC-03C; é errado trocar seu HTML manualmente.
- O teste legado `tests/public-header-controller-gate.mjs` é diferencial de 2 árvores HTML e snapshots de pixels. Como o código já existe na base atual, comparar main a development sem mudanças de runtime seria tautológico. Em vez disso, `tests/ci/public-navigation-semantic-browser.mjs` testa **48 cenários funcionais** (4 rotas × 3 larguras [390,768,1366] × 2 temas × Chromium/WebKit), independentemente de igualdade de screenshots: unicidade do controlador, aria-current contextual, foco por teclado, Escape, click-away, links, aria-expanded, tema, Viewer NAV-005 e cards exclusivos de Como funciona.

## Gates para absorção incremental

Auxiliar de bloco: `integration/05-navigation-contracts-20261027`, criada de `development@18f5401922b32a8264c51115d4fe457021dabff6`. Alterações permitidas inicialmente: somente teste, workflow **de localhost sem Netlify** e esta proveniência. `node --test tests/arc03c-source-authority.test.mjs`, `npm run pages:check`, teste estático de rotas e browsers 48/48 Chromium/WebKit. Não declarar integração antes dos gates PASS na auxiliar e na development.

O inventário é seletivo, **não equivale a absorver os sete HEADs históricos**. Não fechar PRs ou excluir refs; para qualquer futura poda divergente exigir retenção DAG com tags protegidas e reconciliação de proveniência. O gate visual/funcional em dispositivos reais é distinto dos testes de localhost.
