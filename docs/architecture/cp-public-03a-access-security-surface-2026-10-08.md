# CP-PUBLIC-03a — superfície de segurança, contrato e gates de acesso

Data: 2026-10-08. Tipo: **inventário + plano**, sem ativação de autenticação/rotas. Inspeção da `main` em `bf30e008a81b7bc9cc34573e3d60a953810a9e72` e do checkpoint combinado [PR #180](https://github.com/EAKerber/MobiliPresenter2D/pull/180) em `82d85674595280a7c878848d0d5f09df29492e92`.

## Decisão de produto que delimita o risco

- `/` será a landing pública; `/viewer/` continuará público, destinado **somente a apresentar módulos e suas vistas/destaques/componentes/requisitos**. Não replicar a seleção condicional de pedra, rodapé e oclusão do configurador; nem exigir paridade do viewer com essas regras.
- `/config/` será privado por Netlify Identity **admin** ou sessão temporária emitida após prova de controle do e-mail. O usuário já informou o e-mail comercial; não pedir de novo se o fluxo puder reaproveitá-lo. Google login adiado.
- A cor global das frentes é um possível controle adicional, **não** condição de segurança nem requisito de lançamento. A caixaria não tem controle visual; laterais/máscaras próprias congeladas indefinidamente.
- `/admin.html` continuará de administração e protegido conforme as decisões anteriores. A interface não determina sozinha o direito de ler ou gravar dados.

## Inventário da superfície existente

| ID / prioridade | Evidência exata | Comportamento existente | Regra/gate requerido |
| --- | --- | --- | --- |
| SEC-01 **P0** | `netlify/functions/configuration.mjs` (main), `readPublished()` e `if(request.method==="GET")` antes de `getUser()` | **GET anônimo retorna a configuração v5 integral**, incluindo regras comerciais/preços e propriedades administrativas. `getUser()` e role `admin` protegem **PUT**, não GET. | GET integral autorizado exclusivamente para admin ou sessão de cliente válida; anônimo `401`/erro neutro **antes de abrir o Blob**. Sessão cliente só leitura; PUT continua exclusivamente admin. |
| SEC-02 **P0** | `netlify.toml` redireciona `/api/configuration` para `/.netlify/functions/configuration` | Alias de API e caminho direto da Function podem chegar ao mesmo handler. | Política dentro do handler, não apenas rewrite/caminho: negar anônimos pelos dois URLs. Nenhum parâmetro de inspeção deve devolver o documento. |
| SEC-03 **P0** | `app/index.html` é publicado como `/` e também acessível por `/index.html`; Netlify publica `app/` | O configurador completo está servido como HTML estático. Mudar links, esconder botões ou usar JS de redirect **não é controle de acesso**. | Separar fisicamente a landing pública do configurador no artefato final e aplicar proteção server/Edge à rota `/config/`, variantes `/config`, `/index.html`, paths alternativos e domínio `*.netlify.app`; testar GET direto sem cookie. |
| SEC-04 **P0 / classificação comercial** | `app/data/mock-price-book.js`, incluído diretamente por `app/index.html` e `app/admin.html` | Contém valores **numéricos reais da estimativa comercial** (em centavos) e descreve-se como “public commercial estimate”; não contém, pelo próprio contrato, custo/margem/supplier. **Já é deliberadamente público no baseline atual**, mesmo sem API. | Decisão explícita antes do corte: se preço comercial só pode ser visto com sessão, **não publicar esse JS em `app/` acessível anonimamente**; mover para bundle/rota protegida ou fonte protegida. Bloquear apenas GET v5 não oculta o preço estático. Se estimativa for intencionalmente pública, documentar exceção e validar risco. |
| SEC-05 **P1** | `app/admin.html` + `app/admin/admin.bundle.js`; `admin/admin.js:isAdmin()` | UI pública do admin pode ser carregada, mas dados sensíveis e PUT dependem de guardas do cliente/servidor; o HTML/JS público não deve carregar credenciais. | Proteger página conforme contrato de admin e manter PUT server-side por Netlify Identity role `admin`; evitar confiar só em `isAdmin()`. Testar HTTP sem credenciais em HTML, APIs e aliases. |
| SEC-06 **P0 / contrato já testado** | PR #179/#180 `netlify/functions/public-modules.mjs` + `app/core/public-module-projection.js` | `GET /api/public-modules` lê publicação v5 validada, retorna **allowlist** de textos, visibilidade e acabamentos habilitados. Método diferente de GET 405; query inesperada 400; preview usa `getDeployStore()`. | Manter endpoint público separado; nunca reutilizar `published-buyer-projection.prepare().source` como resposta pública. Regressões de preço/etag/draft/objectAssets devem falhar. API pública não vira bypass da privada. |
| SEC-07 **P1** | `app/viewer/public-data.js`, `viewer.js` (PR #180) | Consumidor de API público é **opt-in**; com API desativada usa conteúdo estático de staging. Com API ativada, erro da publicação falha fechado. | Na integração final ativar o loader para a experiência pública efetiva; não usar `/api/configuration` nem copiar v5 completo ao browser; distinguir fallback técnico/geométrico de fallback editorial silencioso. |
| SEC-08 **P1** | `netlify/functions/configuration.mjs:getConfigurationStore()`, PR #180 `getDeployStore` | Produção usa store site-wide; previews usam store do deploy. | Preservar isolamento: produção **nunca** receber fixtures, previews **nunca** cair no Blob produtivo por ausência de publicação. Verificar também no domínio custom e no alias do deploy. |
| SEC-09 **P0 de release / temporário** | PR #180: `netlify/plugins/cp-public-02c-preview`, `scripts/seed-public-preview-v5.cjs`, `app/__cp-public-02c-seed-checks.json` produzido no build, scripts de readback/sentinela | Fixture fictícia de homologação gravada **apenas em `getDeployStore`** do preview #180, para provar API 200. | **Remover antes de qualquer merge/cutover**, junto do `[[plugins]]` em Netlify e asserts rigidamente acoplados ao preview `180`; manter testes permanentes do contrato sem dados falsos no build final. |
| SEC-10 **P1** | `app/data/catalog-data.js` carregado pelo viewer; `app/data/scene-data.js` | Catálogo físico publicável contém metadados de produtos, `commercial` de elegibilidade e `publicPriceCents:null`, mas não substitui controle da configuração integral. | Inventariar campos do bundle público e validar que não surgiram regras confidenciais; permitir metadados físicos necessários para vistas, sem criar segunda autoridade editorial. |

## Contrato de autorização alvo — sem alterar produção ainda

| Principal | Landing/Viewer | GET `/api/public-modules` | GET configuração **integral** | PUT configuração integral | `/config/` |
| --- | --- | --- | --- | --- | --- |
| Anônimo | público | 200 allowlist (ou 503 seguro) | **401** | **401** | acesso negado |
| Cliente com sessão válida de e-mail | público | público | **200** com `no-store`, somente escopo autorizado | **403** | permitido |
| Admin Netlify Identity com role `admin` | público | público | permitido | permitido com validação v5/CAS existente | permitido |
| Sessão expirada/inválida, ticket gasto/revogado | público | público | **401** | negado | negado |

**Cuidado:** um token em fragmento `/access/#token=...` é deliberadamente omitido do GET HTTP, mas **não constitui sessão**; a troca explícita por POST e o cookie `HttpOnly; Secure; SameSite=Lax` são obrigatórios. Consumir ticket uma única vez sob corrida exige backing transacional/garantia atômica demonstrada; `@netlify/blobs` não deve ser tratado como base transacional. Não reutilizar tokens de Netlify Identity como tickets comerciais sem contrato separado. A emissão/entrega depende de serviço de e-mail efetivamente configurado e limites antiabuso. Não alegar que e-mail foi enviado antes de readback real.

## Sequência em checkpoints pequenos

**03a0 — contrato, inventário e testes offline (este recorte).** Documentar rotas, origem de valores públicos, snapshots permitidos, legitimidade de leitura de preços. Construir matriz de testes adversariais sem escrever no Blob produtivo. `GET` legado continua aberto até ter mecanismo de sessão operacional; **não** fazer mudança quebradora isolada na main.

**03a1 — middleware de autorização isolado e teste de API.** Implementar em branch própria uma função `authorizeConfigurationRead` testável: valida admin Identity ou cookie de sessão; GET anônimo retorna 401 *antes* de `getStore`; PUT exige admin Identity e proteção CSRF. Testar GET direto e por rewrite em preview. Manter fail-closed se backing ou assinatura indisponíveis; sem bypass por ambiente.

**03a2 — emissão/troca de ticket e armazenamento com atomicidade.** Controlar emissão para e-mail verificado, ticket curto, token hash, consumo único, expiração, revogação e abuso; cookie e logout. Validar dois resgates simultâneos (exatamente um vence), alteração de clock, reuso e domínios. Não inserir Google Auth.

**03a3 — proteção real da distribuição HTML/assets.** Separar landing de `index.html`, servir `/config/` somente depois de Edge/servidor autorizar e controlar aliases; validar a exposição de `mock-price-book.js` conforme política comercial. Se não for viável impedir download direto do HTML/JS protegido com a topologia escolhida, **não** cortar rotas.

**03a4 — gates integrados de segurança + lançamento coordenado.** Dev/staging totalmente isolados, admin PUT + cliente read-only + anônimo negativo, expiração e logs sem credenciais; no-store, CSP, referrer, rate limit, CSRF, anti-enumeration, links de e-mail; checar `/`, `/index.html`, `/config`, `/config/`, `/admin.html`, `/api/configuration`, `/.netlify/functions/configuration`, `/api/public-modules` e URL Netlify do deploy. Plano rollback antes de publicar.

## Gates de parada

- Nunca alterar diretamente a publicação v5 rev7, `main` ou a raiz produtiva durante a descoberta.
- Nenhum fixture de preview pode migrar para o bundle final; nenhum endpoint de seed anônimo.
- A autenticação client-only, bloqueio de clique, rename de arquivo ou rewrite sem guard de servidor **não** fecham SEC-01/03/04.
- Não confundir CI público do viewer com a validação de acesso por e-mail: são contratos distintos.
