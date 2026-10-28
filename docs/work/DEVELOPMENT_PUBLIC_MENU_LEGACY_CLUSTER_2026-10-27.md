# Bloco 14 — reconciliação do menu público P-COMP-01 e precursor (27/10/2026)

## Contrato vigente e regra de precedência

Em caso de implementações concorrentes da mesma função, preferir a mais recente **que realize a última intenção declarada** e conservar melhorias antigas exclusivas mediante extração seletiva; teste de regressão continua obrigatório. Aqui: controlador único `app/landing/header-menu.js` governa os menus de `/`, `/about/`, `/how-it-works/` e `/viewer/`, inclusive o header específico NAV-005 do Viewer, que **não é** reconstruído pelo compilador ARC-03C. Navegação por teclado/Enter leva foco ao primeiro item; Escape fecha e devolve foco; clique externo/link fecha; ARIA e tema persistem; não duplicar scripts.

## Fontes e datas verificáveis

| Origem imutável | Código de menu | Evidência exclusiva | Precedência |
| --- | --- | --- | --- |
| `experiment/shared-public-header-controller-20261020@fdeb931af285f6cf76795ccdd50a8b75d0f25aef` | `5b741a7734663105bc2cde66c33846bc4edd8db0`, **20/10 22:25 UTC**, primeiro compartilhamento com foco por teclado, Escape | Gate isolado e teste antigo `tests/public-header-controller-gate.mjs` com 152 linhas, 3 rotas públicas; CSS/HTML do período | **SEMANTIC_SUPERSEDED** apenas após prova da versão posterior e recuperação de DAG por tag |
| `architecture/p-comp-01-public-menu-20261021@4ba9384733a8cb46ad8a6c7c8ef3b9aebe25cd93` | `e36bf73eb3b3d6041473ea8c0c174c1802d1736e`, **21/10 23:48 UTC**, refinado nas quatro rotas | Gate P-COMP, teste de **206 linhas**: geometria e paridade raster, tolerância explícita para ruído 1/255, armazenamento de relatório | **SEMANTIC_SUPERSEDED** após provar que controles relevantes seguem no destino |
| `development` (posterior) | `2b6dd39b609a11137cc440ae3936ea8b6141620e`, **24/10 02:55 UTC**, reconciliação com ARC-03C | `tests/public-header-controller-gate.mjs` tem 12093 bytes (vs 12069 P-COMP), conserva análise raster, normaliza apenas whitespace entre tags; `tests/ci/public-navigation-semantic-browser.mjs` testa 48 casos reais e separação NAV-004/NAV-005 | **KEEP_NEWER** — última intenção de publicação e navegação |

A versão atual do `app/landing/header-menu.js` conserva `menu-open`, `aria-expanded`, `aria-label`, foco por teclado e Escape, fechamento por clique externo e por link, sem o JS inline antigo nas páginas. Controle de tema, preços, DTO e autenticação são fora de escopo. A diferença de bytes é esperada: melhorias mais recentes no compilador/markup, não uma licença para reverter arquivos.

## Prova proposta, limites e destinos

O auditor read-only `tools/development_public_menu_semantic_audit.py` exige **todas as contribuições originais de cada branch**, SHA exato, cronologia de commits, controlador atual único em 4 páginas, contrato ARC-03C de 3 páginas e exclusão expressa do Viewer, recursos e teste diferencial raster P-COMP preservados. Usa SHA pinado em vez de depender das refs históricas em workflow.

O gate `.github/workflows/development-public-menu-legacy-semantic.yml` roda o verificador estático, `npm run pages:check`, testes ARC-03C, contrato de cutover e **48 cenários** Chromium/WebKit de navegação pública em três larguras e dois temas, sem Netlify nem credenciais. O gate serve apenas páginas locais, não cobre autenticação real ou versões antigas de iPad. Prova de comportamento não equivale a paridade de pixels do passado; a intenção visual mais recente tem autoridade maior do que o snapshot antigo.

A origem experimental e a P-COMP são **candidatas à aposentadoria**, somente se o gate passar primeiro na auxiliar e depois em `development`, com auditoria fail-closed do manifest, proteções Git, preservação de 12 PRs e criação prévia das tags:
- `archive/m2d/public-menu-experiment-fdeb931a -> fdeb931af285f6cf76795ccdd50a8b75d0f25aef`
- `archive/m2d/public-menu-pcomp-4ba93847 -> 4ba9384733a8cb46ad8a6c7c8ef3b9aebe25cd93`

Branch auxiliar `integration/14-public-menu-controller-reconcile-20261027` deve ser absorvida por FF com lease, podendo então ser retirada por ancestralidade. A branch `architecture/arc03-primary-header-fragment-prototype-20261022@e459b9bd85c4e9c8bb96813ae6758789de75dc13` **permanece HOLD**: seu compilador experimental não foi provado equivalente ao publicador atual. `main`, PR #34, assets DS-02 e demais PRs são intocáveis nesta rodada.

**Status inicial:** auditoria e browser gate a validar. Não afirmar remoção, homologação visual ou equivalência de ARC-03 antes de evidência.
