# CP-PUBLIC — plano de arquitetura de acesso até a decisão de provedor

**Status:** plano canônico proposto; nenhuma autenticação nova, gate ou integração de e-mail foi ativada.  
**Base remota observada:** `main` em `38a314fb3d9830e43310e59c0166197fd19341e0` (merge da PR #193, 2026-10-11).  
**Fronteira em aberto:** Netlify-only versus Clerk para autenticação dos compradores e envio/verificação de e-mail. O ticket de suporte do Clerk está pendente.  
**Decisões já acordadas nesta conversa:** validade do acesso do comprador de 3 horas; Identity `admin` e `staff` podem emitir e revogar grants; destinatário comprova controle do endereço de e-mail; o grant só dá acesso ao configurador.  
**Não é autorização para deploy, provisionar serviços, configurar credenciais, migrar dados ou alterar produção.**

Este documento reconcilia o desenho Identity/Blobs recente com o trabalho histórico nas PRs #181, #183 e #185–#186. As PRs antigas são referência e material de análise, não código aprovado para merge.

## 1. Objetivo e invariantes

- Preservar Netlify e o fluxo de deploy existente.
- Manter públicas a landing em `/`, o viewer em `/viewer/`, `/how-it-works/` e `/about/`.
- Aplicar autorização no servidor/CDN e em cada API. Navegação oculta, redirecionamento em JavaScript ou HTML estático não constituem gate.
- `admin` pode acessar páginas públicas, internas e administrativas.
- `staff` pode acessar páginas públicas e internas, menos administração.
- Um comprador sem papel permanente pode acessar páginas públicas e o configurador somente com grant válido de escopo `config:read`, limitado a três horas. O grant não concede acesso administrativo ou escrita.
- `admin` e `staff` podem emitir e revogar grants. A função que executa essas ações valida sua identidade/role no servidor; nenhum papel ou e-mail recebido do browser é confiável por si.
- Conservar a autoridade dos dados no catálogo/administração vigentes. O comprador recebe uma projeção allowlisted necessária à UI, não o objeto bruto administrativo por conveniência.
- Nenhuma atualização de credenciais, Blobs comerciais, configuração de produção ou publicação faz parte deste plano.

## 2. Estado confirmado em `main`

Leitura remota de `main`, arquivos atuais:

- `netlify/functions/configuration.mjs`: `GET /api/configuration` lê e retorna configuração publicada antes de autenticar; `PUT` verifica Identity e role `admin`. Portanto o GET integral segue público hoje e o PUT segue administrativo. A resposta não deve ser confundida com um DTO de comprador.
- `netlify.toml`: `/api/configuration` reescreve para a Function; a URL direta da Function também precisa receber a mesma policy quando o GET for protegido.
- `app/config/index.html`: shell do configurador estático em `/config/`, carrega muitos scripts/dados com base na raiz do domínio.
- `app/app.js`: navegador solicita `/api/configuration` e tem tratamento legado para continuar sem uma resposta utilizável. O cutover deve trocar esse bootstrap por resposta autorizada e bloquear UI/preços desde o primeiro paint quando não houver autorização válida.
- `app/data/mock-price-book.js` é um arquivo estático carregado pelo cliente e contém valores numéricos de estimativa comercial. Restringir somente a API não o torna privado.
- `GET /api/public-modules` é a projeção pública allowlisted usada pelo viewer; deve permanecer separada e pública.
- `package.json` em `main` inclui `@netlify/blobs` e `@netlify/identity`, sem dependência PostgreSQL ou Clerk. Não há base para dizer que esses provedores já estão ligados ao runtime principal.

**Consequência:** não ativar gate parcial. O acesso hoje continua público nos pontos acima; mudar o HTML ou só o GET sem migrar o consumidor e proteger seus recursos pode quebrar o configurador ou expor uma falsa garantia.

## 3. Contrato de autorização alvo

| Principal | Rotas públicas | Páginas internas comuns | `/config/` + DTO comprador | `/admin.html`, GET raw e escrita |
| --- | --- | --- | --- | --- |
| Anônimo | permitido | negado | negado | negado |
| Identity `staff` | permitido | permitido | permitido | negado |
| Identity `admin` | permitido | permitido | permitido | permitido |
| Comprador com identidade de e-mail verificada e grant ativo | permitido | negado | somente leitura, grant `config:read` | negado |
| Sessão/grant expirado ou revogado | permitido | negado | negado | negado |

Inventariar a lista real de páginas internas antes de codificar regras de rota; não inferir que `/config/` seja a única página interna. O grant do comprador não abre outras rotas internas.

## 4. Grant e comprovação de e-mail

### Decidido

- Duração de autorização: **3 horas** após resgate bem-sucedido; prazo centralizado numa configuração única. Alterar o valor no futuro será simples para novos grants; grants já emitidos conservam o seu `expiresAt`.
- Escopo único: leitura do configurador (`config:read`).
- Emissão e revogação disponíveis a `admin` e `staff`, sempre autenticados/validados no servidor.
- A pessoa precisa provar controle do e-mail associado ao grant. Isso prova posse da caixa postal naquele momento, não identidade civil.
- Resgate exige ação explícita via POST. Um GET de scanner de e-mail não consome o acesso.

### Contrato neutro ao provedor

A emissão cria um grant pendente associado a endereço normalizado, escopo, emissor, timestamps, estado e identificador aleatório. Não armazenar segredo de resgate em claro. O destinatário autentica/verifica o mesmo e-mail; o servidor compara o endereço verificado com o grant pendente, consome a autorização de resgate uma só vez e emite cookie de sessão opaco `Secure; HttpOnly; SameSite=Lax; Path=/`. O cookie nunca excede a expiração de três horas. Respostas privadas usam `Cache-Control: no-store`; segredos, cookies, e-mail e dados de configuração não entram em logs.

O segredo de resgate, caso usado, tem vida mais curta que o grant e uso único. A duração exata do ticket de resgate e o início exato da janela de 3h devem ficar explícitos na implementação: recomendação deste plano é iniciar as três horas no primeiro resgate válido, sem renovação silenciosa.

Condições de concorrência a comprovar antes do cutover:
1. Duas tentativas simultâneas com o mesmo segredo produzem no máximo um resgate/sessão.
2. Revogação e resgate concorrentes têm resultado serializável segundo a última transição condicional válida; não há sessão emitida a partir de grant já revogado.
3. Falha entre consumir o ticket e criar a sessão não perde o estado parcialmente; operações que precisem ser indivisíveis compartilham uma transação ou uma estratégia atômica demonstrada.
4. Toda verificação de sessão confere expiração, revogação e escopo no servidor; cookie assinado localmente não substitui o estado necessário à revogação.

## 5. Opções que aguardam a resposta do Clerk

### A. Netlify-only

- Identity autentica `admin` e `staff`; Functions validam roles.
- Um serviço transacional separado entrega código/link de verificação ao e-mail do comprador; depois do resgate, o servidor cria a sessão/grant de 3h.
- Armazenamento de grants pode reaproveitar o padrão Blobs `strong read + ETag + onlyIfMatch + readback` já usado em `app/core/v5-normal-save.js`, **sujeito a gate real de concorrência** para resgate e revogação. Se o runtime não garantir a semântica necessária, adotar o mecanismo transacional já prototipado em PostgreSQL, sem improvisar locks em memória.
- Vantagem: não introduz segundo provedor de identidade para compradores. Custo/limites e responsabilidade de entrega de e-mail dependem do serviço escolhido.
- Ponto de atenção: Identity não é o mecanismo do grant temporário; ele não deve virar role permanente.

### B. Clerk para compradores; Identity continua para `admin`/`staff`

- Netlify Identity continua autenticando os operadores internos e protegendo emissão/revogação.
- Clerk fornece identidade/login de comprador e prova de e-mail. O servidor só ativa o grant pendente quando a sessão Clerk verificada pertence ao mesmo e-mail que `admin`/`staff` autorizou.
- A autorização de três horas continua própria do site; uma sessão Clerk mais longa não estende o grant. Revogação/expiração devem ser conferidas no boundary de API e de recursos protegidos.
- Grant em Blobs com escrita condicional continua sendo uma opção a comprovar; Clerk não torna o estado do grant ou o gate Netlify automaticamente atômicos.
- Vantagem: prepara contas e login persistente de clientes se isso virar requisito. Custo é a coexistência temporária de Identity e Clerk e a necessidade de conciliar identidades com e-mail verificado.
- Pendência decisiva: resposta do suporte sobre limites e política de entrega de códigos/links de e-mail em produção no plano considerado. A página de preços lista verificação por e-mail, mas não publica uma franquia de envio que possamos usar como garantia.

### C. Migração de `admin`/`staff` para Clerk

Fora do recorte. Não é pré-requisito para Clerk de compradores e exigiria plano de migração próprio para papéis, sessões, página admin e operações existentes.

### Evidência anterior que deve ser aproveitada, sem adotar automaticamente

A PR #186 prototipou tickets de 256 bits com digest SHA-256, ticket curto, sessão no cookie seguro, transação PostgreSQL `UPDATE ... consumed_at IS NULL ... RETURNING` + `INSERT session`, quotas com locks transacionais e integração Resend. Seu gate CI usou PostgreSQL 16 descartável e concorrência de 32 resgates com um vencedor. Era DRAFT/HOLD; não alterou `main`, produção, banco ou credenciais. Diferenças a reconciliar: expirava ticket em 15 min e sessão em 12 h, emissão somente por `admin`, e dependia de PostgreSQL/Resend. As decisões desta conversa substituem esses parâmetros: `admin` **e** `staff` emitem/revogam, o acesso dura 3 h, e serviço/identidade continuam aguardando decisão. Não portar essa PR wholesale nem reintroduzir PostgreSQL sem necessidade comprovada.

## 6. Inventário de segurança — trabalho neutro a fazer antes/depois da escolha

### Fazer antes de escolher provedor

1. Construir inventário arquivo → URL publicada → consumidor → classificação (público, interno, admin, dado comercial) para:
   - HTML estático e aliases, incluindo `/config/`, `/config/index.html`, `/index.html` e URL direta Netlify;
   - scripts, CSS, imagens e dados carregados por caminhos desde `/`;
   - configuração raw e projeção de comprador;
   - `mock-price-book.js`, dados de catálogo/cena e ativos incluídos em bundles;
   - `/admin.html`, API normal e URL direta de cada Function.
2. Identificar quais recursos são compartilhados com landing/viewer. Um caminho compartilhado necessário ao conteúdo público não pode ser simplesmente bloqueado sem separar o artefato ou mover o dado protegido para entrega autorizada.
3. Fazer matriz rota × método × principal com status esperado (401/403/200) e cabeçalhos privados. Distinguir `GET` raw admin, DTO comprador e projeção pública do viewer.
4. Preparar sequência de cutover/rollback que mantenha a superfície atual honesta até os gates finais e nunca reabra acesso raw anônimo como rollback.
5. Atualizar ponteiros do handoff/issue #192 para este plano e marcar a divergência dos documentos antigos.

### Implementar somente após selecionar provedor

1. Policy pura: `public | internal(role) | admin | buyer(config:read, expiresAt, revokedAt)`; rejeitar default permissivo e validar identidade no servidor.
2. Adaptador de ator do provedor escolhido; usar contratos pequenos. Não criar abstração genérica multi-provedor antes da decisão.
3. Endpoints de emissão, consulta/resgate, sessão e revogação, protegidos por Identity `admin` ou `staff`; limite antiabuso/rate limit e confirmação do emissor.
4. Persistência atômica de estado de ticket/grant/sessão; selecionar Blobs-CAS ou PostgreSQL pela evidência do gate concorrente, não por suposição. Se PostgreSQL for necessário, usar migração isolada aprovada; nada de auto-provisionamento oculto em build/deploy.
5. Migrar o configurador para DTO allowlisted de comprador e bootstrap fail-closed desde o primeiro paint.
6. Proteger entrega de HTML e todos os assets/dados comerciais diretos via Edge/Function/CDN; proteger cada API independentemente. A URL direta da Function e rewrites devem ter a mesma policy.
7. Só então executar testes e validações: policies, concorrência real no backend selecionado, resgate/expiração/revogação, superfície HTTP direta, regressões do configurador e deploy preview com credenciais sandbox. Não usar resultado de teste com fixture interceptada como evidência de auth real.
8. Ativar produção em cutover coordenado, com variáveis/segredos configurados fora do repositório e critérios de rollback documentados.

## 7. Fronteira e próxima ação

**Podemos começar agora:** concluir o inventário de paths/arquivos e rascunhar a matriz endpoint × papel usando o estado atual de `main`. Isso não decide Clerk, e-mail ou storage.

**Esperar pela resposta do Clerk antes de:** selecionar autenticação de clientes, dependência/provedor de envio, criação de conta versus login sob demanda, variáveis de ambiente, cadastro/invite mode ou implementação do adaptador de identidade do comprador.

**Esperar por um gate específico antes de declarar Blobs suficiente:** resgate e revogação concorrentes reais em deploy preview. Se CAS não assegurar único vencedor e consistência observável, reutilizar o modelo transacional PostgreSQL já desenvolvido como alternativa técnica, depois de pesar custo/operação.

**Não fazer ainda:** deploy/auth cutover, provisionar Clerk/DB/Resend, enviar e-mails reais, modificar Blob publicado, proteger rota parcialmente, mesclar PRs antigas, migrar Identity admin, ativar inscrição aberta, ou afirmar que produção está protegida.

## Fontes de trabalho relacionadas

- [Issue #192 — foco CP-PUBLIC atual](https://github.com/EAKerber/MobiliPresenter2D/issues/192) — atualizar para apontar à decisão de provedor pendente.
- [PR #181 — inventário de superfícies e duplicações](https://github.com/EAKerber/MobiliPresenter2D/pull/181) — aproveitar análise de assets, APIs e rotas; DRAFT/HOLD.
- [PR #183 — plano de sessão/autorização](https://github.com/EAKerber/MobiliPresenter2D/pull/183) — plano histórico; não tratar Clerk como decisão atual.
- [PR #185 — buyer DTO](https://github.com/EAKerber/MobiliPresenter2D/pull/185) — candidato a reutilizar depois de reconciliação.
- [PR #186 — ticket/session + PostgreSQL + Resend](https://github.com/EAKerber/MobiliPresenter2D/pull/186) — protótipo detalhado com teste PostgreSQL concorrente; DRAFT/HOLD, não merged.
- [`v5-normal-save.js`](https://github.com/EAKerber/MobiliPresenter2D/blob/main/app/core/v5-normal-save.js) — padrão atual de atualização condicional ETag e readback para publicação v5.
- [Arquitetura Identity de 2026-10-10](https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/architecture/cp-public-netlify-identity-access-2026-10-10.md) — registro anterior; decisões abertas e premissas supersedidas neste plano.
