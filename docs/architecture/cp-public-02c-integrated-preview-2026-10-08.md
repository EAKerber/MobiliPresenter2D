# CP-PUBLIC-02c — Gate integrado de Landing + Viewer + endpoint público

Data: 2026-10-08. Estado: **DRAFT / HOLD**. PR: #180, derivada das PRs #175 (viewer/landing), #178 (projetor público) e #179 (Netlify Function).

## Limite da mudança

A branch combina as árvores de staging sem alterar a rota `/`, o conteúdo do configurador, `/admin.html`, o GET integral `/api/configuration` ou o Blob produtivo. Foi criada usando os blobs Git existentes da #175 sobre o HEAD da #179, inclusive imagens binárias; `app/package.json` mantém os dois grupos de testes. Netlify publica apenas um **deploy-preview de PR**. A `main` permanece como antes.

## Autoridades do caminho de dados

1. `netlify/functions/public-modules.mjs`: GET allowlist sobre `getDeployStore` em previews e `getStore` apenas no deploy efetivamente de produção; faz leitura forte do v5 válido e projeta via `app/core/public-module-projection.js`.
2. `/api/public-modules`: envia apenas `PublicModulePresentation2D 0.1` (módulos em ordem publicada, campos autorados, estado visível inicial, opções globais de frente publicadas). Não entrega preços, rascunhos, revisão, biblioteca administrativa, material de auth, ETag ou erros de parsing.
3. `app/viewer/public-data.js`: GET assíncrono same-origin sem cache. Com `CASA_PUBLIC_VIEWER_INTEGRATION.usePublishedApi === true`, o viewer exige resposta válida; na falta dela mostra indisponibilidade sem fallback estático. Sem o opt-in, o preview mostra a cena local de staging e **não pretende refletir a publicação v5**.
4. `app/viewer/scene-adapters.js`: uma instância de `ViewerState2D` para seleção/visibilidade/acabamento, com módulos visíveis em ordem v5 (quando injetada) e opções globais de frente publicadas, inclusive materiais novos do ADM.

## Gates automatizados

- `npm test` da aplicação combina casos do configurador, regras de publicação, isolamento de endpoint e adapter do viewer.
- `tests/public-pages-smoke.cjs`: landing + viewer em desktop/mobile com screenshots, além de sucesso 200 e erro 503 da projeção **simulados no Playwright**, sem Blob real.
- `tests/public-pages-integrated.cjs`: no **deploy-preview-180** real do Netlify, primeiro exige 400 em query de inspeção e 405 em PUT; faz GET HTTP real em `/api/public-modules` com headers de não-cache. Aceita somente:
  - HTTP 200: inspeção de campos allowlist, ordem/visibilidade e renderização editorial real correspondente no viewer;
  - HTTP 503: erro neutro `public_modules_unavailable`, browser com `[role=alert]` e sem título do catálogo estático.
- Esse teste não faz PUT de conteúdo nem faz seed de Blob, e rejeita URLs que não sejam Deploy Previews dessa instalação.

## Critério de saída (não atingido somente por CI verde)

O ramo HTTP 503 comprova **isolamento seguro**, não a capacidade de ler dados v5 publicados em produção. Para fechar 200 de ponta a ponta é necessário que o preview receba uma publicação v5 própria, produzida pelo mesmo fluxo autenticado do ADM ou por fixture implantada em ambiente isolado com autoridade comprovada, sem recorrer ao Blob produtivo. Não abrir endpoint anônimo de seed.

Separadamente permanece a paridade visual de pedras/rodapés/máscaras/sombras/oclusão e o acesso seguro a todo o configurador, inclusive `/index.html`, `/config/`, API integral e caminhos alternativos. Não fazer rollout da landing para `/` antes desses gates. Caixaria continua sem representação visual; laterais congeladas por prazo indeterminado.

## Próxima ação

Após inspeção dos logs CI e resposta real da API, classificar o ramo 200/503 e registrar no handoff. Se 503 por ausência de publicação no preview, manter HOLD e estruturar um ensaio seguro com estado v5 apenas no store do deploy, sem alterar configurações ou autenticações de produção.
