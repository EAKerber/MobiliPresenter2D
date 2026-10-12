# Credenciais de acesso temporário — preparação

**Atualizado:** 2026-10-12 (America/Sao_Paulo)
**Estado em 2026-10-12:** migration inicial aplicada ao projeto de desenvolvimento; endpoints, páginas, DTO do configurador e gate Edge implementados. O usuário reportou ter configurado a autenticação e criado variáveis no Netlify; não consegui verificar as variáveis de projeto pelo conector disponível, e nenhum valor secreto foi lido. Consulta read-only confirmou `access_service` com login habilitado e membro de `access_runtime`. A validação de ponta a ponta dos fluxos autenticados ainda está pendente.

## Verificação após configuração reportada — 2026-10-12

- Netlify: o conector disponível lista variáveis compartilhadas pela equipe, não variáveis deste projeto; a consulta da equipe retornou lista vazia. Isso não comprova nem contradiz as variáveis do site, e não confirma nomes ou escopos. Não ler nem solicitar valores secretos.
- Supabase: consulta em `pg_roles` confirmou `access_service` com `rolcanlogin=true` e associação a `access_runtime`. Usar a credencial desse login no Transaction pooler; nunca usar `postgres` nas Functions. A senha/URI não foi lida nem compartilhada.
- Confirmar somente nomes e escopos (nunca valores): `DATABASE_URL`, `ACCESS_GATE_SECRET`, `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_OAUTH_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL` e `ACCESS_PUBLIC_ORIGIN`. As variáveis de runtime precisam do escopo Functions e do contexto Deploy Preview; `ACCESS_PUBLIC_ORIGIN` deve ser a origem HTTPS exata do preview após sua criação.
- Confirmar/identificar no Identity contas de teste `admin` e `staff`. Nenhuma alteração em produção foi feita.

## Conexão Supabase observada — 2026-10-12

O plugin autenticou e listou a organização **Casa em Módulos**, no plano Free. O projeto `Casa em Módulos` foi criado em `sa-east-1` (Postgres 17) e está `ACTIVE_HEALTHY`. Antes da migration, o banco não tinha migrations nem tabelas de aplicação.

Em 2026-10-12, foi aplicada a migration remota `20261012202813_temporary_access_v1`; o arquivo correspondente está em `netlify/access/migrations/20261012202813_temporary_access_v1.sql`. Verificação posterior confirmou duas tabelas vazias em `access_control`, RLS ligado e forçado, role `access_runtime` sem login com os privilégios esperados, e ausência de `USAGE`/privilégios de tabela para `anon`, `authenticated` e `service_role`. Os advisors retornaram zero alertas de segurança; o advisor de performance apontou os quatro índices como ainda não usados, esperado enquanto as tabelas permanecem vazias e as rotas ainda não os consultam.

## O que é necessário agora

O código local em `netlify/access/` e `netlify/functions/access-*` usa `DATABASE_URL`; o adaptador Gmail usa `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_OAUTH_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL` e `ACCESS_PUBLIC_ORIGIN`. O gate está ligado em código a `/config/*` e `/data/mock-price-book.js`; as Functions separam a resposta buyer allowlisted da resposta administrativa raw. Falta validar a execução real no Netlify com credenciais e uma Deploy Preview. Não cole valores secretos neste repositório, chat, ticket ou captura de tela.

### Supabase Postgres

1. O projeto de desenvolvimento já existe (`jaedzligsqazyjelpweu`, região `sa-east-1`, Postgres 17, status saudável). Não crie outro projeto. No painel, abra **Connect** e selecione **Transaction pooler**. Use a connection string fornecida pelo painel; não monte usuário/host manualmente.
2. A migration inicial já foi aplicada. Em novas alterações, criar migrations novas e aplicar com a ferramenta Supabase após revisar o diff e o banco-alvo. Ela cria tabelas e uma role de grupo `access_runtime`, sem login.
3. A role `access_service` já existe como login de runtime e é membro de `access_runtime`. Não a recrie; usar essa credencial no pooler e nunca a credencial proprietária `postgres` em Functions. Não compartilhar senha nem URL completa.
4. No Netlify, adicionar `DATABASE_URL` em **Project configuration → Environment variables**, com escopo de **Functions**. Inicialmente limitar a Deploy Previews; não habilitar em produção até fechar os gates de segurança, validação integrada e exportação/restauração.

