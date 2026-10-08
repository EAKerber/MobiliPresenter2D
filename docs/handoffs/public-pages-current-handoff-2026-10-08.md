# HANDOFF CANÔNICO — páginas públicas Landing + Viewer + Config protegido — 2026-10-08

> **Novo recorte CP-PUBLIC-03a2-1A — PR #185 DRAFT/HOLD (2026-10-08).** Projetor puro `app/core/buyer-configuration-projection.js` para `BuyerConfiguration2D 0.1`, allowlist campos de configuração/precificação estritamente de v5 validada, adaptador `prepare(dto)` independente de `published-buyer-projection.prepare().source`. Novo `GET /api/buyer-configuration` admin-only até autenticação de comprador, sem fallback/ETag; URL Function direta protegida. Testes de não vazamento e paridade v5; HTTP real do Netlify anônimo nega 401. [Detalhes e inventário](../architecture/cp-public-03a2-1-buyer-dto-read-model-2026-10-08.md). **Não confundir API preparada com integração pronta:** app.js na #184 ainda consome raw, 03a2-2 sessão real pendente, #182 guard admin-only raw separado, #180 viewer com fixture temporária. Para retomada 03a2-2 usar PR #183 e #185; manter Draft/HOLD; main não foi alterada.


**Estado verificado em GitHub + Netlify em 2026-10-08. Documento de retomada do CP-PUBLIC; ler ANTES de reconstruir o chat.** Este arquivo registra a autoridade *atual* em sua data; consultar a `main`, PRs e deploys ao vivo antes de agir. Não inferir que merges ou deploys posteriores não aconteceram.

## 0. Resposta em 30 segundos para um agente novo

