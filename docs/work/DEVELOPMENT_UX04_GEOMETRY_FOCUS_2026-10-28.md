# UX04 — geometria antiga, autoridade de main e preservação do foco (28/10/2026)

Fonte `feat/cp-ux-04-hierarchy-layout@5d8347edb6ea247307b6fc27b424117553542f78` de 06/10, 25 caminhos divergentes. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` continua referência estável. Snapshot de treze arquivos representativos em `docs/reconciliation/ux04-main-authority/legacy/`, hash Git original por arquivo; DAG histórica inteira recuperável via tag caso haja aposentadoria futura. **Ainda não remover a branch**.

## Divergência de layout com intenção mais recente

- Perfil `side-rail` (1366px): painel de controles estreito ao lado da cena; Módulos detalhe/lista e Serviços ficam **numa coluna**. Quatro afirmações históricas relativas a módulos/serviços em duas colunas no desktop foram conscientemente substituídas por esta política, já coberta pelo teste atual `tests/flow-layout-browser.cjs`.
- `stacked` (1050px): cena sobre controles; Módulos e Serviços assumem **duas colunas**, com scroll independente e preservação de foco/estado. O código novo verifica geometria do perfil e a navegação entre 1050/1051px.
- `compact` (390px): a lista de Módulos e o detalhe são **projeções alternativas**, não duas superfícies simultâneas empilhadas. Isto substitui o teste antigo de lista abaixo do detalhe e protege foco e restauração ao fechar com Escape. O sexto assert antigo comparava overflow com outra mensagem; teste atual também verifica overflow.

## Divergência de teclado ainda não comprovada

`tests/keyboard-browser.cjs` histórico: 74 chamadas de assert, 71 preservadas literalmente no atual (100). Dois asserts de scroll da última seção foram alterados para proteger o **rodapé fixo** e são mais rigorosos. O terceiro exigia que o puxador selecionado recuperasse foco após redraw; hoje há verificação de seção ativa, mas não de foco exato. É um contrato de acessibilidade potencialmente importante; não tratá-lo como obsoleto só pela idade. Gate de Chromium local executa a ação e registra explicitamente foco atual; se falhar, a branch permanece HOLD até investigação/correção.

## Gate de aceitação

Teste determinístico dos 13 blobs originais + hashes estáveis da main/development, 29 asserções históricas de layout (23 presentes, seis interpretadas), 74 de teclado (71 presentes, três justificadas). Prova funcional em Chromium localhost 1366/1050/390 dos três perfis, overflow, Escape e foco após redraw. A suíte histórica original não deve ser importada no V5 como implementação vigente. Nenhuma mudança de app, configuração Netlify, dados, preview ou produção.

**Decisão atual:** `HOLD` até um gate de geometria + foco realmente aprovado e documentação da substituição semântica. Se o foco falhar, reportar como possível regressão sem reverter automaticamente a main.

## Diagnóstico funcional e correção mínima (dev-only)

- [Gate inicial #40705228634](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40705228634): prova estática PASS, navegador reprova especificamente `selected handle should recover keyboard focus after redraw` — `expected: "none"`, `actual: null`. A sequência de geometria dos perfis side-rail, stacked e compact passou até a checagem final de foco. **Nenhuma branch aposentada**.
- Investigação causal: `app/app.js` na `main` chama `renderHandleControlsFromData()` que usa `handleOptions.replaceChildren()`, removendo do DOM o botão que recebeu o click. A implementação mais antiga da CP-UX-04 guardava o índice canônico e restabelecia foco no novo botão com `requestAnimationFrame(() => activateSection("handles", handleIndex, true))`. A atual chama `activateSection("handles", handleIndex, false)`, preserva a seção mas deixa `document.activeElement` sem puxador.
- Correção **seletiva apenas na development candidata**: recuperar exclusivamente o foco na opção selecionada no próximo frame, sem mudar valores, preços, seleção, colunas, APIs, DB ou a main. O teste atual `tests/keyboard-browser.cjs` ganha a mesma asserção histórica; além do gate dedicado, executar suíte completa de navegação por teclado em Chromium V5 localhost. Até gate PASS e verificação de intenção, UX04 permanece HOLD.

## Correção do gate de identidade de blobs

- [Gate auxiliar #40706011964](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40706011964) bloqueou o teste estático por manifesto ainda apontar ao blob de **main** para `tests/keyboard-browser.cjs`, embora a alteração da asserção tenha produzido o novo blob de desenvolvimento `3e901267fc6a9e24dc6cb7edfc7d0c7fc29cf7d7`. Corrigir só o campo `developmentSha`; manter `mainSha=2d3eb81fd6a7e21b5bbb3bb87c35fa3d63815fbe`. O navegador dessa execução não iniciou; é incorreto afirmar que o comportamento foi aprovado.

## Segunda investigação do gate de browser

- [Execução #40706269409](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40706269409): teste estático PASS, navegador falhou no primeiro assert `side-rail` (antes do foco). A execução anterior #40705228634 havia passado por toda geometria até o assert de foco. O caso parece sensível ao momento de atualização do DOM/CSS, porém **não se conclui a causa apenas pela alternância de resultados**.
- A instrumentação agora espera dois frames de renderização mais janela curta de estabilização após mudanças de perfil/etapa e inclui as medidas capturadas nas mensagens de erro. Nenhuma implementação ou policy visual é alterada. A aceitação exige geometria atual correta e recuperação de foco em Chromium, não suposições baseadas na diferença de tempo.

## Gate com sincronização de foco pós-frame

- [Run #40706673148](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40706673148): geometria atual passou com estabilização, mas o teste registrou `activeElement=null` logo após `keyboardActiveSection=true`. A seção já estava marcada por `pointerdown`; isso **não prova** que a restauração por `requestAnimationFrame` nunca ocorreu, apenas que foi medida cedo demais. Alterado gate dedicado para esperar explicitamente o `activeElement.dataset.handleId` atingir o id selecionado dentro de 4,5 s, depois esperar dois frames e confirmar persistência. O gate completo de teclado também verifica a asserção histórica, sem supor restauração instantânea.

## Diagnóstico de foco com registro antes de falha

- Gate anterior [#40707110744](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40707110744) falhou por timeout aguardando o `activeElement` recuperar `data-handle-id`. A mudança de `requestAnimationFrame` já existe na auxiliar, mas a causa exata ainda não está demonstrada. Instrumentar os eventos `focusin`, localização de `handles` no modelo, botões após redraw, erros de navegação e ativação manual para distinguir falhas de descoberta, foco ou reposição DOM. **Não liberar aposentadoria/merge enquanto o gate falhar.**

## Causa identificada no gate #40708331739

- [Gate instrumental #40708331739](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40708331739): geometria e integridade estática passam; o foco falha com `expected=none`, `activeElement=BODY`. A coleta encontrou quatro botões conectados, `currentStage=finishes`, `activeSection=handles`, mas o teste pesquisava a identificação incorreta `handles` e a ativação manual desse nome retornava `false`.
- **Causa raiz no código:** `resolveModelSection()` atribui `id: \`section:\${modelSection.id}\``, portanto `activateSection("handles")` não corresponde a `entry.id`. Essa chamada já era um no-op na versão histórica; simplesmente restaurar `requestAnimationFrame` não bastou. Correção mínima dev-only: `activateSection("section:handles", handleIndex, true)` após o redraw; também corrigir o gate diagnóstico para usar o ID canônico.
- Até a execução de Chromium e testes completos de teclado passarem, **HOLD**. Não alterar main nem afirmar retirada antecipada.
