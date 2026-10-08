# CP-PUBLIC-03a2-2 — Tickets por e-mail e sessões autenticadas (núcleo)

**Data:** 2026-10-08. **Estado:** PR [#186](https://github.com/EAKerber/MobiliPresenter2D/pull/186), DRAFT / HOLD, **NÃO MESCLAR**. A PR #186 contém também o read model da [#185](https://github.com/EAKerber/MobiliPresenter2D/pull/185), pois foi temporariamente retargetada à `main` para receber um Netlify Deploy Preview verificável. Não interpretar como aprovação de merge conjunto. Prod/`main`/Blob intactos.

## Implementação e garantias

- `netlify/lib/buyer-session-core.cjs`: token criptograficamente aleatório de 256 bits em base64url, somente digest SHA-256 em repouso; 15 min para convite, 12 h para sessão. `__Host-casa-config-session=<opaque>` com `Secure; HttpOnly; SameSite=Lax; Path=/`. Sem JWT customizado, senha, OAuth, localStorage ou envio de segredo em query.
- `netlify/lib/buyer-session-postgres.cjs` e `netlify/access-migrations/001_access_tickets_sessions.sql`: atualização condicional `UPDATE ... consumed_at IS NULL AND expires_at>now() ... RETURNING` + `INSERT session` numa transação real `BEGIN/COMMIT` no **mesmo cliente PostgreSQL**. Erro/concorrência implica rollback; nenhuma troca de token em Blobs ou estado em memória de Functions. Audience `site ID:production` vs `site ID:deploy:<deploy id>` e checagem em consulta. Session revogada/expirada não passa. Issuance limitada a 3 convites/h por destinatário e 30/h por emissor, lock transacional por recurso (sem corrida de quotas).
- `netlify/lib/buyer-session-email.cjs`: transport REST do Resend; só considera aceito após resposta 2xx com ID do provider, **não prova entrega na caixa de entrada**. Falha de envio revoga o ticket emitido; os serviços nunca registram segredo/email/URL em log.
- `netlify/lib/buyer-session-http.cjs` e 4 Functions em `netlify/functions/access-*.mjs`: `POST /api/access/issue` exige Identity admin verificada e email explícito; `POST /api/access/redeem` consome ticket; `GET /api/access/session` verifica sessão; `POST /api/access/logout` revoga e expira cookie. Respostas privadas `no-store`; rejeição de métodos, query inesperada, corpo maior que 2 KiB, Origin divergente e `Sec-Fetch-Site: cross-site`. URLs `/.netlify/functions/*` passam pelas mesmas funções.
- `netlify/lib/authorized-buyer-read.cjs` e `netlify/functions/buyer-configuration.mjs` (derivados de #185): `GET /api/buyer-configuration` somente a admin Identity ou comprador cuja sessão opaca exista e esteja válida no PostgreSQL. A leitura do v5 acontece **após** essa autorização. O endpoint raw `/api/configuration` continua sem privilégio de comprador (guard da #182 a integrar); preço cliente é visível apenas à sessão quando o cutover estiver pronto.
- `app/access/index.html`, `app/access/redeem.js`, `app/access/access.css`: tela pública mínima, sem terceiros/analytics; extrai `#ticket=`, chama `history.replaceState` antes de rede, usa POST e cookie; redireciona a `/config/` **futura**. `/config/` ainda não existe nem está protegida: a UI inteira continua em HOLD até 03a2-3.

**Contrato de concessão:** somente um **administrador** pode emitir convite para o e-mail informado; a posse desse link concede `configuration:read`, nunca `configuration:write` ou papel Identity admin. Não existe cadastro de password ou self-service arbitrário. A integração do e-mail já captado no fluxo comercial (permissão e correspondência a lead confiável) continua pendente; não transformar email enviado pelo visitante em autorização.

## Configuração obrigatória (ainda NÃO realizada)

Somente no **ambiente isolado de teste primeiro**, configurar variáveis runtime Netlify (escopo Functions), nunca em `netlify.toml`:
- `CASA_ACCESS_ENABLED=1` (sem isto retorna 503; default desligado).
- `CASA_ACCESS_DB_URL` — connection string PostgreSQL dedicada, com TLS verificado. **Não compartilhar** banco de teste e produção, ou qualquer coisa do `getStore/getDeployStore` do catálogo.
- `CASA_ACCESS_ORIGIN` — origem `https://...` exata do host onde o link será aberto (produção / preview deliberado), sem caminho/fragmento. Evita fabricar URL a partir de `Host` controlável.
- `CASA_ACCESS_RESEND_API_KEY`, `CASA_ACCESS_MAIL_FROM` — credencial e remetente de domínio verificado no Resend. Por desenho, provider pode registrar a URL de entrega; revisar retenção do fornecedor.

**Aplicar** `netlify/access-migrations/001_access_tickets_sessions.sql` manualmente ao PostgreSQL isolado **após aprovar o provedor e a política de dados**. Pasta escolhida fora de `netlify/database/migrations`: nenhuma auto-provisão/migração em deploy preview ou produção. `pg` é apenas cliente da conexão explicitamente definida. **Não foi enviado qualquer e-mail e nenhum banco remoto foi provisionado.**

Antes de marcar apto a release, comprovar que `CASA_ACCESS_ENABLED` está ausente/desligado em produção e que segredos de preview não se tornam visíveis ao build de PR não confiável. O teste real no preview atual espera `503 access_unavailable` em endpoints enquanto desativados.

## Matriz de gates

| Gate | Cobertura | Significado |
| --- | --- | --- |
| Protocolo puro | `tests/access-session-core.cjs` | 256-bit, hash, same-origin, scopes, 32 resgates simulados, revogação, cookie, e-mail aceito, admin-only issue |
| Transação REAL | `tests/access-postgres-integration.cjs` em PostgreSQL 16 descartável | 32 resgates simultâneos => exatamente uma sessão; rollback do ticket quando INSERT falha, limites/h, expiração, revogação e audience isolado |
| Endpoint buyer | `app/tools/test-authorized-buyer-read.js` | Somente admin ou sessão injetada como já verificada pelo módulo de persistência; cliente expirado/scope inválido/DB indisponível nunca abre Blob |
| Deploy Preview seguro | `.github/workflows/buyer-session-security.yml` | Endpoint real retorna 503 sem credenciais por rota e Function direta; jamais tratar preview não implantado como teste verde |
| E-mail real, sessão real | **PENDENTE** | Em sandbox, Identity admin real -> envio real para mailbox sandbox -> resgate POST em Function com banco isolado -> cookie -> GET DTO v5 válida do Blob preview, logout/replay. Sem mocks |
| Proteção do site | **PENDENTE** | Edge guarda `/config/` e aliases; assets de preço comercial só após auth; `/index.html` não contorna guarda |
| Regressão comercial | **PENDENTE integração** | #184 bootstrap precisa passar a usar /api/buyer-configuration e `prepare(dto)`; separar testes de domínio sob DTO de Auth real |
| Privacidade/perf | **PENDENTE** | TTL e limpeza de tickets/sessões expirados, fluxo de denúncia/retirada de consentimento e retenção de email, benchmark de concorrência DB real de preview, logs sem PII |

## Riscos residuais e decisões de HOLD

1. **A implementação não cria nem administra o PostgreSQL externo.** Sem URL e migração manual, o sistema não funciona; o teste CI só prova transações locais. Nenhuma credencial foi configurada.
2. **Delivery != Inbox:** status `202 accepted` significa aceitação pelo Resend, não recebimento humano. Precisa E2E mailbox sandbox; se o provedor aceitar e o banco ficar indisponível no instante de revogação de uma entrega duvidosa, o ticket expirará em até 15 min — monitorar incidente sem logar token.
3. **O endpoint de convite é admin-only.** Para enviar magic link automaticamente quando cliente fornece email, é obrigatório desenhar o contrato entre registro comercial confiável e elegibilidade; não derivar direito de acessar de email arbitrário enviado por browser.
4. **CSP meta não protege `frame-ancestors`**; cabeçalhos server/CDN devem ser definidos no 03a2-3. A página `/access/` não carrega scripts terceiros, mas o HTML sob CDN exige header referrer/CSP de defesa.
5. **Main ainda tem API raw GET pública** até #182 e conteúdo comercial estático visível; não declarar o sistema seguro só porque a Function buyer já recusa anônimos.
6. **Não promover sozinha a PR #186**: integra código dependente de #185, sem #182/#184 nem Edge. No máximo servir como branch de integração E2E protegida, nunca como deploy produtivo.

## Próximo recorte

03a2-2B/03a2-3: credenciamento de banco + remetente em preview isolado e test de e-mail real com inbox sandbox; a seguir consolidar #182/#184/#185/#186 em branch de integração e mudar bootstrap de raw v5 para DTO; proteger `/config/`, `/index.html`, assets/preços e aliases de Functions, e finalmente cortar `/` para landing + viewer sem paridade indevida de pedra/rodapé/oclusão.
