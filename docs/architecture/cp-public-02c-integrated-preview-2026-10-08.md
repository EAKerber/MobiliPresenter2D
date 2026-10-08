# CP-PUBLIC-02c — Gate integrado de Landing + Viewer + endpoint público

Data: 2026-10-08. Estado: **DRAFT / HOLD**. PR: #180, derivada das PRs #175 (viewer/landing), #178 (projetor público) e #179 (Netlify Function).

## Limite da mudança

A branch combina as árvores de staging sem alterar a rota `/`, o conteúdo do configurador, `/admin.html`, o GET integral `/api/configuration` ou o Blob produtivo. Foi criada usando os blobs Git existentes da #175 sobre o HEAD da #179, inclusive imagens binárias; `app/package.json` mantém os dois grupos de testes. Netlify publica apenas um **deploy-preview de PR**. A `main` permanece como antes.

## Autoridades do caminho de dados

1. `netlify/functions/public-modules.mjs`: GET allowlist sobre `getDeployStore` em previews e `getStore` apenas no deploy efetivamente de produção; faz leitura forte do v5 válido e projeta via `app/core/public-module-projection.js`.
2. `/api/public-modules`: envia apenas `PublicModulePresentation2D 0.1` (módulos em ordem publicada, campos autorados, estado visível inicial, opções globais de frente publicadas). Não entrega preços, rascunhos, revisão, biblioteca administrativa, material de auth, ETag ou erros de parsing.
3. `app/viewer/public-data.js`: GET assíncrono same-origin sem cache. Com `CASA_PUBLIC_VIEWER_INTEGRATION.usePublishedApi === true`, o viewer exige resposta válida; na falta dela mostra indisponibilidade sem fallback estático. Sem o opt-in, o preview mostra a cena local de staging e **não pretende refletir a publicação v5**.
4. `app/viewer/scene-adapters.js`: uma instância de `ViewerState2D` para seleção/visibilidade/acabamento, com módulos visíveis em ordem v5 (quando injetada) e opções globais de frente publicadas, inclusive materiais novos do ADM.

## Gates automatizados e evidência de execução

- `app/npm test` integra suíte do configurador, projetor allowlist v5, isolamento da Function e adapter do viewer.
- `tests/public-pages-smoke.cjs` cobre landing/viewer desktop/mobile, screenshots, seleção, além de respostas 200 e 503 simuladas em Playwright.
- `tests/public-pages-integrated.cjs` usa o **endpoint real do Deploy Preview #180**. Rejeita query privada (400) e PUT (405), exige resposta **HTTP 200** do v5 de homologação, confirma cabeçalhos de não-cache, correspondência do título, Destaques e estado selecionado no viewer, sem fallback. Os testes negativos 503 continuam cobertos no smoke.
- `tests/public-modules-http-smoke.cjs` e workflow `Public modules isolated HTTP readback` fazem o readback real sem dependência do navegador, verificam o sentinela e a ausência de campos privados.
- Os **8/8 GitHub Actions passaram** no head `fd6513c671c2f329c56dac689b3c060d134c65dc` e o Netlify Deploy Preview concluiu com sucesso:
  - HTTP independente: [run 37806591033](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37806591033) — `CP-PUBLIC-02c real Netlify deploy-specific v5 public readback: PASS, HTTP 200`.
  - Playwright integrado: [run 37806590973](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37806590973) — resposta `200` e `real deploy-scoped v5 readback + viewer: PASS`.
  - Preview: `https://deploy-preview-180--mobilipresenter2d.netlify.app/viewer/`.

## Como o v5 isolado foi comprovado

O Build Plugin **temporário** `netlify/plugins/cp-public-02c-preview`, configurado somente neste ramo em `netlify.toml`, valida `NETLIFY=true`, contexto `deploy-preview`, `REVIEW_ID=180` e hostname exato do preview. Não depende de `BRANCH`, que no build Netlify pode ser uma ref sintética. Em `onPostBuild`, grava uma fixture v5 validada em `getDeployStore({name:"configurator-settings",consistency:"strong"})`, usando `onlyIfNew`, e confirma readback forte antes de concluir.

A fixture altera exclusivamente dados **fictícios de homologação**, com o sentinela `Módulo 01 — homologação PR 180` e o Destaque `Destaque exclusivo do preview 180`. Esse texto foi observado tanto na API real quanto no viewer. Nenhum `getStore` site-wide foi usado para seed e nenhum dado ou autenticação de produção foi alterado. O diagnóstico estático `app/__cp-public-02c-seed-checks.json` contém apenas booleanos, sem segredos.

**REMOÇÃO OBRIGATÓRIA ANTES DE MERGE:** retirar o Build Plugin, configuração `[[plugins]]`, script e fixture de homologação, diagnósticos estáticos, teste específico de seed e testes obrigatoriamente dependentes do ID 180. Preservar testes de contrato úteis sem dados fictícios na aplicação final. A PR #180 continua **DRAFT/HOLD**.

## Gates restantes — não confundir smoke com lançamento

1. Paridade visual/funcional da cena com o configurador aceito (pedra, rodapé, máscaras, oclusão, sombreamento e interações), com evidência de capturas desktop/mobile e estados condicionais. O workflow `Stone browser` da página principal **não valida por si a paridade do viewer**.
2. **CP-PUBLIC-03:** proteger no servidor `/config/`, `/index.html`, aliases e o GET integral `/api/configuration`; o configurador existente ainda o expõe. Validar link por e-mail, sessão, expiração, replay, direitos de admin e isolamento do usuário antes do cutover.
3. Retirar fixture temporária e revalidar o bundle final sem writes de teste. Somente após gates passar ao CP-PUBLIC-04 de rotas/produção.

A caixaria continua sem representação visual, com laterais congeladas indefinidamente. A `main` e a publicação de produção permanecem inalteradas.
