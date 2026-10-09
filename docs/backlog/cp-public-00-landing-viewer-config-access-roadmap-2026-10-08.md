# CP-PUBLIC-00 — Integração Landing + Viewer + Configurador e acesso por link — 2026-10-08

> **Plano de entrega revisado (2026-10-08):** usuário autorizou primeiro a migração visual e de rotas com configurador **temporariamente público**. Nova PR #187 CP-PUBLIC-04a: `/` landing, `/viewer/` vitrine pública e `/config/` configurador atual sem novos guards; `/api/public-modules` publica apenas projeção v5 sem preço. **Clerk depois em release isolado**, quando Identity, autorização, proteção de HTML/assets e DTO comprador puderem ser integrados sem travar landing. Os gates de segurança #182/#184/#185/#186 permanecem como trabalho Draft/HOLD, não são pré-requisitos para o **recorte público explicitamente assumido**, mas são necessários antes de proclamar `/config/` privado. [Detalhes](../architecture/cp-public-04a-public-before-clerk-2026-10-08.md).


Status: **PLANO CANÔNICO / DESCOBERTA CONFIRMADA; MIGRAÇÃO DE ROTAS AINDA NÃO ATIVADA.**

**Handoff atual para troca de agente:** `docs/handoffs/public-pages-current-handoff-2026-10-08.md` — consulta ao vivo das PRs #175 (DRAFT + 7/7 CI + Netlify ready), #176 (MERGED) e #34 (DRAFT), arquivos de staging, duplicações e próximo recorte CP-PUBLIC-02a. Não confundir o deploy preview com incorporação do viewer à `main`.

## Evidências / autoridade

- `main` observada em `d11d9b59f43841640112adae578c4a7e2cdaa1fc` (consultar SHA atual antes de cada checkpoint). O schema v5 está publicado e aceito; **nenhuma alteração deste plano deve reeditar o Blob de produção, redefinir v5 ou modificar seu contrato sem gate**.
- Branch doadora: `experiment/public-landing-commercial-viewer` (um commit à frente do merge-base e **228 atrás da main** nesta auditoria). **Nunca fazer merge bruto nem copiar `app/data/catalog-data.js` sobre a versão atual.**
- Documentação doadora: `app/viewer/INTEGRATION.md` (`PublicSceneAdapter 0.5`, `ProductCatalog2D 1.1`, `Scene2D 1.0` à época). `app/viewer/data.js` é composição visual, não um segundo catálogo. `app/landing/data.js` é copy/marketing e seleção de ambientes.
- No `main` atual, `app/index.html` é configurador e `app/admin.html` é administração Identity; `netlify.toml` tem apenas o rewrite de `/api/configuration` e publica a pasta `app`. A função `configuration.mjs` tem GET público e PUT admin autenticado. `app/core/scene-component.js` **não existe** na main; existe apenas na doadora e **não substitui** a cena corrente do configurador.
- Há uma dependência de contrato de produto: a doadora embute `publicPresentation` descritivo e `carcass` no catálogo antigo, ausentes na main atual. A main contém modelo v5 de texto, preços, apresentação e opções além do catálogo estático. Adaptar o viewer sem trocar o catálogo atual por um snapshot antigo.

## Contrato de rotas (final, após gates)

| Rota | Público | Papel | Fonte / restrição |
|---|---|---|---|
| `/` | sim | landing canônica e SEO | conteúdo marketing e ambientes; Cozinha → `/viewer/` |
| `/viewer/`, deep link `?module=<id>` | sim | cena comercial coordenando título, vistas e detalhes | adapter sobre cena/catálogo **atuais**; texto público compatível com v5; não importar o app do configurador |
| `/config/` (normalizar `/config`) | **não** | configurador aceito | somente Netlify Identity com papel admin **ou sessão emitida após prova de controle do e-mail** |
| `/admin.html` | não | administração existente | Identity/admin, sem troca de auth neste ciclo |
| `/api/configuration` | revisar/fechar leitura configurador | configuração completa e preços | distinguir acesso do comprador autenticado, admin e eventual projeção pública mínima para viewer; não confiar em esconder URL |
| `/access/` ou fluxo equivalente | sim apenas tela do convite/solicitação | troca de ticket recebido por sessão curta | não entregar a aplicação protegida antes de validação |

