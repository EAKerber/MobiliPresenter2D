# Reconciliação semântica 10 — fallback de imagens com texto alternativo (27/10/2026)

## Corrigindo a classificação inicial de ausência

A varredura por identidade de blob em `DEVELOPMENT_SEMANTIC_RECONCILIATION_2026-10-27.md` classificou `a11y/image-failure-scalable-placeholder-20261025@6840d8986e44a7860b541e6becb3b5373ef48c09` como cinco caminhos diferentes, portanto não substituídos por SHA nos mesmos arquivos. **Isso NÃO significava que a função estivesse ausente.** Ao ler o JavaScript da página publicada, foi encontrado um controlador reutilizável implementado posteriormente: `app/core/image-fallback.js` (blob `5307a5b2c9d4bf813a116aa7a0490d64e53cfadf`). O mesmo script também é carregado na landing.

### Mapeamento de proveniência por contrato

| Contrato / efeito | Implementação histórica | Destino atual | Classificação |
|---|---|---|---|
| Imagem com erro (evento `error`) | Handler inline em `app/how-it-works/how-it-works.js` | Listener central em `app/core/image-fallback.js` | **Coberto** |
| Falha em imagem já em cache (`complete && naturalWidth===0`) | Sim, no handler local | Sim, no controlador central | **Coberto** |
| Ocultar imagem quebrada / mostrar placeholder | `hidden` alternado | `hidden` alternado | **Coberto** |
| Mensagem e `aria-label` com texto `alt` | `Imagem indisponível: ...` | Mesma mensagem, `role=img` explícito | **Coberto** |
| Estrutura de placeholder | Embutido no `figure.study-art` | `data-image-fallback` na moldura interna `.study-art-media` | **Substituído por escopo mais preciso** |
| Restauração ao voltar a carregar (`load`) | Não havia | Handler central restaura a imagem e remove estados ARIA | **Capacidade adicional** |
| Reexecução sem ouvintes duplicados | Não havia | `data-image-fallback-bound` | **Capacidade adicional** |
| Imagens decorativas sem alt significativo | Handler da imagem de estudo | Genérico ignora imagem decorativa | **Capacidade adicional** |
| Abrangência | Uma ilustração de estudo | **18 quadros na página Como funciona + 1 na landing** | **Cobertura ampliada** |
| Legibilidade no celular / tema | Fallback de uma ilustração | Testes de geometria, contraste 4.5:1, overflow, teclado | **Cobertura ampliada** |

A fonte era um conjunto de 5 caminhos: `app/how-it-works/how-it-works.css`, `app/how-it-works/how-it-works.js`, `app/how-it-works/index.html`, `architecture/generated/primary-pages.manifest.json` e `architecture/pages/how-it-works.page.html`. Nenhuma dessas versões antigas deve substituir o gerador ARC-03C atual, os estilos, o JS local de acordeão ou a projeção pública.

## Provas introduzidas

- Ferramenta read-only `tools/development_a11y_fallback_semantic_audit.py` fixa a main, o commit da origem, os **cinco caminhos** da contribuição, e prova que a única diferença entre o JavaScript da página na origem e no destino é o handler que saiu para controlador central. O verificador exige explicitamente os contratos de erro, cache, acessibilidade, novo `load`, idempotência, ordem dos scripts e moldura interna de imagem no HTML gerado.
- Workflow `.github/workflows/development-a11y-semantic-fallback.yml`: 2 jobs independentes (proveniência/contrato Python + unit Node; site construído localmente + Playwright Chromium/WebKit). O browser gate percorre 2 navegadores × 2 larguras × 2 temas × 2 rotas = **16 cenários**, total de **152 situações de imagem** com erro e recuperação. Não faz Deploy Preview e não acessa dados administrativos.
- A primeira rodada de prova estática falhou por pressupor que `data-image-fallback` ainda estava no `figure`. Inspeção confirmou migração intencional do marcador para `.study-art-media.image-fallback-frame`. O verificador foi corrigido para exigir ambas as versões exatas, sem omitir o gate funcional. Primeira rodada de browser permaneceu PASS.

## Decisão de reconciliação

