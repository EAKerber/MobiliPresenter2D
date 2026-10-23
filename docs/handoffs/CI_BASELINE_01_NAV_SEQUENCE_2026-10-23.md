# CI-BASELINE-01 — Keyboard/Flow: diagnóstico de geometria em sequência (23/10/2026)

**Escopo:** branch `ci/ci-baseline-01-nav-sequence-probe-20261023`; somente testes instrumentados, observabilidade e este registro. `main`, autenticação, dados V5, design system, deploys e runtime produtivo intocados. O ambiente é um servidor local com projeção V5 sintética validada: **não equivale ao preview Netlify autenticado**.

## Evidência reprodutível, em ordem cronológica

- [Run #39987226959](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39987226959): 3/5 PASS locais (Mobile/PiP, Summary/preços, Stone/pedras); Keyboard timeout em `tests/keyboard-browser.cjs:165`, Flow timeout de click na aba Módulos em `tests/flow-layout-browser.cjs:391`. Sondagem isolada de `Ctrl+Right` e navegação entre abas funcionou.
- [Run #39999597455](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39999597455): reproduziu exatamente 3/5, 2/5; adicionou capturas read-only preservando todas as asserts.
- [Run #40000084734](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40000084734): Keyboard com `currentStep=modules`, foco `toggle-module-03`, `side-rail`, `hasModuleDetail=true`. Flow com `currentStep=finishes`, `stacked`, viewport 1050×900, `scrollY=320`, botão Módulos `0×0`, barra NAV existente.
- [Run #40000682626](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40000682626): evento `Ctrl+ArrowRight` foi recebido no documento e `defaultPrevented=true` no alvo `INPUT[type=checkbox]#toggle-module-03`; os **quatro botões de etapas** tinham `getClientRects().length=0` apesar do `display:block` e `hidden=false`. Na Flow, a barra NAV tinha `rect=[24,214,1002,58]` e `display:grid`, mas o botão estava em `rect=[0,0,0,0]`. O teste manteve o timeout original, sem force-click.
- [Run #40001391408](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40001391408): controle causal mínimo: botões têm retângulos normais com detalhe fechado (**76×44**), detalhe aberto (**137×44**) e detalhe novamente fechado (**76×44**) em `side-rail`. A sequência isolada `Ctrl+ArrowRight` avançou a `finishes`; `stacked` exibiu botão Módulos **243×44**, clicável. **Logo, `has-module-detail` sozinho não é a causa demonstrada.** As duas suítes longas permaneceram com timeout; Mobile/Summary/Stone continuaram PASS.

## Classificação correta

1. **Reprodução longa comprovada:** sob algumas sequências de foco/viewport/navegação, os botões deixam de possuir geometria renderizada; o controlador de teclado recebe o evento, mas sua filtragem de `isUsable` ignora botões sem `getClientRects`.
2. **Não demonstrado:** a causa-raiz exata, se estado intermediário de DOM/layout/estilo, sincronização transiente ou defeito do próprio harness. Não atribuir a `has-module-detail` sem o experimento comparativo.
3. **Não executar:** modificar `isVisible` para tratar área zero como clicável, usar `force:true`, remover asserts, marcar estas suítes PASS ou abrir a rota privada para CI. Um elemento com geometria nula não deve ser tratado como navegável apenas para satisfazer teste.

## Próximo experimento de custo mínimo

Dentro **da mesma branch isolada**, inserir snapshots incrementais *na sequência da suíte* antes/depois da troca de viewport, da abertura de detalhe, do foco no toggle e do `scrollTo(320)`. Registrar, sem textos de configuração/URLs privadas, `flow-nav` e quatro `flow-step`: `isConnected`, bounding rect, `getClientRects`, `offsetWidth/Height`, `grid-template-columns`, `content-visibility`, `hidden` e `aria-current`. Inserir controle A/B de fechar detalhe antes da mudança de etapa. Separar falha transitória (recovery em requestAnimationFrame/estabilização) de colapso persistente. Só propor patch na camada responsável após localizar **a primeira transição** que produz zero.

**Gate para #232:** 5/5 suites precisam passar funcionalmente sob V5 local antes de consumir um terceiro convite de acesso de uso único; depois há gate distinto de `buyer-configuration` autenticado 200 e 5/5 no preview, sem exposição de dados nem retrocesso de auth. PR #235 permanece experimental DRAFT/HOLD, e #231/#234 seguem DRAFT/HOLD.

**Critério de parada deste incremento:** diagnóstico e persistência de evidência, não correção especulativa nem merge/release.