**Acesso mínimo decidido pelo usuário:** e-mail já coletado no fluxo comercial; envio de link temporário com token de sessão, sem autoprovisionar conta/senha e sem Google OAuth nesta versão. A experiência não deve pedir o e-mail duas vezes quando já estiver disponível.

## Gate de segurança essencial (não negociável)

Um redirect client-side, uma variável JS, um link secreto ou uma regra Netlify 200 **não protegem** arquivos HTML e assets estáticos. Bloquear acesso no servidor/Edge **antes** de servir `/config/` e suas rotas alternativas (`/index.html`, versões com e sem barra, aliases e URL direta do Netlify), sem interferir nas páginas públicas. Os scripts compartilhados podem ser públicos se não contiverem segredos, mas **o conteúdo integral da configuração e operações sensíveis não podem vazar pela API pública**. Não enviar token nem preço privado para analytics, cache, URL de terceiros, logs ou query reproduzível.

Arquitetura proposta (design, não implementação ainda):
1. O formulário/negócio registra e-mail, associando-o à solicitação elegível. Um endpoint de emissão autenticado pela regra de negócio (ou processo explícito de solicitação com limites de abuso) gera ticket aleatório com entropia criptográfica, finalidade `configurator_access`, TTL curto (~15 min), nonce e escopo; armazena somente hash/estado expiração. **Não prometer e-mail enviado** sem integrar provedor e validar entrega.
2. Enviar link HTTPS ao endereço informado; preferir ticket no *fragment* da URL `/access/#token=...`, para que o HTTP GET e referer não carreguem o bearer token. Página neutra local remove o fragmento da barra de endereço imediatamente e oferece botão explícito **Continuar** para evitar consumo por scanner de e-mail. A troca é POST; jamais entregar token a script/asset de terceiro.
3. Validação server-side de ticket, replay/expiração, escopo, uso único e emissão de cookie de sessão **HttpOnly; Secure; SameSite=Lax; Path delimitado**; limite de sessão definido (~12 horas inicialmente, com revogação e logout), vinculado à identidade/email verificado. A semântica de uso único exige garantia de concorrência; **Netlify Blobs não deve ser tratado como transacional**. Provar CAS/consumo sob corrida ou escolher armazenamento transacional antes do GO. Em falha ambígua, fail-closed.
4. Middleware servidor/Edge aplica sessão/autorização a **todos** os caminhos servindo o configurador e à API de configuração completa; `PUT` permanece apenas admin Identity, e sessão de consumidor é **read-only**. Viewer e landing só podem ler projeção pública allowlist sem disponibilizar admin drafts, ETags ou payloads privados. Anti-enumeration, rate limit, anti-abuse, CSRF, CSP, referrer policy e no-store para resposta protegida. Confirmar comportamento nos domínios personalizado/Netlify e previews sem cruzar stores.
5. Recuperação/expiração: link inválido → tela segura de solicitação; cookie expirado → solicitar outro link. Não criar usuário Netlify Identity nem Google sem decisão posterior. Não fazer rollout enquanto o provedor de e-mail, a política de emissão e o backing de sessão não tiverem testes reais.

## Auditoria de duplicações (e decisão)

