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


## Atualização experimental: localização causal e contrato de correção (23/10, posterior)

**Primeira transição comprovada:** [run #40003369396](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40003369396) instrumentou as suites longas. Em Keyboard e Flow os quatro botões \`flow-step\` passam de 137×44 px para 0×0 na primeira mudança \`side-rail\` → \`stacked\` com detalhe aberto, apesar do elemento \`nav\` continuar conectado e com grid de tamanho válido. O screenshot anterior à transição não provocou o problema.

**Controles independentes:** [#40004314783](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40004314783) mostrou que alternar o elemento \`nav\` para flex e de volta pode restaurar a geometria, mas não é prova de que o grid seja a origem. [#40004741360](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40004741360) mostrou intermitência entre páginas novas; esconder o botão de fixação ou mudar tracks após o defeito não o reparou sistematicamente. A tentativa experimental de trocar todo o nav para flex **foi revertida** por falhar novamente em Keyboard/Flow ([#40005079884](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40005079884)).

**Causa refinada:** [matriz de 18 páginas #40005874786](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40005874786): controle 1/3 sem colapso, remoção do \`container-type\` **antes** da transição 3/3 sem colapso; outras intervenções não foram consistentes. Isso implica a contenção inline-size / invalidation responsiva da barra, não falha de clique nem simples \`has-module-detail\`.

**Candidatos testados, NÃO integrados:**
- Desativar containment apenas quando \`has-module-detail\` com perfil \`side-rail\` ou \`stacked\`: [#40006239381](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40006239381) 18/18 estados com geometria válida; [#40006239415](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40006239415) Mobile/Keyboard/Summary/Stone PASS, Flow avançou até a fixture V3 legada. **Descartado como solução final** por risco de perder rótulos compactos em larguras side-rail menores.
- Desativar containment só em \`stacked\`: [#40006605540](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40006605540) matriz causal sem colapso, mas [#40006605613](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40006605613) voltou a falhar em Keyboard ao retornar para side-rail. **Descartado**.
- **Candidato atual em branch de diagnóstico**: mover \`container: flow-steps / inline-size\` da própria barra \`.flow-nav\` para seu contêiner \`.controls\`, mantendo intacta a consulta de rótulo compacto \`@container flow-steps (max-width: 500px)\`. [#40007100266](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40007100266) comprovou 18/18 estados causais sem colapso; [#40007099906](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40007099906) teve Mobile/Keyboard/Summary/Stone **4 PASS**, Flow falhou somente em \`flow-layout-browser.cjs:681\`, depois de percorrer as transições reais.

**Flow fixture separada:** no teste \`flow-layout-browser.cjs\`, a seção posterior cria páginas com IDs de etapas renomeados e intercepta \`/api/configuration\` com uma configuração V3 plana. O servidor local controlado usa \`/api/buyer-configuration\` e uma projeção V5. O timeout em \`:681\` corresponde à expectativa de um fluxo antigo não servido nesse harness local. **Não converter a suite em PASS**. Corrigir/migrar essas fixtures separadamente, com projeção V5 validada; não abrir o endpoint administrativo nem remover asserts. Os 4/5 PASS representam apenas o ramo local que executa integralmente; Flow permanece FAIL formal.

**Gate seguinte:** [cross-browser em execução #40007558404](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40007558404) inclui 7 larguras × 2 temas × Chromium/WebKit, aberto detalhe e navegação por atalho/clique, ida e retorno de perfil. Após esse gate, avaliar equivalência visual com CSS baseline (principalmente perto de largura de contêiner 500 px) antes de separar um patch limpo e solicitar qualquer credencial. Nada em \`main\` ou Netlify foi atualizado neste incremento.
