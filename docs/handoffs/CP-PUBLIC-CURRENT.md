# CP-PUBLIC — RETOMADA ATUAL / handoff sem contexto do chat

**Última verificação direta: 2026-10-08, ~22h45 America/Sao_Paulo (2026-10-09 UTC).**
**ESTE ARQUIVO PREVALECE** sobre instruções históricas conflitantes no meio de `CURRENT_STATE.md`, `docs/handoffs/public-pages-current-handoff-2026-10-08.md` e `docs/backlog/cp-public-00-landing-viewer-config-access-roadmap-2026-10-08.md`. Esses documentos preservam uma linha do tempo; muitas passagens antigas dizem equivocadamente que `/` ainda é configurador ou que a publicação depende primeiro de auth. **Não executar os antigos “próximos passos” sem reconciliar com este estado.** Consultar GitHub/Netlify ao vivo antes de alterar código.

## 0. Resposta imediata (baseline verificado)

- Repositório **`EAKerber/MobiliPresenter2D`**, nunca confundir com `EAKerber/MobiliPresenter`. Usar **conector GitHub, não `gh`**.
- `main` observada: **`204fd7d2f29267cfb0166bcfa0c1a2baef07b9c3`** (merge docs PR #189, 2026-10-08 22:29 São Paulo). Os merges funcionais anteriores foram [#187](https://github.com/EAKerber/MobiliPresenter2D/pull/187) → `74ce1733cca222e41e61a0e6c1ae643d1d297203` e [#188](https://github.com/EAKerber/MobiliPresenter2D/pull/188) → `afec414b956128887544b60cbe4d5e952779bb0f`.
- **Netlify produção `https://casaemmodulos.casa` em READY**. Deploy vigente observado **`6ac8436f9b8dde000949bb0a`**, associado exatamente à `main` `204fd7d2...`. Netlify informa duas Functions: `configuration` e `public-modules`; nenhum Edge Function nem banco provisionado pelo deploy. Painel: `https://app.netlify.com/projects/mobilipresenter2d`.
- **O cutover público já foi publicado**. Rotas:
  - `/` = **landing pública**; `/landing/` preservado como alias físico/compatibilidade.
  - `/viewer/` = **viewer público**; deep link `?module=module-XX`, cena de cozinha, vistas e detalhes. Lê **`GET /api/public-modules`**, projeção *allowlist* do v5 publicado.
  - `/config/` = **configurador original TEMPORARIAMENTE PÚBLICO**; mesma UI, cenas, lógica, preços e assets anteriores. Não há Clerk nem proteção futura.
  - `/admin.html` = administração já existente, Netlify Identity/admin para escritas.
  - `GET /api/configuration` = **raw administração ainda publicamente legível**. `PUT` continua exigindo Identity/admin. `/data/mock-price-book.js` ainda é estático público. **Não alegar preços privados, acesso gated ou isolamento completo por token** nesta fase.
  - `/api/public-modules` = GET público validado v5, sem preços, raw, drafts, ETag, revision; PUT 405, inspeção por query 400. Em preview sem Blob publicado retorna **503**; **não adicionar seed sintético de preview à produção**.
- **Validações realizadas:** último head funcional de #187 `f9ca6b7e1f61c7c165e456a1c7acba0dacce4201` teve **9/9 workflows GitHub Actions PASS** e status Netlify Deploy Preview **SUCCESS** (`https://deploy-preview-187--mobilipresenter2d.netlify.app`). #188 teve **5/5 workflows push PASS**, incluindo [gate público de produção #37869729096](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37869729096) e [Flow v3/v5 #37869729107](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37869729107). #189 teve Branch hygiene PASS [#37870008297](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37870008297). Netlify produção READY no head da #189.
- A #187 está **MERGED, NÃO É DRAFT**; #188 e #189 também merged. Isso ocorreu enquanto outro chat trabalhava. **Não recriar PR #187, não executar cutover de novo.**

## 1. Decisão de produto vigente

O usuário **autorizou mudar a raiz antes de implementar autenticação**: primeiro publicar landing/viewer e manter `/config/` público; Clerk somente em outra atualização. O usuário considera **Clerk Hobby Free** promissor para login Google/e-mail/convidados. Prioridade é **não pagar por hospedagem de banco de dados**. Preferência técnica: **Clerk para identidade/invites/sessões; Netlify Blobs já existente para v5 e futuramente propostas/snapshots; sem PostgreSQL ou Firebase por padrão**. O usuário **ainda não informou que criou conta/app Clerk nem que configurou chaves**. Não inventar `CLERK_SECRET_KEY`, não pedir segredo em chat, não configurar provider real em produção antes de um gate de preview. Administrador Netlify Identity pode permanecer separado inicialmente, evitando migrar admin desnecessariamente.

**O projeto deve ficar preparado para auth futura, não ativá-la parcialmente:** login ≠ autorização comercial. Acesso à configuração deve requerer verificação de sessão Clerk no backend **mais entitlement/permissão explícita** ao comprador; jamais liberar dados a todo usuário autenticado por Google ou por e-mail arbitrário. Privacidade de propostas/clientes e revogação devem ser desenhadas; Blobs não dá garantia de operação transacional/compare-and-swap para construir tickets próprios, mas isso pode deixar de ser necessário com Clerk.

## 2. Arquivos e fontes de verdade AGORA na main

1. `app/index.html` = landing canônica, utiliza `<base href="/landing/">` para reusar `app/landing/` CSS/JS/imagens. Não presumir que é o configurador. Links internos principais absolutos.
2. `app/config/index.html` = shell HTML completo do configurador previamente em `app/index.html`, com `<base href="/">`; o **mesmo** `app/app.js`, `app/styles.css`, `app/data/`, `app/core/` são carregados da raiz, **não duplicar essas árvores sob /config/**. Testes legados do configurador usam `/config/`.
3. `app/viewer/index.html`, `viewer.js`, `scene-adapters.js`, `technical-views.js`, `public-data.js`: público separado. `viewer.js` sempre chama `CASA_PUBLIC_VIEWER_DATA.load()`; nunca substituir v5 inválido/indisponível por texto sintético do catálogo. Viewer não importa `app/app.js`. Ícones de detalhes podem continuar placeholders.
4. `netlify/functions/public-modules.mjs` e `app/core/public-module-projection.js`: validate v5 publicada via `app/core/published-configuration.js` e construir `PublicModulePresentation2D 0.1` sem dados de administração ou preços. Produção: `getStore({name:"configurator-settings",consistency:"strong"})`; preview: `getDeployStore` isolado. Sem PUT ou fallback legado. **Não reaproveitar buyer DTO como API pública**.
5. `netlify/functions/configuration.mjs` é o endpoint raw legado (GET público no release intermediário, PUT admin Identity). Admin/editor publicou `ConfiguratorAdministration2D 5.0` **revision 7** com aceite visual. **Não migrar/publicar/mutar o Blob sem autorização e gates próprios.**
6. `netlify.toml`: somente redirects `/api/configuration` e `/api/public-modules`, `publish="app"`, build esbuild. Nenhum routing/Edge Clerk.
7. Fixtures de browser **em Playwright** podem ser interceptadas para provar viewer sem Blob em preview. Não adicionar `netlify/plugins/cp-public-02c-preview` nem `scripts/seed-public-preview-v5.cjs` das branches doadoras ao main; eram exclusivos da PR #180 e foram **deliberadamente excluídos do release**.
8. CI útil: `tests/public-cutover-contract.cjs`, `tests/public-pages-smoke.cjs`, `tests/public-production-readonly.cjs`, `tests/flow-layout-browser.cjs`, `tests/public-module-projection.test.cjs`, `app/viewer/scene-adapters.test.mjs`. Workflows `.github/workflows/public-routing-before-clerk.yml`, `public-production-readonly.yml`, `stone-browser.yml`, `mobile-browser.yml`, `summary-pricing-browser.yml`, `keyboard-browser.yml`, `flow-layout-browser.yml`. **Não alterar contratos de preço/pedra/rodapé/oclusão para fazer passarem os testes**.

## 3. PRs em aberto — não são a nova fonte canônica de runtime

| PR | Estado observado em 2026-10-08 | Regra |
| --- | --- | --- |
| [#175](https://github.com/EAKerber/MobiliPresenter2D/pull/175), [#178](https://github.com/EAKerber/MobiliPresenter2D/pull/178), [#179](https://github.com/EAKerber/MobiliPresenter2D/pull/179), [#180](https://github.com/EAKerber/MobiliPresenter2D/pull/180) | **OPEN / DRAFT**, precursores públicos antigos; funcionalidade seletiva já incorporada via #187 | Não mesclar branch doadora ou seed; comparar com main antes de encerrar ou aproveitar qualquer diferença. |
| [#181](https://github.com/EAKerber/MobiliPresenter2D/pull/181) | OPEN/DRAFT, ledger de duplicações e superfícies de acesso | Referência, não release. |
| [#182](https://github.com/EAKerber/MobiliPresenter2D/pull/182) | OPEN/DRAFT/HOLD, `GET /api/configuration` admin-only | **Não mesclar isoladamente**: cliente atual usa GET raw e UI quebraria. |
| [#183](https://github.com/EAKerber/MobiliPresenter2D/pull/183) | OPEN/DRAFT, plano e gates de auth (originalmente sessão própria) | Histórico; atualizar alvo Clerk ao implementar. |
| [#184](https://github.com/EAKerber/MobiliPresenter2D/pull/184) | OPEN/DRAFT/HOLD, browser bootstrap fail-closed e testes 401/403/5xx | Reutilizar princípios/testes na migração de DTO do comprador; não mesclar isoladamente. |
| [#185](https://github.com/EAKerber/MobiliPresenter2D/pull/185) | OPEN/DRAFT/HOLD, `BuyerConfiguration2D 0.1` e GET server allowlist (admin-only na PR) | Melhor base do DTO autenticado; preservar separação `source` raw/DTO. |
| [#186](https://github.com/EAKerber/MobiliPresenter2D/pull/186) | OPEN/DRAFT/HOLD, contém #185 + código de ticket e sessão próprios com PostgreSQL/Resend | **Não adotar arquitetura de Postgres/tokens por padrão**; apenas reaproveitar provas/gates relevantes. |

Também existe branch **`work/cp-public-03a2-3-contract-integration-20261008`**, trabalho experimental iniciado antes da revisão de sequência e baseado na #184 (fez integração parcial de viewer, raw guard, buyer DTO/fixtures). **Não é a main nem uma integração testada/releasable**. Evitar merge bruto; reconstruir de `main` após decisão Clerk, escolhendo mudanças pequenas e testáveis.

## 4. Ordem recomendada ao próximo agente (autocontida)

**A. Se o assunto for higiene/public pages agora:**
- Confirmar `main` live, production deploy e rotas com teste **read-only**; inspecionar browser visualmente antes de novos ajustes. Não reabrir #187/#188.
- Revisar conteúdo/SEO, URLs públicas, `href="https://wa.me/"` de placeholder, artes de detalhe não entregues; não inventar telefones, textos ou ícones. Abrir PR mínima se necessário.
- Deduplicar **somente depois de gates visuais**: o renderer em `app/core/scene-component.js` cobre subconjunto do `app/app.js` (não substitui pedra/rodapé/oclusão/bottom dock); `app/viewer/technical-views.js` repete desenhos SVG de `app/app.js` (potencial helper puro de desenho técnico, uma família/vista por gate). Não abstrair carrossel da landing, viewer e PiP do configurador num controlador único; seus estados são distintos.

**B. Se o assunto for a próxima release Clerk:**
1. Fazer **nova branch sobre main atual**, sem mesclar antigas PRs wholesale. Persistir um desenho atual `Clerk + Netlify Functions + Blobs`: métodos de login (Google/e-mail/convite), criação de usuário, concessão explícita por solicitação/proposta, revogação, tempo de expiração, sessões em cookies e domínios custom/preview. Preservar Netlify Identity admin até opção conscientemente validada. Sem banco extra inicial.
2. Criar **adaptador de autorização verificável e injetável** na Function (`actor` validado Clerk, `entitlement`, papel admin separado) e testes fake/protocol first. Não tratar Claim autodeclarada do browser como autorização; sem chaves devem responder 401/503 sem ler Blob. Preparar campos/env como interfaces, nunca salvar segredos.
3. Integrar `BuyerConfiguration2D` da #185 com allowlist de v5 e frontend fail-closed da #184, substituindo `GET /api/configuration` no comprador. **Cuidado:** `app/data/mock-price-book.js` é estático publicamente servido; decidir cálculo/proteção real de preço, não fingir privacidade por esconder DOM.
4. Só então proteger GET raw `/api/configuration` admin-only (#182), HTML em `/config/` e aliases (`/config`, `/config/index.html`), assets comerciais e Function direta. Fail-closed 401/403 sem preço interativo; não bloquear viewer/landing.
5. Quando usuário configurar **Clerk Development publishable/secret keys no Netlify** (sem enviá-las em chat), executar E2E de convite real, Google/e-mail, usuário sem permissão, admin, expiração/revogação, preview/prod/domínios, regressões Stone/Summary/Mobile/Flow/Keyboard e corte controlado. **Não publicar meia migração**. Custom token/postgres/resend da #186 não é a prioridade.

## 5. Gates e proibições permanentes

- A landing e o viewer públicos **já estão em produção**; preservar aceitação visual do configurador e os documentos publicados v5. Nenhuma tarefa de auth permite alteração de produto/cena/catálogo por conveniência.
- `/config/` atualmente **público por escolha explícita do usuário**, e privacidade comercial **ainda não existe**. Não esconder dados só via JS; nem abrir o raw v5 ao Clerk buyer.
- **Sem inventar dados**: placeholders para artes, telefone/WhatsApp pendente; escopo de viewer é vitrine, não render completo de pedra/rodapé/caixaria. Não reintroduzir cópias de catálogo do donor.
- Netlify Blobs atende v5 publicado e pode atender documentos JSON simples; **não presumir transações** nem guardar sessões/tickets próprios sem prova. Dados privados de propostas terão autorização server-side, retenção, escopo e cuidados LGPD quando forem introduzidos.
- Segurança e custo: nunca publicar `sk_test_`, `pk_test_`, tokens, dados pessoais, secrets no repositório/PR/log. Nenhuma conta Clerk foi criada **comprovadamente** neste histórico.
- Agente pode usar connector GitHub para commits/PRs, testes e, com gate apropriado, merge; **não usar `gh`**, não misturar PRs independentes, não fazer mudanças invisíveis em Blobs, não executar migração v3→v5 novamente. Checkpoints pequenos, docs permanentes, evidence links claros. Verifique o estado em tempo real em toda retomada.

## 6. Proveniência do checkpoint

Evidence recente: [PR #187](https://github.com/EAKerber/MobiliPresenter2D/pull/187) (9/9 workflows no head `f9ca6b...`, Netlify preview SUCCESS), [PR #188](https://github.com/EAKerber/MobiliPresenter2D/pull/188) (5/5 push), [PR #189](https://github.com/EAKerber/MobiliPresenter2D/pull/189) (documentação), Netlify deploy produção `6ac8436f9b8dde000949bb0a` (`READY`, `main=204fd7d...`, functions `configuration` e `public-modules`). [HTTP live read-only #37869729096](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37869729096) confirma as rotas e DTO público. Os testes de browser do viewer sob preview sem publicação usam fixture Playwright controlada: **não** equivalem a inspeção manual da aparência final em produção. Fotos/screenshot e revisão estética requerem validação separada.

*Este documento é um resumo novo, não substitui o histórico técnico. Manter o ponteiro deste arquivo no topo do `CURRENT_STATE.md` e atualizar ao mudar rotas, auth, schema ou autoridade.*