| Foco | Evidência | Classificação | Destino / gate |
|---|---|---|---|
| Catálogo/módulos | doadora removeu snapshot dos 7 módulos, mas adicionou `publicPresentation` ao `catalog-data.js` antigo; main v5 já edita textos de objeto | **autoridade potencialmente conflitante** | ler textos públicos da projeção atual/v5 e dimensões geométricas do catálogo/scene; não copiar catálogo antigo |
| Cena, layers, máscaras, cor de frentes | `app/core/scene-component.js` da doadora repete subconjunto de `renderSceneFromData()` e aplicação de acabamento da `app/app.js` atual | **duplicação funcional de alto risco** | extrair primitivas puras validadas, sem retirar renderizador principal: main suporta stone/plinth, recortes, dependências, fallback e z-order adicionais |
| Hotspots, seleção, marcadores | `scene-component.js` + `scene-adapters.js` repetem foco, hotspots e seleção da cena do configurador | **duplicação parcial** | separar cálculo geométrico/policy de UI; preservar comportamento de seleção comercial (inspecionar) versus toggle de compra |
| Teclas e setas | `bindKeyboard()` adiciona listener global, além do fluxo principal de teclado do configurador | **risco de listeners múltiplos** | single-owner por página com mount/unmount e teclado escopado; testar campos editáveis, acessibilidade, mobile |
| Renderizadores SVG | `viewer/technical-views.js` repete `svgFactory`, `drawingSpec`, frente/lateral/isométrica/interna de `app/app.js` | **duplicação confirmada** | extração posterior para `app/core/technical-drawings.js` puro, um desenho por vez, com screenshots/roundtrip; detalhes de foco e estilos permanecem locais |
| Recorte de foco e assets | viewer usa SVG `image` com `alphaBounds` e prefixos relativos; configurador usa imagem/layer/masks próprios | **compartilhável parcialmente** | resolver URL e bounds uma vez na fronteira; não compartilhar cabeçalho/DOM/layout desnecessariamente |
| Seleção → título/vistas/detalhes | `viewer.js` tem 4 renderers atrelados ao mesmo adapter; módulo corrente no comprador é estado distinto | **não duplicar store** | manter sessão de seleção própria do viewer, sem clonar estado comercial de preços/opções |
| Estrutura de dados de apresentação | `viewer/data.js` define ordem, tipos e placeholders; v5 `presentationPolicy` define layout do configurador | **domínios distintos** | manter page composition do viewer, sem forçar layout comercial dentro do schema v5 |
| CSS/layout e responsividade | `landing.css`, `viewer.css`, `app/styles.css`, `public-theme.css` | **tokens compartilháveis; layouts próprios** | partilhar apenas tokens/theme; reavaliar mobile e breakpoints, sem transplante do ZIP desktop como verdade mobile |
| Branding, footer, navegação | landing + viewer repetem marca/links/cabeçalho | **duplicação estética pequena** | tokens/componentes estáticos somente após validar semântica/SEO e escape de HTML; evitar framework novo |
| Ambiente selecionado, carrossel, navegação | `landing.js` faz seleção e carrossel; viewer tem carrossel técnico | **semelhança superficial** | NÃO compartilhar estado nem forçar uma abstração de carrossel genérica; comportamentos e acessibilidade diferem |
| Placeholders detalhe | `viewer/data.js` preserva SVG placeholder; viewer gera linhas de componente/requisitos | **dívida de asset deliberada** | placeholders explícitos até ícones reais aprovados; não inventar ícones/dados |
| Configuração pública e editor | GET v5 completo hoje é público; viewer lê catálogo estático | **fronteira nova de segurança** | definir projeção pública read-only allowlist antes de bloquear GET normal e migrar `/config/` |

## Incrementos e gates

### CP-PUBLIC-00 — discovery + plano (este arquivo)
- Persistir a arquitetura, auditoria de duplicações, fronteira v5 e segurança. **Não alterar root, admin, dados produtivos ou emails**.
- Definição de pronto: documento canônico referenciado em `CURRENT_STATE.md`, gates de execução e risks claros.

**Progress (2026-10-08):** CP-PUBLIC-01 donor staging PR #175 imported only 41 previously isolated blobs and added adapter tests plus desktop/mobile Playwright screenshots. All seven GitHub workflows and Netlify preview passed at `09b8a7313ce6fda78e34c0d124fca3b2e93b8ca0`. A real dual `aria-pressed` writer bug was found/fixed. PR remains **DRAFT / HOLD** until CP-PUBLIC-02 public v5 content projection and visual parity of masks, stone/plinth are satisfied; no route, session, admin or production data change. Do not interpret basic smoke PASS as final commercial viewer acceptance.

