# P-TOKEN-02A1 — Alias do contorno de foco global

**Data:** 2026-11-01. **Estado:** implementação local isolada sobre `development@2babbebd73f4187daf1c0f9562c5ec0aa8abeff6`; sem push, PR, preview ou deploy.

## Decisão e escopo

As regras globais de `:focus-visible` em `app/ui-theme.css` repetiam os mesmos valores já declarados por tema em `--ui-theme-focus`. As declarações agora usam `var(--ui-theme-focus)`:

- light continua `#6e512e`;
- dark continua `#d8bc7c`.

Somente o valor de `outline-color` mudou. Seletores, ordem, espessura, estilo e deslocamento dos contornos permanecem iguais. Não houve mudança de HTML, JavaScript, schema, layout, superfícies, glass, desenho técnico ou regras específicas do Admin/Viewer.

## Classificação P-TOKEN-02

`same-value-safe`: a variável é definida no elemento raiz para ambos os temas antes das regras, e herda para os controles descendentes que correspondem a `:focus-visible`. Os valores são idênticos aos literais removidos. Essa substituição não aplica a paleta VIS-002 globalmente e não amplia homologações visuais.

## Validação e limite

- `node tests/ui-theme-focus-token-contract.cjs` passou no HEAD local atualizado. O teste fixa os dois valores, exige uma única definição do token por tema mesmo com blocos raiz adicionais, exige um consumidor global por tema e verifica a ordem definição/uso.
- A workflow `.github/workflows/development-public-navigation-semantic.yml` agora inclui o contrato focalizado no job de integridade e observa mudanças no próprio teste em `pull_request` e `push` para `development`. A alteração ainda não foi executada em CI hospedada.
- Uma checagem Chromium isolada recebeu as declarações relevantes copiadas de `app/ui-theme.css`, criou um botão sintético e usou Tab para ativar `:focus-visible`. Em tema claro, a cor calculada foi `rgb(110, 81, 46)`; em escuro, `rgb(216, 188, 124)`. Em ambos os temas, comparar o token com o literal anterior manteve `outline-style`, `outline-width` e `outline-offset` idênticos. Isso valida a equivalência das declarações, não uma rota real do produto.
- O teste amplo existente `node tests/ui-theme-contract.cjs` continua falhando em `app/viewer/index.html theme bootstrap`; a mesma falha ocorre no checkout limpo do SHA-base `development`, antes de chegar aos novos critérios. O arquivo amplo não foi alterado.
- O runner DS-04/DS-05A foi tentado no checkout exato de `development`, mas a conexão local do Node para `127.0.0.1` falha com `EACCES connect`; a execução não chegou a produzir relatório. O runner existente também remove scripts da aplicação; por si só não satisfaz o critério DS-05A de DOM gerado pelos renderizadores reais.
- Na configuração Developer settings do projeto Netlify `mobilipresenter2d`, Deploy Previews está configurado como “Don’t deploy pull requests”; a branch de produção é `main` e Branch deploys estão restritos à branch de produção. Não foi criado PR nem preview, nem foi alterada essa configuração. A leitura confirma o estado do projeto nesta data.

Os revisores UX/UI e arquitetura aprovaram a semântica, o escopo e a preservação da cascata. O runtime CSSOM em rota real e DS-05A completo continuam pendentes. Não há necessidade de revisão visual ampla para este alias de valor idêntico.

Uma divergência preexistente entre foco global e foco do controle de publicação no Admin foi observada e permanece fora deste recorte; este alias preserva o valor calculado atual. A revisão de arquitetura observou que seletores raiz de tema se repetem legitimamente em outros trechos do CSS; o contrato agora conta redefinições do token em todos os blocos, em vez de exigir um único bloco raiz.