- Repositório: `EAKerber/MobiliPresenter2D`; commit `main` observado: `86921d9cf369d56b77b029f3f3df61d2500ed37d` (PR #176). A `main` atual de verdade deve ser consultada novamente; ela não contém ainda as árvores `app/landing/`, `app/viewer/` nem `app/core/scene-component.js` da PR #175.
- **PR #175 é o trabalho funcional de landing/viewer e permanece DRAFT / HOLD, sem merge**: branch `work/cp-public-01-donor-staging-20261008`, head `09b8a7313ce6fda78e34c0d124fca3b2e93b8ca0`. **7/7 CI PASS e Netlify preview ready**, mas esse sucesso é apenas smoke, não valida contrato editorial v5 nem paridade completa de cena/pedra/rodapé.
- Preview #175: `https://deploy-preview-175--mobilipresenter2d.netlify.app/landing/` e `https://deploy-preview-175--mobilipresenter2d.netlify.app/viewer/?module=module-03`. Netlify deploy de preview confirmado: `6ac79248adf6290008e3a623`, contexto `deploy-preview`, head igual ao acima, `ready`. Os screenshots desktop/mobile foram gerados pelo Playwright em CI; não confundir essa evidência com inspeção humana pixel-perfect concluída.
- **PR #174 MERGED** estabeleceu o plano CP-PUBLIC-00. **PR #176 MERGED** preservou resultados de staging e a decisão de HOLD. **PR #34 DRAFT** é experimento antigo e independente de vidro/laterais expostas, não misturar nem incorporar sem revisão específica.
- Produção permanece em `https://casaemmodulos.casa/` com o **configurador na raiz**, v5 administrado; Netlify production deploy conferido: `6ac793156861700008b850da`, `ready`, commit `86921d9cf369d56b77b029f3f3df61d2500ed37d`, somente função `configuration`. **NÃO trocar a raiz nem usar produção para testes de sessão/storage agora.**
- **Próximo PR recomendado: CP-PUBLIC-02a**, pequeno: provar um projetor público *allowlist* de texto/dados de módulo, aceitando a autoridade `ConfiguratorAdministration2D 5.0` sem expor preços, drafts, ETags ou dados administrativos; testar pelo menos módulos 01–07 e ausência de informações não publicadas; integrar ao viewer apenas após definir a fronteira. Depois CP-PUBLIC-02b: paridade visual de cena/máscara/pedra/rodapé, uma família por vez. Só então rever HOLD do #175.

## 1. Decisão do usuário / definição final de produto

A ordem aprovada é **três experiências distintas**, não uma SPA genérica:
- `/` → **landing pública** (antes era o configurador), com navegação de ambiente **Cozinha → viewer**.
- `/viewer/` público, com deep link `?module=module-XX`, título/descrição, cena selecionável, vistas técnicas e detalhes. Estrutura visual pretendida em quatro áreas: visão/título, cena, vistas e detalhes; **ícones ainda podem ser placeholders explícitos**.
- `/config/` → **configurador já aceito**, restrito a **Netlify Identity com papel admin** OU usuário que comprovou controle do e-mail por **link de acesso com token de sessão curta**. A captura do e-mail já ocorre no fluxo comercial; não solicitá-lo uma segunda vez desnecessariamente.
- `/admin.html` → admin já existente, continua Identity admin.

**Não** criar contas automáticas nem Google OAuth no MVP. O link de acesso via e-mail é suficiente **quando** emissão, entrega, consumo único e sessão segura forem implementados e testados; ainda **não** estão implementados. O usuário autorizou planejamento e trabalho no repositório, não um novo cutover de Blob, API pública nem roteamento de produção sem os gates.

O viewer e o configurador compartilham *fontes de verdade de produtos/cena* e talvez primitivas puras, não o estado de compra, o ciclo de vida dos formulários, a navegação, layout ou o DOM inteiro. O viewer não deve importar `app/app.js` do configurador.

## 2. Histórico próximo que o contexto truncado do chat pode ocultar

1. **PRs #153–#170:** schema v5 publicado em produção, revisão 7 após migração v3 rev6, com verificação server/readback; rotas temporárias e dispatch de migração aposentados. Usuário informou não notar problemas no configurador. `CP-SD-06` está **COMPLETE/PASS**. Backup v3 foi salvo privadamente. **NUNCA migrar de novo por iniciativa própria.**
2. **PRs #172–#173:** descoberta pós-v5 de autoria admin. Fixture de novo material Fronts validou contrato, projeção do comprador e Save/strong readback sem produção; **a prova de renderização de swatch novo em browser é pendência de outra frente**, não parte da landing.
3. **PR #174, CP-PUBLIC-00:** roadmap de rotas, governança, segurança de sessão e auditoria de duplicações; documento `docs/backlog/cp-public-00-landing-viewer-config-access-roadmap-2026-10-08.md`.
4. **PR #175, CP-PUBLIC-01, ainda DRAFT:** transplante seletivo de **41 blobs da doadora** `experiment/public-landing-commercial-viewer`, que estava 228 commits atrás da main, mais testes/CI. A PR altera 44 arquivos no total (imagens, páginas, core de cena doador, testes, `app/package.json` e workflow). **Não incorporar a branch doadora bruta nem seu `app/data/catalog-data.js` desatualizado.** Arquivos do staging convivem com `main`, mas não alteram `app/index.html`, `app/admin.html`, `netlify.toml` ou Blob.
5. **Teste real no #175:** o viewer tinha **dois writers de `aria-pressed`**. O segundo usava `data-module-id` incompatível com os marcadores `data-select-scene-entity`/`data-entity-id`, redefinindo a seleção visível para falso. **Corrigido no head #175 removendo o writer redundante**. Não recriar essa duplicação durante extração.
6. **PR #176, MERGED:** documentou o staging #175, o bug, 7/7 CI, preview e HOLD. A existência desse registro na `main` **não significa** que a landing/viewer estão incorporadas à `main`.
7. **PR #34:** `feat/exposed-sides-and-glass`, um experimento antigo com vidro/laterais/fogão substituto. É independente do CP-PUBLIC e segue DRAFT por decisão de produto.

## 3. Arquivos e autoridade: por onde começar

**Leia nessa sequência**:

1. `CURRENT_STATE.md` — pointer atual, mas há muito histórico; linhas antigas de “migração v5 ainda não autorizada” são históricas e estão superadas por PR #170 e pela publicação confirmada.
2. `docs/backlog/cp-public-00-landing-viewer-config-access-roadmap-2026-10-08.md` — **plano canônico** e fronteiras de segurança com CP-PUBLIC-00→05.
3. Este handoff. Leia também `app/viewer/INTEGRATION.md` **na branch PR #175**, especialmente a seção “2026-10-08 — Rebase seletivo”.
4. `app/viewer/scene-adapters.js` / `scene-adapters.test.mjs` / `viewer.js` / `technical-views.js` / `data.js` na PR #175.
5. `app/core/scene-component.js` **na PR #175** versus `app/app.js`, `app/data/scene-data.js`, `app/data/mask-data.js`, `app/core/finishes.js` **na main**.
6. `app/data/catalog-data.js`, `app/core/administration-v5.js`, `app/core/published-buyer-projection.js` e `netlify/functions/configuration.mjs` **na main** para decidir quem é dono de texto público, cena e dados que não podem vazar.
7. `tests/public-pages-smoke.cjs` (PR #175) e `.github/workflows/public-pages-browser.yml` para reproduzir os testes; `docs/backlog/post-v5-work-frontier-2026-10-08.md` caso haja interferência na outra frente.

**Contratos**:
- `Scene2D 1.0` é autoridade de geometria/IDs/assets/máscaras e layers; `ProductCatalog2D 1.1` é catálogo físico estático atual; `ConfiguratorAdministration2D 5.0` publicado é autoridade editável dos textos, serviços, seções, políticas e pricing que lhe competem. O viewer usa `PublicSceneAdapter 0.5` como fronteira técnica provisória.
- A doadora tinha `publicPresentation.description` e `carcass` adicionais no catálogo antigo; esses campos **não existem na main atual**. O adapter de staging usa `product.benefits[0]` ou até uma string genérica como fallback. Isso é suficiente para **smoke de presença**, **não** para equivalência editorial nem prova de que o texto vem de v5.
- `app/viewer/data.js` define composição de blocos, ordem das vistas e placeholders, **não um segundo catálogo**.
- `app/landing/data.js` define cinco ambientes e copy. Apenas Cozinha tem navegação de destino. Não fabricar destinos para os outros ambientes; há placeholders de CTA/WhatsApp na landing que exigem dado real antes do lançamento comercial.
- Em `netlify.toml` da main há somente rewrite `/api/configuration`; a função tem **GET ainda público** devolvendo configuração completa e preços e **PUT admin-only**. Isso é **bloqueador de segurança real** para anunciar `/config/` como privado: proteger HTML estático no cliente NÃO basta.

## 4. PRs/CI/previews: prova observada

| Referência | Estado | O que prova | O que NÃO prova |
|---|---|---|---|
| PR #175 `09b8a7313ce6fda78e34c0d124fca3b2e93b8ca0` | OPEN + DRAFT, mergeable quando conferido | 7/7 GitHub workflows em success, check Netlify success, deploy preview ready `6ac79248adf6290008e3a623`; adapter 7 módulos, landing/viewer desktop 1366×768 e mobile 390×844, deep link, hotspot, pelo menos três vistas e três linhas de detalhe, sem erros HTTP locais | equivalência pixel-perfect, pedras/rodapé e sombras condicionais, autor de texto v5, segurança de e-mail/token, proteção de API/rotas, aceitação humana comercial final |
| PR #176 | MERGED `86921d9...` | relatório/roadmap #175 persistidos | não promove PR #175 |
| PR #34 `20040da835d6da66b03f73642c0c44db109dd6e8` | OPEN + DRAFT, Netlify preview check success | experimento isolado de laterais/vidro | não integra nem valida v5/landing/viewer |

URLs de PR: `https://github.com/EAKerber/MobiliPresenter2D/pull/175`, `/pull/176`, `/pull/34`.
Preview testado: `https://deploy-preview-175--mobilipresenter2d.netlify.app/landing/`, `https://deploy-preview-175--mobilipresenter2d.netlify.app/viewer/?module=module-03`.
Production: `https://casaemmodulos.casa/` ainda oferece configurador. **Nunca confundir preview/deploy store com site-wide production Blob.**

O teste Playwright roda no preview, salva screenshots e verifica fluxos reais. **Não foi feita nesta atualização uma inspeção humana pixel-perfect dessas imagens**. A tentativa de navegar no preview por leitor web aqui não conseguiu abrir o site; o que foi confirmado são metadados Netlify e CI. Qualquer agente que precise julgar estética deve abrir o preview em navegador compatível/Work e comparar imagens, não presumir que o status CI faz esse julgamento.

## 5. Duplicações verificadas / decisões de extração

- **Alto risco, por partes**: `app/core/scene-component.js` (staging) versus `app/app.js` (main) repetem camadas, hotspots, máscaras, coloração de frentes, teclado, bounds, seleção. O primeiro é **um subconjunto incompleto**: não substituir em lote o renderer v5 aceito, que cuida de pedra, rodapé, overlays, oclusão e z-index. Extrair helpers puros apenas com casos e screenshots equivalentes.
- **Alto valor, gate visual próprio**: `app/viewer/technical-views.js` repete desenho SVG frontal/lateral/isométrico/interno de `app/app.js`. Considerar `app/core/technical-drawings.js` puro, **uma vista por checkpoint** (módulos 01–07, dimensões e foco), só depois mudar os dois consumidores.
- **Médio risco**: prefixos de assets, alphaBounds, hotspot/selection state, listener global de teclado. A política geométrica é compartilhável; montagem de DOM, seleção comercial e ativação/desativação dos módulos são distintas. Um writer de `aria-pressed` já foi removido; preservar single-owner.
- **Baixo risco**: tokens, tipografia, branding/links/header/footer em `public-theme.css`, landing/viewer. Evitar framework genérico antes de evidência.
- **NÃO abstrair só por semelhança superficial**: carrossel de ambientes na landing, carrossel de vistas no viewer, PiP e bottom dock do configurador. Estados e UX são diferentes.
- **NÃO duplicar dados**: o viewer não deve ter preços, lista de módulos hardcoded, objetos editáveis copiados de snapshot, configuração integral em JS público ou um estado de compra falso. O conteúdo público deve vir de **projeção allowlist** do v5, vinculado ao catálogo físico e cena atuais.
- **Dados faltantes são faltantes**: manter placeholders de ícones e outras artes explicitamente, não criar caixaria nova nem inventar descrição/valores/preços.

## 6. Próximos recortes e gates autocontidos

**CP-PUBLIC-02a — PR novo separado do #175, recomendado agora: projetor de dados públicos.**
- Descobrir contrato exato para `objects[id].title/description/benefits/components/requirements` do v5 atual, IDs presentes e campos do catálogo físico/scene (medidas e technical drawings). Não assumir que `published-buyer-projection.js` serve de payload público: ele aceita a configuração integral.
- Definir allowlist limitada e explícita (módulo visível, título, descrição aprovada, benefícios, componentes/requisitos, medidas/categoria/IDs e link de assets permitido). **Excluir preços, regras, ETags, revision/admin draft, state privado, flags de auth e outros campos não necessários.** Oculte campos ausentes em vez de inventar fallback editorial.
- Testes de sete módulos e de missing/reordered item; snapshot/shape negativo garantindo que dados extras secretos não aparecem, ID desconhecido é rejeitado e a landing/viewer não importam a UI admin.
- Primeiro provar como fixture (normalizador puro) e decidir transporte real seguro (função pública mínima vs estático gerado), **sem publicar Blob em preview nem mudar GET normal de produção**. Evitar duplicar projeção no browser e no servidor.

**CP-PUBLIC-02b — prova de paridade da cena (em PRs menores se preciso).**
- Capturar frames/DOM esperados para todos os 7 módulos, ao menos acabamento alternativo e combinações de módulo oculto/revelado, pedra/rodapé ligados/desligados, sombras, recortes, overlays e z-order. Comparar doador vs renderer aceito e classificar lacunas.
- Ajustar uma família visual por recorte: layers/masks, pedra, rodapé, hotspots, perspectivas SVG. Manter controle independente de seleção viewer e sem preço.
- Atualizar `app/viewer/INTEGRATION.md` e status DRAFT do #175 por evidência; **não fundir esse PR apenas porque a landing passa testes**.

**CP-PUBLIC-03 — design/implementação de acesso antes da mudança da raiz.**
- O usuário já dispõe do e-mail comercial e prefere **link com token temporário**, sem senha/Google/provisionamento por ora. Necessários provedor real de entrega, emissor com autoridade, token aleatório + TTL/escopo, replay/race, armazenamento transacional para consumo único ou CAS comprovado, sessão HttpOnly Secure SameSite, logout/revogação e anti-abuse.
- Proteger no servidor/Edge **TODAS** as rotas e aliases do configurador, inclusive `/index.html`, `/config`, `/config/`, rota direta Netlify, variantes e assets realmente sensíveis. Permissão admin Identity OR sessão de e-mail válida read-only; administração continua exclusiva de admin.
- Fechar `GET /api/configuration` completo ao anônimo **somente depois** de publicar a projeção pública allowlist que o viewer usa. Negativos: anon bloqueado, token inválido/expirado/reutilizado, sessão não pode PUT, admin salva v5, no-store e não vazamento por redirects, logs, cache ou referrer. Não chamar uma rota pública de “protegida” por esconder link ou fazer redirect client-side.
- **Não automatizar envio real de e-mail sem capacidade/provedor e teste de entrega**, nem gravar credenciais em Git.

**CP-PUBLIC-04 — somente depois dos gates anteriores: routes cutover com rollback.**
- Trocar `/` → landing, `/viewer/` público e `/config/` protegido; manter o admin e o configurador visualmente idêntico ao aprovado, com mesmas imagens, preços, regras, PiP, interações e revisão publicada.
- Prevenir bypass via HTML estático de `/index.html`, origem `*.netlify.app`, asset URLs relativas e redirects. Testar Opera GX desktop, Chromium, mobile, navegação/refresh/back/deep links, cache e status correto de HTTP.
- Se qualquer segurança/paridade falhar, **reverter deploy**, não mexer em Blob nem editar/migrar v5.

**CP-PUBLIC-05**: depois do aceite, reduzir duplicações comprovadas, substituir placeholders com artes fornecidas, revisar SEO/WhatsApp/copy, responsividade e caminhos de CTA.

## 7. Instruções de governança para o próximo agente

- Repositório autorizado a ser trabalhado por PR, commits e merge **quando os gates passarem**. Prefira o conector GitHub disponível, não `gh`. Use branches pequenas, uma decisão por PR, CI e Netlify preview, atualizar documentos a cada gate.
- **NÃO** atualizar diretamente Netlify production Blob, executar migração v3→v5, trocar raiz, criar serviço de sessão de fachada, nem guardar segredos no código. Qualquer mudança produtiva sensível exige autorização e plano operacional próprio, não aproveitar autorização dada para o cutover anterior.
- A principal armadilha de retomada é confundir `main` (docs CP-PUBLIC-00/01, configurador ainda na raiz) com PR #175 (landing/viewer *somente em staging*).
- Estado contemporâneo de outra frente: CP-POSTV5 (admin authoring), PR #173 passou roundtrip de novo material em fixture, mas browser de novo swatch está pendente. Evitar decisões conflitantes de schema.
- O usuário deseja avançar com autonomia em checkpoints pequenos e persistentes, mas não quer retrabalho, PRs grandes nem promessas de produção não testadas. Se surgir bloqueio, registrar evidência e menor saída; não suprimir risco para “continuar”.
- A retomada ideal: `main` ao vivo → ler este handoff e roadmap → PR #175 + INTEGRATION + CI/preview → CP-PUBLIC-02a projetor allowlist em branch nova → provas → CP-PUBLIC-02b → revisar HOLD → CP-PUBLIC-03 auth → CP-PUBLIC-04 rotas. Quando a autoridade mudar, atualizar **este documento e `CURRENT_STATE.md`**.

## 8. Itens de incerteza a resolver com evidência, não com adivinhação

- Qual texto comercial do viewer deve ser editável no admin v5 versus campos físicos imutáveis do catálogo? O contrato ainda não possui projeção pública separada aprovada.
- A composição do viewer ainda não representa fielmente todos os estados condicionais de pedra/rodapé do configurador; verificação pixel/DOM permanece aberta.
- Qual componente terá autoridade por cada desenho técnico após deduplicação? Nenhuma extração foi aprovada ainda.
- Envio dos links por e-mail: qual provedor e qual fluxo comercial garante elegibilidade? Ainda por decidir/configurar; **não** inventar credenciais/env.
- Como garantir consumo único e revogação com armazenamento transacional? Blobs não é assumido transacional.
- Contratos de URLs, env e cache quando `app/index.html` deixar de ser o configurador: proibir exposição por aliases e URLs diretas.
- Landing: endereços e destinos comerciais incompletos (por exemplo `href="https://wa.me/"` sem telefone), e ambientes que não têm viewer. Tratar como pending e não “consertar” com valores inventados.

**Finalidade deste arquivo:** permitir a um novo agente continuar *sem ler o chat anterior*, com estado observado, PR atual, preview validado, contrato, pendências e menores recortes seguintes. Caso GitHub/Netlify tenham avançado, substituir os dados de status com verificações atuais e manter histórico auditável.