### CP-PUBLIC-01 — reconciliação da branch doadora em preview, sem ativar rotas canônicas
- Copiar **somente** `app/landing/`, `app/viewer/`, `app/public-theme.css` e o *novo* `app/core/scene-component.js` de forma isolada para uma branch sobre main atual, preservando blobs binários; **não copiar** `app/data/catalog-data.js` antigo.
- Verificar integridade de arquivos e build/testes atuais. O viewer precisa de adapter para o catálogo/scene correntes; se ainda incompatível, manter PR DRAFT/preview e não incorporar a main. Landing/viewer públicos apenas após gate visual, no máximo sem rotas canônicas neste incremento.
- Gate: zero alteração em `app/index.html`, `app/admin.html`, configuração publicada ou `netlify.toml` para este recorte; testes em sete módulos e mobile; hyperlinks sem promessas enganosas.

### CP-PUBLIC-02 — fonte comercial atual e extração compartilhada (uma duplicação por PR)
- Projetor puro de dados públicos: aceitar v5 atual, associar por ID a geometria e catálogo físico e manter `publicPresentation` somente como campo explicitamente migrado ou fallback aprovado. Provar ausência de dados inventados e não divulgar preço/draft.
- Extrair primeiro geometria/bounds/url, depois SVG técnico, depois camadas/máscaras, sem alterar o app principal e sem criar segundo schema. Testes de equivalência e screenshot por módulo.
- Verificar cena real: pedra/rodapé, sombra, máscaras de acabamento, oclusão, hot spots e ao menos uma view interna.
- Viewer continua independente: clique na cena atualiza título, vistas, requisitos e detalhes; sem edição ou preço do configurador.

### CP-PUBLIC-03 — acesso por e-mail e isolamento server-side (fatiado em testes)
- Definir emissão/entrega real, rate limits, backing transacional, validação de token e expiração; interface de `/access/` neutra. Não solicitar Google OAuth agora.
- Implementar gate de páginas/aliases + API completa do configurador, mantendo Identity admin e GET público *somente* de projeção allowlist.
- Gates: anônimo 401/redirect sem HTML do configurador, ticket válido autoriza só leitura, ticket expirado/replay falha, sessão não consegue PUT, admin ainda consegue salvar v5, Google não necessário, previews isolados, sem logs de tokens. Testar URL direta do Netlify e bypass de rewrites.

### CP-PUBLIC-04 — alteração atômica das rotas, com rollback
- Somente após CP-PUBLIC-01/02/03 verdes, **trocar `/` para landing, `/viewer/` público, `/config/` protegido**, manter `/admin.html` e `/api/configuration` conforme novos contratos.
- Preservar a UI v5 aceita byte-a-byte ou por teste de equivalência: layout, ativos, cena, preços, módulos, etapas, resumos, PiP e histórico. Tratar caminhos de assets relativos/deep-link antes de publicar.
- Não confiar em rewrite estático para auth; revisar redirects Netlify, fallback de `/index.html` (não pode continuar exposto como configurador) e SEO/canonical; rollback com deploy anterior e sem nova migração do Blob.
- Validar Opera GX desktop, Chromium, mobile e tamanhos extremos, navegação/voltar, teclado, loading, e rótulos.

### CP-PUBLIC-05 — refinamento/limpeza pós-aceite
- Remover código duplicado somente após consumidor novo comprovado e equivalência; revisar ícones de detalhes, fotos, copy/WhatsApp, responsividade mobile. Retirar standalone adapter apenas se o novo contrato compartilhado for o único com consumidores comprovados.
- Consolidar `CURRENT_STATE.md`, roadmap e handoff após cada gate. Não reabrir migração v3→v5.

## Escopo explicitamente adiado

- Login com Google e provisionamento automático de contas de usuários.
- Analytics, heatmaps, roteador SPA ou sistema de design universal antes da integração.
- Criar entidades físicas ou máscaras novas sem ativos e medidas verdadeiros; caixaria recolorível permanece fora do contrato aceito.
- Envio real de emails e alteração do acesso de produção **antes** de aprovação da implementação segura, com dados do provedor e testes de entrega.

## Próximo passo imediato

Implementar CP-PUBLIC-01 como PR independente. Inspecionar `git diff` entre `main` e branch doadora, carregar somente árvore das páginas/arte, não sobrescrever `catalog-data.js`, confirmar limites do adapter e manter a rota de produção `/` (configurador) até CP-PUBLIC-04. Registrar falhas reais do viewer no plano antes de qualquer merge. O gate de parada para CP-PUBLIC-01 é incompatibilidade estrutural significativa com a scene atual.
