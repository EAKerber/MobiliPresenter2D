# CI BASELINE V5 NAV CLEAN — triagem de oito artefatos (28/10/2026)

A autoridade da `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` permanece elevada. Fonte sem PR: `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e883443696ce1c58c912ac4794ff75e`, de 23/10. Oito artefatos de CI/documentação arquivados em `docs/reconciliation/ci-v5-nav-clean/source/` com os blobs Git exatos. A tag integral e eventual retirada da ref ainda **não** foram autorizadas pelo gate deste bloco.

O diagnóstico atual em development já executa navegação V5 em 32 cenários de viewport/tema/Chromium-WebKit, com estágios derivados da configuração publicada, mas o ramo antigo tem testes exploratórios distintos de diferença visual de CSS e largura de rótulos, além de seu servidor local e runners V5. Não é correto declarar equivalência pixel e causal apenas pela cobertura de navegação.

**Classificação: HOLD_UNTIL_DIFFERENTIAL_VISUAL_INTENT_VERIFIED.** Não transportar estilos antigos ou exigir quatro estágios fixos. A suite antiga usa ambiente local, portanto nada desta prova assegura sessão autenticada Netlify, banco ou deploy. Os testes deste bloco verificam a preservação byte a byte e a autoridade moderna, não removem branch. Próxima rodada: comparar diffs CSS e convenções de rótulos, testar comportamentos dos perfis atuais e manter o original por tag se futuramente aposentável. Main, PRs, DS02, banco e runtime permanecem intactos.

## Encerramento posterior — X, reconciliado por teste causal

Este HOLD preliminar foi **resolvido** no bloco 30, sem modificar a main. A regra antiga `.controls / 514px` e a regra vigente `.flow-nav / 500px` produziram **76/76 capturas raster de navegação idênticas** (20 pares limítrofes + 56 por viewport/tema/detalhe, Chromium e WebKit, V5 local), com switches de rótulo equivalentes. A coorte de 8 artefatos foi ampliada com o CSS histórico exato, e o DAG inteiro preservado por `archive/m2d/legacy-ci-v5-nav-css-62c5521d`. [Relatório causal](DEVELOPMENT_CI_NAV_CSS_CAUSAL_2026-10-28.md); [execução X](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40728676242) AUDIT+APPLY PASS. A branch original foi aposentada, não reimportada.
