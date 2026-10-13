# CP-PUBLIC — modelo de acesso com Netlify Identity

**Status em 2026-10-12:** schema inicial aplicado e verificado no projeto Supabase de desenvolvimento. A implementação inclui emissão/revogação/resgate, adaptador Gmail, DTO comprador, autorização do endpoint administrativo, bootstrap de preços apenas para `admin` e Edge gate para `/config/*` e o arquivo estático de preços. O usuário reportou configuração de autenticação e variáveis no Netlify; nomes/escopos não foram verificados. Consulta read-only confirmou `access_service` com login habilitado e membro de `access_runtime`. A implementação requer validação integrada em Deploy Preview e não está liberada para cutover de produção. Foco associado: [issue #192](https://github.com/EAKerber/MobiliPresenter2D/issues/192); consulte o runbook datado para os bloqueios e próximos passos.

## Decisões vigentes — 2026-10-12 (America/Sao_Paulo)

Este registro datado atualiza as decisões de provedor e persistência abaixo. Se agentes encontrarem notas anteriores com alternativas em aberto, usar esta seção como decisão vigente e ainda sujeita a revisão explícita.

- **Identity interna:** Netlify Identity continua autenticando `admin` e `staff`; Supabase Auth não será introduzido neste fluxo.
- **Banco inicial:** adotar **Supabase Postgres no plano Free** para grants e sessões temporárias, condicionado à configuração da conta e à validação de conectividade nas Functions Netlify. Não usar Netlify Database, Neon ou Clerk como caminho padrão desta implementação.
- **Portabilidade:** manter PostgreSQL padrão, migrations SQL e uma pequena interface de persistência (`AccessStore` ou equivalente). Não usar recursos exclusivos de Supabase Auth para representar grants. A troca futura de host deve exigir principalmente configuração de conexão, migração/exportação e ajustes limitados no adaptador.
- **Dados mínimos e estruturados:** persistir apenas os campos necessários para resgate de uso único, vínculo/verificação do destinatário, escopo, expiração, revogação, sessão e auditoria mínima. Guardar hashes de segredos bearer, nunca tokens em claro. Não empacotar toda a concessão em uma string com codificação própria: o ganho de espaço é irrelevante neste volume e isso atrapalharia consultas, expiração, revogação e auditoria. Dados enviados pelo browser são sempre não confiáveis; validação, emissão de segredos, resgate atômico e autorização permanecem server-side.
- **Plano Free e atividade:** aceitar que um projeto Supabase Free pode ser pausado após período de baixa atividade. Não gerar consultas/escritas artificiais nem tarefas periódicas apenas para mantê-lo ativo. Se houver pausa, restaurar o projeto; se disponibilidade contínua se tornar requisito, reavaliar plano ou provedor.
- **Recuperação:** o plano Free não oferece backups automáticos diários. Antes de produção, definir e validar exportação periódica PostgreSQL para cópia fora do Supabase, com procedimento de restauração.
- **Email:** usar Gmail como primeiro transporte de email atrás de uma interface de provedor. Credenciais, quotas efetivas da conta, entrega e tratamento de falhas ainda precisam ser configurados e testados; esta decisão não afirma que emails já foram enviados.
- **Validade inicial:** grant e sessão do usuário começam com **3 horas**, em valor centralizado/configurável para alteração futura sem mudança de schema. Admin e staff podem emitir e revogar grants. A comprovação é a posse do email destinatário por resgate explícito do link, com token de uso único e consumo atômico.
- **Revogação de roles internas:** aceita-se que a remoção de `admin`/`staff` no Netlify Identity só produza efeito no próximo login/refresh da sessão. Não criar uma segunda fonte de roles nem checagem adicional de frescor nesta versão; reavaliar se a operação passar a exigir revogação imediata.

Esta formalização não inclui valores de credenciais nem altera a produção. O projeto Supabase de desenvolvimento `jaedzligsqazyjelpweu` foi criado em `sa-east-1`, está saudável e recebeu a migration `20261012202813_temporary_access_v1`. A conexão em runtime depende de `DATABASE_URL` e Gmail; os nomes e escopos das variáveis de projeto continuam sem leitura independente. `/admin.html` é uma tela pública de login sem dados administrativos; APIs e bootstrap de preços exigem `admin`. Não tratar como produção pronta até passar pelos gates do runbook `docs/runbooks/cp-public-auth-credentials-2026-10-12.md`.

## Objetivo e estado preservado

O site permanece estático no fluxo Netlify existente. As rotas `/`, `/viewer/`, `/how-it-works/` e `/about/` ficam públicas. As alterações locais passam a restringir `/config/`, `GET /api/configuration` e `/data/mock-price-book.js`, mas só terão efeito quando integradas e implantadas; até lá, produção continua com o comportamento anterior.

Usar Netlify Identity para contas internas `admin` e `staff`. Visitantes `user` recebem acesso temporário ao configurador por link/token enviado ao e-mail, sem conceder papel Identity permanente. Manter Identity responsável pelo admin e suas escritas existentes. Não adicionar Clerk, Firebase ou um banco novo por padrão.

## Matriz de acesso pretendida

| Tipo | Rotas públicas | `/config/` e outras páginas internas | `/admin.html` e APIs administrativas |
| --- | --- | --- | --- |
| Anônimo | Sim | Não | Não |
| Identity `staff` | Sim | Sim, com login | Não |
| Identity `admin` | Sim | Sim, com login | Sim, com login e papel `admin` |
| `user` com link temporário | Sim | Somente configurador, até expirar | Não |

`admin` tem precedência sobre `staff` se uma conta tiver ambos. Nenhuma conta recebe papel por cadastro público: preferir Identity em modo `Invite only`; conceder `admin` e `staff` explicitamente. `user` descreve uma concessão temporária de acesso, não um terceiro papel Identity.

## Regras por camada

1. Netlify Identity autentica `admin` e `staff`. No servidor, `getUser()` valida a sessão e as Functions verificam o papel em `user.roles`; nunca confiar em papel, email ou ID vindo do browser.
2. Para páginas internas, o gate aceita `staff` ou `admin`. `/admin.html`, recursos administrativos e endpoints de escrita exigem `admin`. Páginas públicas ficam fora das regras de gate.
3. `/config/*` precisa aceitar `admin`, `staff` ou uma concessão temporária válida `config`. Como o link temporário não é uma role Identity, um redirect estático com `Role=` não resolve esse caso sozinho: uma Edge Function restrita aos caminhos protegidos deve validar Identity ou a sessão temporária antes de continuar até o HTML/asset.
4. APIs repetem a autorização no próprio boundary. O GET raw `/api/configuration`, PUT, `/api/admin-bootstrap` e quaisquer APIs administrativas exigem `admin`. O comprador recebe `/api/buyer-configuration`, DTO allowlisted com `staff`/`admin` ou grant temporário `config`; não entregar o schema v5 administrativo integral como API de comprador. Respostas privadas usam `no-store`.
5. Proteger acesso direto aos caminhos servidos pelo CDN, não só a navegação e o HTML. Inventariar `/config/index.html`, aliases, scripts, preço/configuração estáticos e assets necessários. Mover dados comerciais protegidos para rotas privadas ou servi-los por endpoint autorizado se houver caminho estático público compartilhado.
6. Toda resposta privada/autorizada usa `Cache-Control: no-store`; nunca registrar token, cookies, PII, configuração bruta ou preços protegidos.

## Link temporário para `user` — contrato e pendências de execução

O link precisa ser uma concessão de curta duração e escopo explícito (`config`), sem role duradoura. A duração inicial decidida é **3 horas**, configurável sem migração de schema. A expiração precisa valer tanto no HTML/assets quanto nas APIs e não pode ser renovada silenciosamente.

Fluxo recomendado a validar: `admin` ou `staff` solicita acesso para um e-mail; o backend emite segredo aleatório de alta entropia, envia uma URL de resgate pelo Gmail e persiste apenas o hash do segredo e os campos mínimos de vínculo, escopo e expiração. A pessoa abre a página neutra de resgate e confirma explicitamente; um `POST` troca o segredo por cookie `HttpOnly`, `Secure`, `SameSite` e de curta duração. Limpar o fragmento da URL após resgate. Um token colocado em query string pode vazar por histórico, logs e `Referer`; não resgatar com GET automático para evitar que scanners de links consumam o token.

Para limitar compartilhamento e replay, o token de resgate é **de uso único**, vinculado ao e-mail, e a sessão temporária expira junto com o grant ou antes. Isso exige armazenamento durável e consumo concorrente atômico. Netlify Blobs não deve ser presumido como transacional/compare-and-swap para esse passo. `admin` e `staff` podem emitir e revogar grants. Gmail é o transporte inicial decidido, ainda sem credenciais/configuração ou validação de entrega. A prova de email ocorre pelo resgate explícito do link recebido; não criar uma conta permanente do cliente.

Links de convite/confirmação do Identity não são automaticamente equivalentes ao acesso temporário acima: transformam-se em conta e sessão Identity e não devem ser tratados como garantidamente válidos por 3 horas sem verificar o ciclo de sessão.

## Limite importante das roles Identity

Roles Netlify Identity vivem em `app_metadata.roles` e são carregadas no JWT. A documentação informa que alterações de papel não invalidam o JWT ativo: a nova permissão vale no próximo login ou refresh. Por decisão de 2026-10-12, esse atraso é aceito para contas internas nesta versão; não será acrescentada uma fonte concorrente de roles. Não prometer um prazo exato de expiração de sessão sem confirmar a configuração/runtime do site.

Netlify permite role-based redirects para regras simples de path e `getUser()` em Functions/Edge Functions para checks próprios. Não misturar um segundo provedor JWT externo com Identity; o token de usuário proposto deve ser um grant independente verificado explicitamente pela Edge/Function, não fingir que é role nativa de Identity.

## Sequência segura

1. Usar a matriz de paths públicos, internos e administrativos acima; `admin` e `staff` estão autorizados a emitir e revogar grants.
2. Configurar Supabase Postgres Free e Gmail, confirmar conectividade/entrega, definir exportação externa e validar emissão, consumo único atômico, vínculo de email, expiração inicial de 3 horas e revogação por `admin`/`staff`.
3. A policy `Identity actor + role | temporary config grant` já está implementada localmente; comprovar que falta de credenciais faz as rotas falharem fechadas. Admin Identity continua usando a tela existente.
4. Validar o gate Edge local em `/config/*` e `/data/mock-price-book.js`, mais as autorizações próprias das Functions, incluindo caminhos diretos, aliases, URLs Netlify, APIs e assets; confirmar que páginas públicas continuam abertas. `/admin.html` é a tela de login; seus dados e APIs administrativas exigem `admin`.
5. O comprador já migrou localmente para DTO allowlisted; confirmar no preview que o raw v5 não aparece no endpoint buyer e preservar `GET /api/public-modules` público.
6. Testar anônimo, staff, admin, token válido/inválido/expirado/reutilizado, revogação, scanner de e-mail, acesso a caminho direto, bypass de API, previews, domínio customizado e regressões do configurador antes de produção.

## Referências oficiais

- [Netlify Identity em Functions e Edge Functions](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/): validação da sessão e leitura de roles server-side.
- [Netlify role-based access control](https://docs.netlify.com/manage/security/secure-access-to-sites/role-based-access-control/): redirects por role, `app_metadata.roles` e atraso de atualização até login/refresh.
- [Netlify Identity: usuários existentes e atribuição de roles](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/manage-existing-users/): concessão de roles por dashboard ou função administrativa.
- [Netlify Edge Functions — cadeia de requests](https://docs.netlify.com/build/edge-functions/api/): a Edge pode interceptar antes de redirects e entrega estática.
- [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/): rever garantias reais antes de depender de consumo concorrente de token.
