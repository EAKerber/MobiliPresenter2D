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

Leitura dos arquivos remotos de `main` em `38a314fb3d9830e43310e59c0166197fd19341e0`. O inventário abaixo cobre os pontos de entrada e consumidores centrais encontrados; ainda não é uma enumeração exaustiva de todos os arquivos publicados.

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

- `app/data/mock-price-book.js` é entregue ao browser do configurador e também incluído pela Function/admin. Contém valores comerciais estimados por módulo/acabamento/serviço e disclaimer; o arquivo declara que custo, margem e dados de fornecedor não devem estar nele. Esses montantes não são segredo técnico hoje, mas a decisão comercial sobre exposição em páginas públicas ainda precisa ser explícita.
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

### O que ainda falta para fechar o inventário antes do cutover

1. Enumerar cada HTML/alias, script, CSS, imagem, fonte, JSON/dado e bundle diretamente servidos por `app`; registrar URL exata, hash/referências relevantes, consumidores e classificação de campos. Distinguir arquivo realmente compartilhado de recurso exclusivo.
2. Examinar todos os endpoints/Functions e métodos no branch-base do cutover, inclusive qualquer endpoint adicionado desde o SHA inventariado, e testar caminhos diretos além dos dois rewrites confirmados.
3. Decidir explicitamente se valores estimados do `mock-price-book.js` são conteúdo público ou somente autenticado. Se privados, removê-los do bundle estático e entregá-los por resposta autorizada; bloquear apenas `/config/` não basta.
4. Desenhar o limite Netlify/CDN que bloqueia shells/arquivos privados por URL direta e mantém arquivos públicos compartilhados disponíveis. Se um mesmo bundle contém código/dados públicos e privados, separar dados privados em entrega autenticada em vez de proteger o asset inteiro e quebrar landing/viewer.
5. Fechar matriz rota × método × papel/grant com cada resultado 200/401/403, incluindo `OPTIONS`, query strings, métodos não aceitos, aliases, sessão expirada/revogada e cabeçalhos de cache.
6. Preparar sequência de cutover/rollback que não reabra leitura raw anônima nem use fallback estático/local de preço; rollback deve retornar para estado seguro ou interromper a publicação protegida.
7. Atualizar ponteiros do handoff/issue #192 para este plano e assinalar documentos antigos que ainda apresentem Clerk como escolha feita.

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

**Ainda pode avançar sem escolher provedor:** enumerar o restante dos arquivos/aliases e Functions no SHA vigente; decidir a classificação de cada dado comercial; definir a fronteira de proteção estática/Edge e a estratégia de assets públicos compartilhados; fechar a matriz HTTP e um roteiro de cutover/rollback. Isso é documentação/análise, não ativa autenticação.

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
5. Validar URL direta dos seis shells, dos assets privados removidos, dos dois rewrites e das duas URLs /.netlify/functions/*. Hoje nenhum teste HTTP ao deploy foi executado.

