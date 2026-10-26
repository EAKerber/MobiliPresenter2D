# CP-PUBLIC-03a2 — matriz de testes, classificação e release gates

Data: 2026-10-08. Complemento ao [plano canônico](../architecture/cp-public-03a2-authorized-buyer-bootstrap-plan-2026-10-08.md). **Contrato proposto; nenhum teste novo foi executado neste ramo de planejamento.**

## Separar as responsabilidades dos testes

| Grupo | Evidência exigida | Onde executar / regra de validade |
| --- | --- | --- |
| **SECURITY-NEGATIVE / rede real** | GET `/api/configuration` e URL direta sem Identity -> 401; PUT cliente -> 403; `/api/buyer-configuration` anônimo -> 401; `/config/` e aliases sem sessão -> bloqueio server-side; nenhuma leitura Blob antes da negação; headers privados e ausência de dados admin | Netlify Deploy Preview isolado, Function real, sem `route.fulfill`, banco isolado; asserts sobre resposta HTTP e DOM bloqueado, **não** exigir console vazio para negações intencionais |
| **DOMAIN-FIXTURE / funcional** | PiP, stone/plinth do configurador, summary/preços e fluxo hierárquico continuam corretos sobre um DTO v5 **declaradamente mockado**, com estado `validated` + sentinela autorada que diferencie fixture de defaults | Browser/harness isolado, resposta fixture explícita apenas no test runner; continuar asserções existentes dos scripts `mobile-pip-main-browser.cjs`, `stone-browser.cjs`, `summary-pricing-browser.cjs`. **NÃO** chamar isso de prova de Auth real |
| **BUYER-PROJECTION / contrato** | v5 legítima -> `BuyerConfiguration2D 0.1`, allowlist de campos, esquema/IDs válidos, preço somente aprovado, transformação sem perda de cálculo e UI | Testes puros do projetor + snapshot negativo que injeta campos admin/segredos desconhecidos e exige que não sejam serializados |
| **SESSION / segurança de tickets** | destinatário validado, ticket imprevisível/hash, único resgate em corrida, expiração, logout, replay, revogação, cookie flags, CSRF, rate limit, origem/scope, relógio | Backend transacional sandbox, POST e cookies reais, dois resgates simultâneos; test duplo tenta reutilizar mesmo token; não usar Blob não transacional |
| **BUYER-INTEGRATION / E2E autorizada** | link entregue ao sandbox de e-mail -> troca de ticket -> cookie HttpOnly -> GET DTO real `200` -> preço/etapas publicados e UX completa; depois expiração fecha interface | Preview isolado; **sem interceptar endpoints de autenticação ou buyer DTO**, fixture v5 entregue somente por fluxo de publicação de preview autorizado, sem seed HTTP anônimo |
| **ADMIN-REGRESSION / E2E autorizada** | Identity admin lê/edita/publica v5 com CAS e validação, mantém schema e hierarquia; cliente não executa PUT | Preview isolado e usuário admin de teste do provedor real (não mock), dados não produtivos |
| **PUBLIC-INDEPENDENCE** | Landing/Viewer funcionam sem sessão; viewer só usa `/api/public-modules`, ordem e copy v5 autorada; não lê `/api/configuration` ou buyer DTO | Preview integrado sem fixture sintética embarcada no build de release |

## Casos de bootstrap (estado esperado)

| Resposta | Estado na UI | Workspace, valor e ações | Mensagem e navegação |
| --- | --- | --- | --- |
| **Carregando GET** | `loading` | `inert/hidden` desde primeiro paint, sem preço | carregamento sem conteúdo de proposta |
| **HTTP 200 e DTO válido** | `ready` + `publishedConfigurationStatus=validated` | liberar depois de aplicar **somente DTO validado** | navegar, compor, calcular; marcador de publicação opaco |
| **401 anônimo/expirado** | `unauthorized` ou `expired` | permanecem bloqueados | instruir recuperar/solicitar novo link; não expor e-mail |
| **403 não autorizado** | `forbidden` | bloqueados | mensagem neutra, sem bypass |
| **404 inexistente, 409 desatualizado, 422 schema inválido** | `invalid` | bloqueados | informar inconsistência/atualizar, sem defaults |
| **429, 5xx, rede offline/timeout** | `unavailable` | bloqueados | retry explícito; nenhuma reativação por cache/local |
| **Corpo 200 com schema/ID/campo obrigatório inválido** | `invalid` | bloqueados | observabilidade sem dados privados |
| **Logout/revogação após 200** | `expired` | bloquear e limpar UI de compra | relogar; APIs não retornam dados |

**Teste de regressão obrigatório:** simular HTTP 401 em `app/app.js` de forma que o teste **falhe** se o preço/local defaults continuarem visíveis, se `.workspace` aceitar clique/teclado ou se `publishedConfigurationStatus` ficar sem estado determinado. O diagnóstico que hoje considera isso `PASS` em `tests/diagnostics/configuration-401-fallback.cjs` deve ser removido/substituído no corte.

## Testes com dado autorado que evita falso positivo