`access_service` já foi criada como login dedicado com associação a `access_runtime`. Use a connection string do Transaction pooler com essa role para configurar `DATABASE_URL`; nunca use `postgres`. Não colar a URI em mensagens.

Com `DATABASE_URL` configurada, use inicialmente um Deploy Preview e limite as variáveis ao contexto de preview. O gate Edge e as Functions precisam de `ACCESS_GATE_SECRET` (segredo aleatório compartilhado; escopo Functions, disponível também à Edge). O envio precisa de `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_OAUTH_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL=casaemmodulos@gmail.com` e `ACCESS_PUBLIC_ORIGIN` com a origem HTTPS exata do preview usado. Crie/identifique contas Identity de teste com papéis `admin` e `staff`; não conceda esses papéis a usuários de teste do configurador.

Referências oficiais: [criar projeto Supabase](https://supabase.com/docs/guides/platform), [conexões e pooler Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers), [variáveis de ambiente em Functions Netlify](https://docs.netlify.com/build/functions/environment-variables/).

Não são necessárias `SUPABASE_ANON_KEY` nem `SUPABASE_SERVICE_ROLE_KEY`: o desenho atual acessa PostgreSQL diretamente, sem Supabase Auth ou API REST.

## Email Gmail — necessário para testar emissão e entrega

O adaptador Gmail API existe em `netlify/access/gmail.mjs`, mas ainda não foi executado com credenciais. Ele usa o escopo mínimo `gmail.send` para a conta oficial `casaemmodulos@gmail.com` e exige `ACCESS_PUBLIC_ORIGIN` com a origem HTTPS do site. A tela admin carrega o livro de preços via `/api/admin-bootstrap`, que exige `admin`; o asset estático desse livro está no Edge gate junto ao configurador.

Quando chegar essa etapa:

1. No [Google Cloud Console](https://console.cloud.google.com/), criar/selecionar projeto e habilitar a [Gmail API](https://console.cloud.google.com/flows/enableapi?apiid=gmail.googleapis.com).
2. Configurar a tela de consentimento OAuth e criar um OAuth Client ID para aplicação web. Solicitar apenas `https://www.googleapis.com/auth/gmail.send`.
3. Autorizar a conta oficial como remetente e obter um refresh token offline usando fluxo OAuth seguro. Guardar `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_OAUTH_REFRESH_TOKEN` e `GMAIL_SENDER_EMAIL` no gerenciador de segredos e, quando o código estiver validado, nas variáveis Netlify com escopo de Functions. Adicionar `ACCESS_PUBLIC_ORIGIN` com somente a origem HTTPS canônica do site, sem caminho.
4. Se o app OAuth externo ficar em **Testing**, refresh tokens emitidos para escopos Gmail expiram em sete dias. Isso serve para validar integração, não para envio contínuo em produção. Antes de produção, concluir a publicação/verificação aplicável ao app.

Referências oficiais: [escopos Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes), [OAuth 2.0 para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server), [estado de publicação e expiração de refresh token](https://developers.google.com/identity/protocols/oauth2#expiration).

Uma senha de app via SMTP é uma alternativa operacional, mas exige verificação em duas etapas e é menos segura que OAuth; não é o caminho escolhido por padrão. Ver [senhas de app Google](https://support.google.com/accounts/answer/185833).

## Limites e segurança operacional

- As variáveis devem ser configuradas diretamente nos painéis Supabase/Netlify/Google; nunca em `netlify.toml`, `.env` versionado ou mensagens.
- Não enviar credenciais ao agente. O usuário pode configurá-las diretamente nos painéis quando o código consumidor estiver pronto.
- Variáveis usadas pelas Functions precisam do escopo **Functions**. O gate Edge lê `ACCESS_GATE_SECRET` por esse escopo.
- Não configurar produção enquanto autorização server-side, proteção dos arquivos estáticos, políticas de cache, envio e resgate, revogação e restauração de backup não tiverem sido validados em Deploy Preview.
- `ACCESS_GATE_SECRET` é necessário com escopo de Functions para o gate Edge e a Function de verificação interna; sem ele, o acesso temporário falha fechado. Mudanças nas variáveis exigem novo deploy para surtirem efeito.