A funcionalidade **já existe no destino**; a forma atual é um superset explícito do recorte antigo. **Não copiar o handler antigo**, nem duplicar código, componentes ou marcações. Se ambas as suites verdes forem confirmadas na integração, o próximo gate de higiene pode classificar a branch como `SEMANTIC_SUPERSEDED` e arquivar sua DAG inteira com a tag `archive/m2d/a11y-image-fallback-6840d898`, apontando para `6840d8986e44a7860b541e6becb3b5373ef48c09`, antes de remover a referência de branch. A prova de equivalência funcional continua dependente de execução offline Chromium/WebKit; não substitui inspeção visual humana em dispositivos reais.

**Política:** `main` permanece inalterada. As 12 PRs abertas, arquivo original DS-02 e PR #34 continuam em HOLD onde aplicável. Nenhum deploy Netlify, banco ou recurso gráfico será modificado.

## Gate final da reconciliação de funcionalidade

- [Actions #40581205414](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40581205414): **dois jobs PASS** no SHA de código/provas `0f752e6d09623579d3db87a7f65d6eabbc183457`. O script `development_a11y_fallback_semantic_audit.py` confirmou o escopo dos cinco arquivos históricos e a equivalência de contrato por caminhos diferentes.
- O browser job executou o build estático atual, `pages:check` e `tests/public-image-fallback-browser.mjs` em `chromium + webkit`, 390/1366px, light/dark, duas rotas. **16 cenários / 152 frames** testaram falha, semântica ARIA, geometria, overflow, contraste, navegação de fallback rolável e recuperação após `load`.
- Artifact publicado: `development-a11y-image-fallback-40581205414`, ID `12769977054`.
- Registros de correção: a primeira rodada [#40581081311](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40581081311) tinha PASS no browser, mas rejeitava o novo elemento pai do marcador no gate estático; a correção demonstrou que o `data-image-fallback` antigo estava em `figure.study-art` e agora fica na moldura interna, sem reduzir cobertura. Nova execução passou nos dois jobs.
- **Decisão após o gate:** `SEMANTIC_SUPERSEDED_CONFIRMED`; nenhum arquivo de runtime precisa ser mudado. Remoção de branch, se executada em etapa separada, depende de tag de recuperação e do manifesto de higiene, nunca do merge deste relatório isoladamente.


## Fechamento e retenção da DAG — onda D2

A reconciliação foi absorvida em `development` por **fast-forward com lease**, integrando apenas a documentação, os testes de proveniência e o workflow offline. O código do Viewer/Admin e a implementação genérica do fallback não foram modificados. Gates no HEAD de development: [#40581823574](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40581823574) PASS e [#40582048769](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40582048769) PASS.

- O executor `tools/development_retirement_batch.py` foi ampliado de maneira reutilizável: `semanticGate` exige ID, nome exato, SHA de execução ancestral da development e resultado `success` em GitHub Actions; `auxiliaryRefs` só pode incluir refs `integration/` explicitamente pinadas e cuja ponta seja ancestral da development. A ferramenta não elimina refs por prefixo.
- O primeiro audit de higiene [#40582741013](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40582741013) fez o comportamento correto: **FAIL-CLOSED**, pois o workflow de prova ainda apontava para a branch histórica. Substituído o fetch nominal pelo fetch de commit SHA imutável; [gate após correção #40582867385](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40582867385) PASS.
- [Actions #40582950464](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40582950464) **AUDIT PASS + APPLY PASS** da onda `dev-20261027-a11y-semantic-aux-d2`. Artifacts de auditoria `12770123137` e aplicação `12769169430`. Antes de deletar a branch histórica, foi criada e confirmada a tag `archive/m2d/a11y-image-fallback-6840d898 -> 6840d8986e44a7860b541e6becb3b5373ef48c09`. A auxiliar `integration/10-a11y-fallback-semantic-reconcile-20261027@5154004be71c1cd75069f0ca64ab5d91c3a95b99` foi deletada como ancestral da development, sem nova tag.
- Readback independente: **57→55 branches** (53 históricas + main + development), **12 PRs abertas**, `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` intacta. Archivo DS-02 e PR #34 intactos, nenhum deploy Netlify. A onda D ficou registrada em `ops/development-retirement-history.json`.
