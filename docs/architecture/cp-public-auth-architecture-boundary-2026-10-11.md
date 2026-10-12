# CP-PUBLIC — plano de arquitetura de acesso até a decisão de provedor

**Status:** plano canônico proposto; nenhuma autenticação nova, gate ou integração de e-mail foi ativada.  
**Base original do plano:** `main` em `38a314fb3d9830e43310e59c0166197fd19341e0` (antes da PR #197). A atualização corrente está registrada abaixo.  
**Fronteira em aberto:** Netlify-only versus Clerk para autenticação dos compradores e envio/verificação de e-mail. O ticket de suporte do Clerk está pendente.  
**Decisões já acordadas nesta conversa:** validade do acesso do comprador de 3 horas; Identity `admin` e `staff` podem emitir e revogar grants; destinatário comprova controle do endereço de e-mail; o grant só dá acesso ao configurador.  
**Não é autorização para deploy, provisionar serviços, configurar credenciais, migrar dados ou alterar produção.**

Este documento reconcilia o desenho Identity/Blobs recente com o trabalho histórico nas PRs #181, #183 e #185–#186. As PRs antigas são referência e material de análise, não código aprovado para merge.

### Atualização de estado e decisão comercial — 2026-10-12

A `main` atual é `717dec38f6ceb162bc1aa03c347cd64376b2a7e7`; a produção está em `6acc3141c830050008998c37` (`ready`), com o mesmo commit. A PR #197 validou e publicou a limpeza do diretório auxiliar depois do empacotamento das Functions. Isso removeu documentação, relatórios e ferramentas do payload estático, mas não alterou a fronteira comercial ou de autenticação.

**Decisão do usuário:** preços são privados por padrão e só devem ser exibidos no contexto autorizado do configurador. Uma futura abertura pública precisa ser simples de reverter e limitar-se a uma projeção própria de preços. O alvo é um controle server-side `publicPricingEnabled`, com padrão `false`; quando explicitamente habilitado, ele libera somente um DTO de preços allowlisted. Esse controle não libera `GET /api/configuration`, recursos administrativos ou dados brutos. O local e o operador desse controle serão definidos no cutover, após o provedor; nenhuma exposição pública está habilitada agora.

**Estado atual ainda não cumpre essa política:** `/data/mock-price-book.js` continua incluído no shell público de `/config/`, e `GET /api/configuration` continua respondendo sem autenticação. A rota pública do viewer, `/api/public-modules`, segue separada e sem preços. Portanto, a decisão foi registrada, mas a privacidade de preços ainda depende de um cutover coordenado com autenticação e migração do bootstrap do configurador. Os detalhes HTTP das seções 10–12 são evidência do snapshot anterior; não descrevem o payload após a limpeza da PR #197.


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
- Usar PostgreSQL para tickets, grants e sessões: o resgate consome o ticket e cria a sessão atomicamente; revogação e limites por destinatário/emissor também são operações transacionais. Manter Blobs para a publicação atual do configurador, cujo CAS protege a atualização de um único documento. Isso não exige migrar a configuração inteira.
- Vantagem: não introduz segundo provedor de identidade para compradores. Custo/limites e responsabilidade de entrega de e-mail dependem do serviço escolhido.
- Ponto de atenção: Identity não é o mecanismo do grant temporário; ele não deve virar role permanente.

### B. Clerk para compradores; Identity continua para `admin`/`staff`

- Netlify Identity continua autenticando os operadores internos e protegendo emissão/revogação.
- Clerk fornece identidade/login de comprador e prova de e-mail. O servidor só ativa o grant pendente quando a sessão Clerk verificada pertence ao mesmo e-mail que `admin`/`staff` autorizou.
- A autorização de três horas continua própria do site; uma sessão Clerk mais longa não estende o grant. Revogação/expiração devem ser conferidas no boundary de API e de recursos protegidos.
- O estado de tickets, grants e sessões continua em PostgreSQL independentemente de Clerk. Clerk autentica/verifica o comprador, mas não substitui a transação que consome o grant, abre a sessão e permite revogá-la.
- Vantagem: prepara contas e login persistente de clientes se isso virar requisito. Custo é a coexistência temporária de Identity e Clerk e a necessidade de conciliar identidades com e-mail verificado.
- Pendência decisiva: resposta do suporte sobre limites e política de entrega de códigos/links de e-mail em produção no plano considerado. A página de preços lista verificação por e-mail, mas não publica uma franquia de envio que possamos usar como garantia.

### C. Migração de `admin`/`staff` para Clerk

Fora do recorte. Não é pré-requisito para Clerk de compradores e exigiria plano de migração próprio para papéis, sessões, página admin e operações existentes.

### Evidência anterior que deve ser aproveitada, sem adotar automaticamente

A PR #186 prototipou tickets de 256 bits com digest SHA-256, ticket curto, sessão no cookie seguro, transação PostgreSQL `UPDATE ... consumed_at IS NULL ... RETURNING` + `INSERT session`, quotas com locks transacionais e integração Resend. Seu gate CI usou PostgreSQL 16 descartável e concorrência de 32 resgates com um vencedor. Era DRAFT/HOLD; não alterou `main`, produção, banco ou credenciais. Diferenças a reconciliar: expirava ticket em 15 min e sessão em 12 h, emissão somente por `admin`, e dependia de PostgreSQL/Resend. As decisões desta conversa substituem esses parâmetros: `admin` **e** `staff` emitem/revogam, o acesso dura 3 h, e serviço/identidade continuam aguardando decisão. Não portar essa PR wholesale nem reintroduzir PostgreSQL sem necessidade comprovada.

## 6. Inventário de segurança — evidência verificada em `main`

Leitura do snapshot de `main` em `38a314fb3d9830e43310e59c0166197fd19341e0`; os caminhos de preço e autorização foram rechecados na `main` `717dec38f6ceb162bc1aa03c347cd64376b2a7e7`. O inventário abaixo cobre os pontos de entrada e consumidores centrais encontrados; ainda não é uma enumeração exaustiva de todos os arquivos publicados.

### Rotas, shells e recursos estáticos observados

| URL/caminho publicado | Consumidor e conteúdo | Classificação atual / consequência |
| --- | --- | --- |
| `/` (`app/index.html`) | Landing; usa CSS, scripts, imagens e dados em `/landing/**`. | Pública. |
| `/viewer/` (`app/viewer/index.html`) | Viewer; carrega catálogo/cena/máscaras e o renderizador compartilhado, depois consulta `GET /api/public-modules`. | Pública. A projeção é allowlisted; não bloquear seus recursos visuais compartilhados sem separar dependências. |
| `/how-it-works/`, `/about/` | Páginas públicas estáticas; reutilizam tema, CSS e logo da landing. | Públicas; assets comuns também são usados pela landing. |
| `/config/` e `/config/index.html` (`app/config/index.html`) | Shell do configurador; `<base href="/">` carrega `/styles.css`, `/data/**`, `/core/**`, `/assets/kitchen/base.png` e `/app.js`. O cliente busca `GET /api/configuration`. | Shell, JS, CSS e imagens são URLs estáticas públicas no deploy atual. Um gate apenas no HTML deixaria os dados/recursos acessíveis por URL direta. O catálogo e a cena também têm consumidores públicos; preço comercial e outros dados exigem classificação e separação antes do corte. |
| `/admin.html` | Painel carrega scripts, CSS e dados estáticos antes/de forma independente do login da interface. O login Netlify Identity e a seleção visual do editor são executados no browser. | O shell e recursos podem ser obtidos diretamente hoje. Ocultar painel no cliente não é autorização; escrita é protegida separadamente pela Function. |
| `/landing/**`, `/core/**`, `/data/**`, `/assets/**`, `/admin/**` | Aliases/caminhos estáticos sob o diretório publicado `app`; vários arquivos são compartilhados entre rotas e módulos. | O arquivo publicado não ganha proteção pelo fato de uma página pai exigir login. Verificar URL direta de cada arquivo incluído no inventário de cutover. |

`netlify.toml` configura `publish = "app"`, reescritas para as duas Functions abaixo e redirects 301 dos aliases antigos `/landing`, `/landing/como-funciona` e `/landing/quem-somos`. Assim, a pasta publicada não é uma fronteira de segurança. A lista de diretórios acima é representativa dos imports observados, não uma prova de que foram enumerados todos os nomes/aliases possíveis.

### APIs e caminhos diretos das Functions

| Endpoint | Métodos/consumidores observados | Estado atual em `main` | Alvo de autorização |
| --- | --- | --- | --- |
| `/api/configuration` → `/.netlify/functions/configuration` | `GET` pelo configurador; `PUT` pelo admin. A URL direta `/.netlify/functions/configuration` executa o mesmo handler. | `GET` retorna publicação raw ou fallback sem autenticação; `PUT` valida Netlify Identity e exige role `admin`. | Remover GET raw anônimo. Separar leitura do comprador (DTO allowlisted, grant `config:read`) da leitura/escrita administrativa; preservar escrita restrita a `admin` salvo mudança deliberada na matriz. Aplicar policy idêntica no rewrite e na URL direta. |
| `/api/public-modules` → `/.netlify/functions/public-modules` | `GET` somente, usado pelo viewer; sem query string. A URL direta da Function também chega ao handler. | Projeção pública allowlisted, sem preço, revision, ETag opaco ou metadados admin; responde 503 se a publicação estiver ausente/inválida, com fallback limitado à projeção pública primária em deploy-preview sem snapshot local. | Manter pública e independente do DTO do configurador; preservar validação e falha fechada. |

As duas Functions declaram explicitamente métodos aceitos. A consulta atual a `GET /api/configuration` no `app/app.js` mantém caminho legado de continuidade quando há certos erros HTTP; no cutover buyer-auth isso deve deixar de permitir qualquer bootstrap com configuração local/estática ou estado de preço quando não houver resposta autorizada. O estado atual não é uma proteção parcial confiável.

### Dados e classificação

- `app/data/mock-price-book.js` é entregue ao browser do configurador e também incluído pela Function/admin. Contém valores comerciais estimados por módulo/acabamento/serviço e disclaimer; o arquivo declara que custo, margem e dados de fornecedor não devem estar nele. A decisão registrada em 2026-10-12 é tratar esses valores como privados por padrão e exibi-los somente após autorização para o configurador. Uma abertura pública futura deve usar controle server-side independente, desligado por padrão, e DTO allowlisted específico; não deve liberar a configuração bruta. O deploy atual ainda serve o arquivo estaticamente, portanto essa política é um alvo de cutover, não uma proteção já ativa.
- `app/data/catalog-data.js`, `scene-data.js`, `mask-data.js` e diversos `core/*.js` alimentam configurador, viewer e/ou Function. Não classificar todo o catálogo/cena como privado por associação: identificar campos e ativos individualmente. A projeção pública já é a fronteira de dados do viewer.
- `app/core/published-buyer-projection.js` é transformação pura, sem I/O ou fallback, carregada pelo shell configurador. Não é endpoint nem autorização; sua presença no cliente não limita acesso a valores de origem.
- `app/admin.html` mostra um formulário/login e painel negado por Identity no cliente, mas o HTML, bundle, CSS e scripts/dados carregados permanecem recursos estáticos. A autenticação client-side não impede download direto desses arquivos.
- Não foi identificada dependência de PostgreSQL ou Clerk no runtime de `main`; o `package.json` observado inclui Blobs, Identity e esbuild.

### Matriz mínima de superfície observada (antes de implementar)

| Recurso/método | Anônimo | Identity `staff` | Identity `admin` | Comprador com e-mail verificado + grant ativo |
| --- | --- | --- | --- | --- |
| Landing, viewer, how-it-works, about; `GET /api/public-modules` | 200 | 200 | 200 | 200 |
| Páginas/recursos internos comuns (a enumerar), incluindo sessão de operador | 401/redirect | 200 | 200 | 401/redirect |
| `GET /config/` e bootstrap/DTO de comprador | 401/redirect | 200 | 200 | 200 apenas com grant e escopo |
| `GET /api/configuration` raw + URL direta da Function | 401/403 | 403 | 200 | 403 |
| `PUT /api/configuration` + URL direta da Function | 401 | 403 | 200 | 403 |
| `/admin.html` e dados exclusivos admin (após separar de assets públicos) | 401/redirect | 403 | 200 | 403 |
| Emissão/revogação de grant | 401 | 200 | 200 | 403 |

Usar 401/403 conforme exista ou não uma identidade autenticada; páginas HTML podem redirecionar para login, mas API/arquivo direto deve responder sem revelar conteúdo protegido. Confirmar política de recursos privados e cabeçalhos `no-store` por caminho durante implementação. A matriz não autoriza atualmente acesso de `staff` à escrita de configuração.

### Pendências antes do cutover

1. Fechar a matriz rota × método × papel/grant com resultados 200/401/403, incluindo `OPTIONS`, query strings, métodos não aceitos, aliases, sessão expirada/revogada e cabeçalhos de cache.
2. Especificar a fronteira de entrega do HTML e dos dados protegidos, mantendo públicos os assets realmente compartilhados com landing/viewer.
3. Especificar o DTO estreito de preço e o ponto único de carregamento autenticado; retirar o preço do bundle estático e do bootstrap/fallback do comprador.
4. Definir o armazenamento operacional do controle server-side `publicPricingEnabled=false`. Quando habilitado no futuro, ele pode abrir somente o DTO público de preços; não altera as regras de identidade nem o GET raw.
5. Preparar cutover e rollback que mantenham a superfície protegida fechada e não recuperem preços por fallback local.
6. Atualizar handoff/issue #192 para apontar o estado da PR #197 e a decisão comercial registrada.

### Implementar somente após selecionar provedor

1. Policy pura: `public | internal(role) | admin | buyer(config:read, expiresAt, revokedAt)`; rejeitar default permissivo e validar identidade no servidor.
2. Adaptador do provedor escolhido, com contratos pequenos; não criar abstração multi-provedor antes da decisão.
3. Endpoints de emissão, consulta/resgate, sessão e revogação, protegidos por Identity `admin` ou `staff`; limite antiabuso/rate limit e auditoria sem segredos.
4. Persistência atômica de estado de ticket/grant/sessão; selecionar Blobs-CAS ou PostgreSQL pela evidência do gate concorrente, não por suposição.
5. Migrar configurador para DTO allowlisted e bootstrap fail-closed desde o primeiro paint, removendo os fallbacks de config/preço locais do caminho de comprador.
6. Proteger entrega de HTML e dados realmente privados por Edge/Function/CDN, todos os aliases e cada API; manter separado o conjunto de recursos públicos compartilhados.
7. Depois executar testes de policies, concorrência real, resgate/expiração/revogação, superfície HTTP direta, regressão do configurador e deploy preview com credenciais sandbox.
8. Ativar produção em cutover coordenado, com segredos fora do repositório e critérios de rollback registrados.

### Revisão de protótipo local — evidência não merged

Leitura somente, sem alterar arquivos, de `work/MobiliPresenter2D`: branch `experiment/public-landing-commercial-viewer`, HEAD local `b67a6fbdaa1af263c6b1e94ab60145320c4a9621`, com alterações staged/unstaged e arquivos não rastreados. O conteúdo a seguir descreve esse snapshot de trabalho, **não** `main`, PR aprovada nem comportamento implantado. Revalidar hashes e estado antes de portar qualquer peça.

**Candidatos reutilizáveis, depois de revisão no branch de implementação limpo:**
- Autenticação de operador no servidor via Netlify Identity, extraindo papéis apenas de `app_metadata.roles`; proteção contra CSRF/origem para mutações; nunca refletir tokens/senhas em URL, resposta ou logs.
- Separação de operações de rascunho e publicação em `/api/admin/configuration` e `/api/admin/publish`, com verificação de identidade em cada handler (a proteção do caminho estático não substitui a proteção da API direta).
- Contrato comercial allowlisted: valores numéricos só para IDs/regras já aprovados; rascunho, publicação, projeção pública e auditoria em registros distintos. É uma fronteira útil para a **tabela de preços**, não para a configuração completa do comprador.
- A tela `/backoffice/` e login separado demonstram como manter edição interna fora do viewer público; ainda requerem classificação de role coerente com o modelo aprovado.

**Divergências que impedem adoção literal:**
- O protótipo usa role customizada `catalog-admin`. A matriz acordada tem `admin` e `staff`; não criar um terceiro papel incidental. Acesso a painel/admin e escrita de catálogo devem continuar coerentes com “staff exceto admin”; emissão/revogação de grants podem ser permitidas a ambos como decisão já tomada.
- O handler experimental `GET /api/configuration` serve apenas uma projeção comercial publicada; no `main` auditado, esse caminho retorna a configuração publicada bruta. Não são contratos intercambiáveis. O comprador precisa de DTO próprio e grant `config:read`.
- O configurador conserva a tabela estática revisada quando a API retorna 404, falha de rede ou contrato inválido. Isso não protege os valores se preço for classificado privado e não é bootstrap fail-closed para o novo fluxo.
- Não há emissão/resgate de ticket de comprador, verificação de posse do e-mail, sessão buyer de 3 horas ou revogação nesse snapshot.
- O repositório comercial usa leitura forte e comparação de revisão antes de `setJSON`, mas gravação não é condicional/transacional. Duas gravações podem passar pela mesma revisão; publicar em paralelo também pode competir por versão/ponteiro. A própria nota local limita o uso a uma pessoa editando. Isso não satisfaz ainda o uso concorrente nem o gate de Blobs-CAS definido no plano.
- O gate Netlify por role cobre `/backoffice/*`; recursos reutilizados em outras rotas e caminhos/arquivos não abrangidos continuam dependendo de policy própria. Não usar o redirect de página como substituto de autorização de API ou assets.

**Destino recomendado:** tratar o protótipo como fonte de ideias para o backoffice de preço e para os handlers protegidos de operador, não como solução de autenticação de comprador nem como branch para merge em bloco. Antes de portar: comparar cada arquivo com `main` atual, separar alterações não relacionadas do checkout sujo, reconciliar papel/DTO/fallback, e escolher uma estratégia de gravação que passe o gate concorrente.

## 7. Fronteira e próxima ação

**Concluído neste plano, sem alterar runtime:** leitura das rotas principais, dos shells `/config/` e `/admin.html`, dos consumidores de `/api/configuration` e `/api/public-modules`, da publicação estática (`publish = "app"`), de recursos compartilhados e da classificação inicial do preço. A matriz mínima agora separa página pública, interno, admin e comprador com grant.

**Concluído sem escolher provedor:** inventário estático e busca de referências internas; limpeza do publish e validação no Preview pela PR #197; classificação dos preços como privados por padrão. **Próximo trabalho neutro ao provedor:** fechar a matriz HTTP e o roteiro de cutover/rollback; definir o limite entre assets públicos compartilhados e recursos protegidos; especificar o DTO de preço e o controle server-side `publicPricingEnabled=false`, sem ativar exposição pública ou autenticação.

**Esperar pela resposta do Clerk antes de:** selecionar autenticação de clientes, dependência/provedor de envio, criação de conta versus login sob demanda, variáveis de ambiente, cadastro/invite mode ou implementação do adaptador de identidade do comprador.

**Persistência já recomendada para grants:** PostgreSQL, com base no fluxo transacional já exercitado na PR #186 e na orientação do Netlify para dados por usuário e operações transacionais. Não precisamos testar Blobs como banco de sessões. Blobs permanece no salvamento/publicação de configuração já vigente; isso não implica reescrever esse subsistema.

**Não fazer ainda:** deploy/auth cutover, provisionar Clerk/DB/Resend, enviar e-mails reais, modificar Blob publicado, proteger rota parcialmente, mesclar PRs antigas, migrar Identity admin, ativar inscrição aberta, ou afirmar que produção está protegida.

## Fontes de trabalho relacionadas

- [Issue #192 — foco CP-PUBLIC atual](https://github.com/EAKerber/MobiliPresenter2D/issues/192) — atualizar para apontar à decisão de provedor pendente.
- [PR #181 — inventário de superfícies e duplicações](https://github.com/EAKerber/MobiliPresenter2D/pull/181) — aproveitar análise de assets, APIs e rotas; DRAFT/HOLD.
- [PR #183 — plano de sessão/autorização](https://github.com/EAKerber/MobiliPresenter2D/pull/183) — plano histórico; não tratar Clerk como decisão atual.
- [PR #185 — buyer DTO](https://github.com/EAKerber/MobiliPresenter2D/pull/185) — candidato a reutilizar depois de reconciliação.
- [PR #186 — ticket/session + PostgreSQL + Resend](https://github.com/EAKerber/MobiliPresenter2D/pull/186) — protótipo detalhado com teste PostgreSQL concorrente; DRAFT/HOLD, não merged.
- [`v5-normal-save.js`](https://github.com/EAKerber/MobiliPresenter2D/blob/main/app/core/v5-normal-save.js) — padrão atual de atualização condicional ETag e readback para publicação v5.
- [Arquitetura Identity de 2026-10-10](https://github.com/EAKerber/MobiliPresenter2D/blob/main/docs/architecture/cp-public-netlify-identity-access-2026-10-10.md) — registro anterior; decisões abertas e premissas supersedidas neste plano.


## 8. Política reversível para preços

**Padrão recomendado enquanto a decisão comercial não estiver tomada:** preços não acessíveis a anônimos. “Privado” aqui significa que não são publicados como recurso estático nem incluídos nas rotas públicas; admin, staff e compradores com grant ativo podem recebê-los quando necessários ao configurador. Isso é um default técnico reversível, não uma decisão de negócio permanente.

### Contrato que reduz o retrabalho futuro

- Preservar uma única fonte canônica das regras e valores de preço, vinculada à publicação administrativa vigente. Não manter um segundo catálogo de preços no viewer ou no cliente.
- Expor ao configurador um DTO estreito e allowlisted de preços por um endpoint próprio, por exemplo GET /api/pricing. A policy inicial aceita sessão interna válida ou grant buyer ativo; a resposta não inclui configuração bruta, margem, custo ou metadados administrativos.
- Manter a projeção pública /api/public-modules separada e sem preço. Não tornar GET /api/configuration bruto anônimo quando preços forem liberados.
- Para torná-los públicos no futuro, alterar a policy do endpoint de preços para também aceitar anônimos, após decisão comercial explícita e revisão dos campos/valores retornados. O contrato, fonte de dados e cálculo podem permanecer iguais; não exige migração de banco ou troca de provedor.
- Como o endpoint poderá servir conteúdo público se a política mudar, ele deve sempre retornar somente o DTO comercial aprovado. Manter Cache-Control: no-store é válido mesmo depois de público, embora a política de cache possa ser revista separadamente por desempenho.

### O que precisa mudar para que o default privado seja verdadeiro

Hoje app/data/mock-price-book.js está dentro do diretório Netlify publicado e contém valores; bloquear somente a tela /config/ ou a API não protege a URL direta desse arquivo. No cutover, retirar os valores do bundle estático: colocar a fonte canônica em caminho não publicado ou carregá-la do armazenamento de publicação no servidor, remover referências de preço embutidas no HTML/JS e eliminar fallbacks locais com valores. O editor administrativo deverá obter a cópia de trabalho por leitura autenticada; o configurador só recebe o DTO após autorização.

A etapa inicial exige trabalho real de separação e migração do carregamento, porque o sistema hoje entrega valores em arquivos estáticos. **A etapa posterior para publicá-los é pequena** se essa separação tiver sido feita: liberar o mesmo endpoint estreito para anônimos e revalidar que não houve exposição de outros dados. Não se deve deixar uma cópia estática pública “por compatibilidade”, pois isso anularia a policy.



## 9. Persistência: Blobs para publicação, PostgreSQL para grants

A escolha de persistência não precisa ser refeita para todo o produto:

- **Configuração publicada:** manter o modelo Blobs existente e seu compare-and-swap por ETag. Em app/core/v5-normal-save.js, cada salvamento lê o único blob published, valida a revisão, grava com onlyIfMatch e confere ETag, digest e semântica no readback. Esse padrão previne que duas edições concorrentes sobrescrevam silenciosamente a mesma publicação.
- **Acesso temporário:** usar PostgreSQL para tickets, estado do grant e sessões. A PR #186 já tem um adaptador pg que consome o ticket com UPDATE ... RETURNING e insere a sessão na mesma transação/conexão; também serializa as quotas de emissão por destinatário e emissor. Seu teste de integração usou PostgreSQL 16 e 32 resgates concorrentes, com um vencedor. Reutilizar esse desenho, ajustando os papéis, a duração de 3 horas e o provedor de identidade definidos aqui; não portar a PR inteira.
- **Por que não estender Blobs para esse caso:** o CAS do salvamento atual cobre um blob. O fluxo de grants combina estados por usuário, expiração, revogação e operações relacionadas. A documentação atual do Netlify recomenda banco para controle de concorrência avançado/modelo relacional e descreve Blobs como orientado a leituras frequentes e escritas infrequentes. O padrão de configuração não é evidência suficiente para trocar a transação PostgreSQL por Blobs.
- **Hospedagem do Postgres:** Netlify Database é a primeira opção a avaliar por integrar provisão, migrações e branching dos Deploy Previews. Ele só está disponível em planos baseados em créditos e cobra créditos por compute e bandwidth; verificar o plano e o custo esperado da conta antes de provisionar. Se não couber no plano ou orçamento, o adaptador usa uma URL PostgreSQL (CASA_ACCESS_DB_URL) e pode apontar para outro serviço PostgreSQL gerenciado, sem alterar Clerk nem o contrato dos grants.
- Nenhum banco deve ser provisionado ou migrado até a configuração de ambiente ser deliberada. Deploy Preview não pode apontar para o banco de produção durante validação.



## 10. Inventário de publicação estática — confirmado no SHA de main

**Base observada:** main em 38a314fb3d9830e43310e59c0166197fd19341e0; árvore Git completa, sem truncamento. O diretório Netlify de publicação segue como app e o build principal executa o empacotamento do painel admin. Não há arquivo _headers, _redirects ou .netlifyignore na árvore; os redirects observados estão em netlify.toml. Esta é análise da configuração/versionamento, não uma requisição HTTP de cada URL ao deploy publicado.

### Rotas HTML e consumidores

| URL canônica | Arquivo | Dependências que devem continuar públicas / decisão de corte |
| --- | --- | --- |
| / | app/index.html | Usa /landing/data.js, /landing/landing.js, /landing/landing.css, /public-theme.css e /landing/assets/**. Página e conteúdo públicos. |
| /viewer/ | app/viewer/index.html | Usa viewer e renderizador compartilhado; carrega data/scene-data.js, catalog-data.js e mask-data.js, módulos core de cena/desenhos e GET /api/public-modules. Esses dados e ativos necessários ao viewer continuam públicos; não proteger /core/**, /data/** ou /assets/** em bloco. |
| /how-it-works/ | app/how-it-works/index.html | Usa how-it-works.js/css, tema/CSS da landing, assets próprios e logo compartilhado. Página pública. |
| /about/ | app/about/index.html | Usa tema/CSS e assets compartilhados da landing. Página pública. |
| /config/ | app/config/index.html | Define base href=/ e carrega /styles.css, /app.js, /core/**, /data/** e /assets/kitchen/base.png; hoje inclui /data/mock-price-book.js. Requer gate no shell e autorização no bootstrap/API; valores de preço devem deixar de estar nos arquivos estáticos. |
| /admin.html | app/admin.html | Shell estático e scripts carregam configurações, catálogo, cena e mock-price-book.js antes do bundle admin. Login/role no browser não protegem o HTML nem esses URLs. Migrar dados admin exclusivos para leitura autorizada; manter protegidos os endpoints de escrita. |

O índice HTML publica somente essas seis páginas. O roteamento de funções confirmado é /api/configuration → /.netlify/functions/configuration e /api/public-modules → /.netlify/functions/public-modules. Ambos os caminhos diretos chegam ao handler; a policy deve valer nas duas formas. O primeiro handler ainda devolve a configuração bruta anônima em GET; o segundo é o DTO público allowlisted do viewer.

### Recursos compartilhados e conteúdo auxiliar no publish root

A árvore contém 224 arquivos sob app: 6 HTML, 6 CSS, 68 JavaScript, 57 PNG, 16 SVG, 39 WebP, 13 JSON e os demais metadados/scripts. Além dos arquivos de produto, também ficam sob o publish root:

- app/docs/: três documentos de implementação/inventário;
- app/reports/: oito relatórios de validação/materialização;
- app/tools/: scripts de build/teste, imagens-fonte e máscaras de trabalho;
- app/scripts/build-static.sh e app/drizzle/meta/_journal.json.

Como o publish aponta diretamente para app e o build raiz não limpa esses diretórios, devem ser tratados como potencialmente baixáveis por URL enquanto permanecerem ali. A ação simples e compatível com o deploy existente é movê-los para áreas de desenvolvimento fora de app, ou justificar explicitamente os que precisem ser servidos; não mudar o publish directory só para resolver isso. Um exame amostral dos documentos/relatórios pesquisados não encontrou campos óbvios de segredo, mas isso não é uma auditoria completa de credenciais.

O _journal.json encontrado declara dialeto sqlite e nenhuma migration. Não há runtime/driver PostgreSQL nem Clerk na main; a integração Postgres continua somente nos protótipos PR #186. Esse arquivo não é evidência de uma base PostgreSQL ativa.

### Critérios de implementação derivados

1. Gate por rota/arquivo privado e também na Function direta; não depender de menu, login em JavaScript ou redirect não forçado.
2. Manter públicos os quatro shells de conteúdo e os arquivos compartilhados realmente necessários ao viewer/landing.
3. Separar preço e dados administrativos dos módulos públicos compartilhados antes de impor restrição por diretório.
4. Tirar docs, relatórios, ferramentas, fontes e metadados de desenvolvimento de dentro do diretório publicado, mantendo o deploy Netlify e o publish configurado.
5. Validar URL direta dos seis shells, dos assets privados removidos, dos dois rewrites e das duas URLs `/.netlify/functions/*`. A amostragem HTTP ao deploy está registrada na seção 12; ela não cobre cada arquivo individual.

## 11. Classificação dos auxiliares e proposta de exclusão da publicação

Esta proposta preserva `publish = "app"`, o deploy Netlify existente e os arquivos necessários a desenvolvimento/CI. Não é uma alteração de runtime ou deploy aplicada nesta PR.

A documentação oficial descreve o publish directory como a pasta cujos arquivos são implantados, sem um mecanismo de exclusão seletiva de arquivos estáticos identificado na configuração versionada atual. Referências: [configuração de build](https://docs.netlify.com/build/configure-builds/overview/), [configuração por arquivo](https://docs.netlify.com/build/configure-builds/file-based-configuration/) e [ciclo de vida dos build plugins](https://docs.netlify.com/extend/develop-and-share/develop-build-plugins/). O evento `onBuild` ocorre antes do empacotamento das Functions; `onPostBuild` ocorre depois desse empacotamento e antes do deploy. Portanto, não apagar `app/tools` dentro do comando `npm run build`: uma Function importa um módulo dali. A limpeza do publish deve acontecer em um build plugin `onPostBuild`, no checkout efêmero, mantendo `publish = "app"`.

### Classificação inicial

| Caminho atual em `app` | Uso encontrado | Destino/proposta | Condição antes de implementar |
| --- | --- | --- | --- |
| `docs/**` (3 arquivos) | Checkpoints, guia arquitetural e inventário de reuso; documentação para quem mantém o projeto, não carregada pelos shells HTML consultados. O README da raiz aponta para o guia no GitHub, não para uma URL do site. | Manter no Git e excluir somente do publish em `onPostBuild`. | Nenhum import/URL de runtime foi encontrado na busca do repositório; confirmar 404 no Preview. |
| `reports/**` (7 JSON + PNG composto de ~2,1 MB) | Evidência de validação/proveniência; não são imports dos shells. `tools/validate_approved_stone.py` lê `app/reports/hot-swap-integration.json` durante validação de autoria. | Manter no Git e excluir do publish somente em `onPostBuild`, após build e validações. | Confirmar 404 no Preview; não executar a ferramenta de validação depois da limpeza no mesmo checkout. |
| `tools/**` (scripts, testes, máscaras e fontes de imagem) | Necessário a `app/package.json` e a workflows de CI. Exceção funcional: `app/core/v5-normal-save.js`, `v5-publication-inspection.js` e `v5-publication-migration.js` importam `app/tools/v5-publication-preflight.js`; a Function de configuração chega a essa dependência. | Preservar no Git/CI. Remover `app/tools/**` do publish somente em `onPostBuild`, depois de a Function ter sido empacotada. | O Deploy Preview precisa provar que a Function continua executando e que `/tools/v5-publication-preflight.js` retorna 404. |
| `scripts/build-static.sh` | Chamado por `app/package.json` em `build:current`; é necessário até terminar o build da app. | Preservar no Git/CI; excluir do publish em `onPostBuild`. | Confirmar build completo e 404 no Preview. |
| `drizzle/meta/_journal.json` | Journal vazio que declara dialeto SQLite; não há driver ou runtime PostgreSQL em `main`. | Fora da publicação; manter versionado até confirmar se ferramenta futura depende do scaffold Drizzle. | Não remover nem interpretar como banco ativo. |
| `README.md` dentro de `app` | Instruções de desenvolvimento/arquitetura local; não é página HTML de produto. | Fora da publicação; preservar em Git. | Verificar se existe consumidor de download/documentação pública antes de remover do payload. |
| `HOT_SWAP_VALIDATION.json` | Metadado de validação lido por `tools/validate_approved_stone.py`, junto com `app/reports/hot-swap-integration.json`. | Preservar no Git; excluir do publish em `onPostBuild`, após as validações de autoria. | Confirmar 404 no Preview; manter ambos acessíveis às ferramentas no repositório. |
| `.openai/hosting.json` | Metadado de hospedagem do projeto OpenAI Sites com identificador de projeto e diretório `dist`; não é configuração Netlify. | **Preservar por enquanto**; não inferir que possa ser descartado. | Determinar se outra integração ativa depende dele e se deve ficar em `app` ou ser realocado com configuração correspondente. |
| `.gitignore` e `.openai/**` | Metadados ocultos/da ferramenta dentro do publish root. | Não tentar tratá-los como controle de publicação; o `.gitignore` não altera o diretório entregue pelo Netlify. | Decidir junto da investigação de metadados ocultos; não presumir confidencialidade ou remoção segura. |

### Resultado da busca de referências no repositório

A busca foi feita sobre 420 arquivos textuais versionados (extensões textuais, até 150 KB) da árvore `main` em `38a314fb3d9830e43310e59c0166197fd19341e0`; todos foram lidos sem falha. Ela encontrou estas dependências que afetam a limpeza:

- `app/package.json` e os workflows `.github/workflows/app-build-purity.yml`, `public-routing-before-clerk.yml`, `stone-browser.yml` e `summary-pricing-browser.yml` usam scripts sob `app/tools`; manter todos no Git para CI.
- Três módulos em `app/core` importam `app/tools/v5-publication-preflight.js`, alcançados pela Function `netlify/functions/configuration.mjs`; ele deve continuar presente até o empacotamento da Function.
- `tools/validate_approved_stone.py` lê `app/HOT_SWAP_VALIDATION.json` e `app/reports/hot-swap-integration.json`; as ferramentas de autoria continuarão funcionando porque a remoção será apenas do checkout efêmero do deploy, depois do build.
- `reference/baseline-manifest.json` registra caminhos sob `app/tools`, `app/docs`, `app/drizzle`, `app/README.md` e `app/.openai`. São referências de proveniência no Git, não consumidores de runtime.
- Não apareceu outro import de runtime ou URL local para os auxiliares listados. A busca não pode detectar consumidores externos ao repositório.

### Implementação mínima sugerida para uma etapa posterior

1. Busca textual interna concluída; conferir consumidores externos apenas se houver URLs públicas documentadas/integrações conhecidas.
2. Adicionar um build plugin local com limpeza idempotente em `onPostBuild`, depois de o Netlify empacotar as Functions e antes de publicar. Usar allowlist dos auxiliares: `app/docs/**`, `app/reports/**`, `app/tools/**`, `app/scripts/**`, `app/drizzle/**`, `app/README.md` e `app/HOT_SWAP_VALIDATION.json`. Isso permite que o bundler leia `v5-publication-preflight.js` antes de removê-lo do site estático. Preservar `app/.gitignore`, `app/.openai/hosting.json`, dados e assets do produto. Não apagar do Git.
3. Manter `publish = "app"` e o comando de build atual. Não excluir arquivos no comando principal: ele roda antes do empacotamento das Functions.
4. Fazer Deploy Preview e verificar: site público e assets necessários continuam 200; os caminhos auxiliares da tabela retornam 404; a Function de configuração continua funcional após o bundling. Só então avaliar produção.

A alternativa exige um plugin local pequeno, mas preserva caminhos e ferramentas existentes. A remoção ocorre no checkout descartável da Netlify depois das etapas que dependem desses arquivos; nenhuma remoção seria aplicada ao checkout do desenvolvedor.

Manter `.openai/hosting.json` fora de qualquer limpeza até resolver sua integração; `.gitignore` e metadados `/.openai/**` não são mecanismo de publicação seletiva.

A limpeza do checkout de build é mais simples que mover agora dezenas de ferramentas, ajustar todos os caminhos usados por `app/package.json` e workflows, e manter histórico/evidência. Se um build ou deploy fora da Netlify precisar reproduzir o pacote, encapsular essa exclusão num script versionado permite repetir a regra. Nenhuma remoção seria aplicada ao checkout do desenvolvedor.

### Limites da evidência

- Foram lidos `netlify.toml`, `package.json` raiz, `app/package.json`, `app/.gitignore`, `app/README.md`, `app/scripts/build-static.sh` e o workflow `.github/workflows/app-build-purity.yml` em `main`.
- A varredura de referências da seção 11 cobriu 420 arquivos textuais versionados e não encontrou imports/URLs de runtime para os auxiliares, além das dependências registradas ali. Não prova que consumidores externos não existam. A inspeção HTTP da seção 12 foi amostral, não uma enumeração dos 224 arquivos publicados.
- O workflow de CI roda build e testes dentro de `app`; não o alteramos e não executamos testes nesta análise.
- Nenhuma exclusão havia sido aplicada no snapshot deste inventário. A PR #197 concluiu posteriormente a limpeza e a validação no Deploy Preview.

## 12. Verificação HTTP de arquivos publicados em produção

**Deploy observado pelo Netlify:** site `mobilipresenter2d`, contexto `production`, deploy `6acbb1efcd8e3600084885d4`, publicado em 2026-10-11, commit `38a314fb3d9830e43310e59c0166197fd19341e0`. O SHA coincide com a `main` usada no inventário da seção 10. A URL imutável do deploy foi usada para que o resultado não dependa de um alias móvel.

Foram feitos pedidos HTTP GET somente de leitura, sem enviar payload. As respostas observadas:

| Caminho no deploy imutável | HTTP | Tipo retornado | Tamanho informado |
| --- | ---: | --- | ---: |
| `/docs/CHECKPOINTS.md` | 200 | `text/markdown` | 5.237 bytes |
| `/reports/phase-1-validation.json` | 200 | `application/json` | 4.976 bytes |
| `/tools/test-core.js` | 200 | `application/javascript` | 79.334 bytes |
| `/scripts/build-static.sh` | 200 | `application/x-sh` | 1.014 bytes |
| `/drizzle/meta/_journal.json` | 200 | `application/json` | 61 bytes |
| `/README.md` | 200 | `text/markdown` | 2.439 bytes |
| `/HOT_SWAP_VALIDATION.json` | 200 | `application/json` | 1.126 bytes |
| `/.openai/hosting.json` | 404 | HTML de erro | — |
| `/.gitignore` | 404 | HTML de erro | — |
| `/assets/kitchen/base.png` | 200 | `image/png` | 1.954.488 bytes |

**Conclusão do snapshot anterior:** exemplos de documentação, relatório, teste/ferramenta, script de build, journal e metadado de validação eram baixáveis diretamente da produção. A PR #197 validou e publicou a remoção desses auxiliares da publicação estática. Os dois dotfiles testados não são servidos; `.openai/hosting.json` deve continuar preservado no repositório por sua possível função em outra integração. O ativo de base permanece necessário ao produto e está servido normalmente.

A sondagem confirma a hipótese de exposição para os exemplos da tabela, mas não é uma enumeração HTTP completa dos 224 arquivos nem uma verificação de cada API/alias. A busca textual da seção 11 fechou as referências internas conhecidas; consumidores externos não são observáveis por ela. A proposta foi aplicada pela PR #197: os arquivos continuam no Git/CI e a allowlist os remove do publish em `onPostBuild`, sem alterar `publish = "app"`. O Deploy Preview confirmou os 404 esperados e a disponibilidade das páginas, assets e Functions necessárias.

### Rotas e APIs — respostas sem autenticação

Foram feitos GETs sem enviar credenciais/cookies e sem ler os corpos das respostas de configuração. No mesmo deploy imutável:

| Caminho | HTTP | Content-Type | Observação |
| --- | ---: | --- | --- |
| `/config/` | 200 | `text/html` | Shell do configurador entregue. |
| `/viewer/` | 200 | `text/html` | Shell público entregue. |
| `/admin.html` | 200 | `text/html` | Shell admin entregue estaticamente; 200 não prova autorização de dados/operações. |
| `/data/mock-price-book.js` | 200 | `application/javascript` | Tabela de preços estática diretamente baixável. |
| `/api/configuration` | 200 | `application/json` | GET anônimo da rota bruta; corpo não foi lido. |
| `/.netlify/functions/configuration` | 200 | `application/json` | GET anônimo pela URL direta da Function; corpo não foi lido. |
| `/api/public-modules` | 200 | `application/json` | Projeção pública do viewer. |
| `/.netlify/functions/public-modules` | 200 | `application/json` | Projeção também disponível pela URL direta da Function. |

A observação confirma na produção a diferença arquitetural já apontada pelo código: o viewer tem uma projeção própria, enquanto a configuração bruta e a tabela de preço são alcançáveis sem autenticação. Não se coletou nem examinou o JSON retornado por `/api/configuration`; o teste limitou-se ao status e cabeçalhos.