- Criar duas fixtures v5 com alterações **distintas dos defaults**: (A) ordem dos módulos e título/Destaques; (B) preços e opções globais de pedra/puxador/fronts, toggles e visibilidade inicial. A mudança B **precisa alterar calculadora e DOM no sentido esperado**, não apenas renderizar algum `R$`.
- Conferir `publishedConfigurationStatus=validated`, `schemaVersion=BuyerConfiguration2D 0.1`, o marcador de fixture/release no DTO e o *comportamento alterado*. Apenas 200 HTTP não prova aplicação.
- Para Stone: manter hashes/alpha/oclusão do **configurador**, não extrapolar o gate ao viewer. Para Summary: controlar soma das linhas e mudança de preço v5, sem exigir valor de uma publicação real desconhecida. Para Mobile: navegar e testar PiP após estado `ready` de fato.
- Não substituir testes reais por mocks gerais; o objetivo é **três camadas**: projeção pura, domínio com fixture explícita, acesso/integração real.

## Mapeamento de suites e arquivos

| Arquivo / workflow existente | Mudança planejada |
| --- | --- |
| `tests/mobile-pip-main-browser.cjs`, `.github/workflows/mobile-browser.yml` | No job de domínio, estabelecer fixture buyer explícita e estado `ready` antes de PiP; run E2E autenticado em job separado; não suprimir console 401 de forma global |
| `tests/stone-browser.cjs`, `.github/workflows/stone-browser.yml` | Preservar teste de canvas/rodapé como regressão **do configurador**, não viewer; esperar DTO aprovado e estado pronto |
| `tests/summary-pricing-browser.cjs`, `.github/workflows/summary-pricing-browser.yml` | Preservar aritmética, acrescentar mudança autorada de regra/preço e comparar delta esperado |
| `tests/buyer-v5-browser.cjs`, `.github/workflows/flow-layout-browser.yml` | Evoluir de `route.fulfill` do v5 bruto para DTO próprio, retaining v3/v5 conversion offline; criar teste negativo de 401/403/503 e adicionar `netlify/**` e `app/package.json` à ativação |
| `tests/diagnostics/configuration-401-fallback.cjs` | Diagnóstico temporário; **DELETE** ao virar invariant negativo fail-closed |
| `tests/diagnostics/published-v5-browser-fixture.cjs`, `.github/workflows/configuration-fixture-comparison.yml` | Converter em harness de domínio offline claramente nomeado ou remover após a suíte nova; nunca ativar `CP_PUBLIC_DIAGNOSTIC_V5` fora de CI |
| `netlify/functions/configuration.mjs`, `netlify/lib/configuration-access.cjs` | Conservar autenticação de admin; cobertura 401 antes de abrir Blob; saída 200 admin não reutilizada para buyer |
| **NOVOS:** `app/core/buyer-configuration-projection.js`, `netlify/functions/buyer-configuration.mjs`, módulo de bootstrap, endpoints e middleware de ticket/cookie | Projetor puro, sessão transacional e E2E real de login, negativos de HTTP/DOM |
| `.github/workflows/configuration-access-preview.yml` | Generalizar alvo sem número 182, com preview e auth/DB sandbox seguro; evitar workflows que validam somente uma PR com URL hardcoded |

**Triggers:** alterações em `netlify/functions/**`, `netlify/lib/**`, `netlify.toml`, `app/app.js`, `app/core/**`, `app/index.html`, `app/data/mock-price-book.js` e contratos de sessão devem acionar **no mínimo** Security Negative, Buyer Projection e Domain Fixture; integração E2E sempre como gate obrigatório do release, inclusive sem mudanças em `app/**`.

## Matriz de permissões a provar por HTTP

| Principal | `GET /api/public-modules` | `GET /api/buyer-configuration` | `GET /api/configuration` | `PUT /api/configuration` |
| --- | --- | --- | --- | --- |
| Anônimo | 200/503 seguro | 401 | 401 | 401 |
| Cliente sessão válida `configuration:read` | 200/503 | **200 DTO** | 401/403 | 403 |
| Identity não admin sem sessão válida | 200/503 | 403/401 | 403 | 403 |
| Identity admin autenticado | 200/503 | 200 DTO | **200 raw v5** | **200 sob validação/CAS** |
| Cookie inválido/expirado/revogado | 200/503 | 401 | 401 | 401 |
| Falha Identity/DB/session backend | 200/503 isolado | **503** | 503 | 503/negado |

**Cuidado:** tabelas são intenção de contrato; não alterar tratamento de erro HTTP de um principal sem garantir coerência em Edge, API e testes, nem devolver pistas de existência de contas.

## Condições de aceite/rollback

**Aprovar** somente se: 0 acesso anônimo a admin ou comprador; 0 defaults interativos em 401/403/503; 3/3 suites de domínio sob fixture validada; 200 cliente E2E real no preview isolado; sessão atômica e revogável; admin PUT e v5 invariantes; viewer público preservado; bundle comercial sem artefatos secretos; `main` e Blob produtivo sem escrita de teste; não há endpoints de seed/diagnóstico na release.

**Reprovar** se: login no browser for só `window.localStorage`, `?token=` refletido em logs, ticket resgatado duas vezes, teste passar com `R$` vindo de defaults, API devolver `prepared.source`, backend auth degradar para 200 de fallback, cliente conseguir `PUT`, ou domínio preview recorrer a dados de produção.

**Rollback** preserva a negação do GET raw v5 — nunca voltar a publicá-lo para anônimo. Se o lançamento do comprador falhar, desabilitar temporariamente `/config/` com página de manutenção/novo convite, mantendo landing e viewer públicos; restaurar a última versão **segura** do backend, não o comportamento legado exposto.
