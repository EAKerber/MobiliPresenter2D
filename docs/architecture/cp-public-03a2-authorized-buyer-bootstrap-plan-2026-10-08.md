# CP-PUBLIC-03a2 — plano canônico de solução da regressão 401 e acesso do comprador

**Data:** 2026-10-08 · **Estado:** PLAN ONLY / DRAFT / HOLD. **Sem alterações runtime, rotas, e-mail, Blob, segredos ou `main`.** Leitura de `main` em `bf30e008a81b7bc9cc34573e3d60a953810a9e72`; investigação em [PR #182](https://github.com/EAKerber/MobiliPresenter2D/pull/182) (`0b398618f7f2eff23da7f782d53d86ba3ee6411b`); inventário [PR #181](https://github.com/EAKerber/MobiliPresenter2D/pull/181); integração de viewer [PR #180](https://github.com/EAKerber/MobiliPresenter2D/pull/180).

## Decisões irrevogáveis deste recorte

1. `/` e `/viewer/` **públicos**; `/config/` acessível a admin Identity ou cliente com sessão autenticada por link de e-mail; `/admin.html` admin. A **landing** ocupará `/` só após gates coordenados.
2. Viewer é **vitrine de módulos**, sem lógica de pedra, rodapé, máscaras/oclusão comercial do configurador; apresentação atual é baseline. Controle global de cor das frentes opcional, caixaria/laterais visualmente congeladas.
3. Admin publica/edita v5 **integral**; cliente só lê uma projeção estritamente limitada às necessidades da UI de compra; anônimo só recebe `PublicModulePresentation2D` do viewer. Não criar nova autoridade de dados, banco paralelo editorial ou converter o comprador em módulo do viewer.
4. **Todo HTTP protegido falha fechado**: `401/403/404/409/422/429/5xx`, timeout e resposta inválida jamais resultam em composição/preço interativos usando defaults. `file://` offline para desenvolvimento/teste pode ter modo distinto e deliberado, com aviso visível, nunca automaticamente no site público.
5. O preço comercial atualmente está em `app/data/mock-price-book.js`, servido publicamente. **Até decisão comercial contrária, considerar valores/regras de preço conteúdo restrito à sessão.** Uma API bloqueada não protege o JS estático: os artefatos do build final também precisam ser auditados/protegidos.
6. Não conectar ticket de e-mail a Netlify Identity de admin, nem confiar em role/cookie/JWT declarado pelo cliente. Nenhum ticket de seed/debug ou fixture sintética deve migrar de #180/#182 para produção.
7. PR #182 **não deve ser mesclada isoladamente**: o guard correto quebra a inicialização anônima legada. Implementar migração sem corte parcial, com gates em preview isolado.

## Evidência causal a preservar

`app/app.js:2839+` chama `fetch('/api/configuration', credentials:'same-origin')` e transforma qualquer HTTP não-OK salvo `422` em `null`; antes do GET já carrega `createDefaultAdministration()`, `priceBook.pricing` e monta a UI. No Deploy Preview #182 houve `GET=401`, `publishedConfigurationStatus=null`, workspace ativa e preço visível, sem alerta. [Reprodução #37815057147](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37815057147). Na [contraprova #37815673306](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37815673306), Stone, Summary e Mobile passaram 3/3 com v5 mockada e estado `validated`. Isso isola bootstrap/proveniência, **não** prova autenticação real.

## Alvo arquitetural (não confundir contratos)

```text
Anônimo             --> / e /viewer/ --> GET /api/public-modules
Administrador       --> Netlify Identity validada no servidor
                     --> GET/PUT /api/configuration    [raw v5, admin somente]
Cliente identificado--> e-mail pré-informado no fluxo comercial
                     --> link de acesso --> /access/#ticket=...
                     --> POST /api/access/redeem (consumo atômico)
                     --> cookie de sessão HttpOnly/Secure/SameSite
                     --> GET /config/ (Edge/servidor valida sessão)
                     --> GET /api/buyer-configuration (servidor valida mesma sessão)
                     --> BuyerConfiguration2D 0.1 validado e limitado
                     --> UI liberada apenas após 200 + schema + proveniência
```

Admin Identity pode entrar em `/config/` pela mesma política de acesso, mas **não** deve enviar o v5 bruto ao comprador. A URL direta `/.netlify/functions/configuration` nunca serve de atalho. A identidade verificada deve ser derivada do contexto do provedor, com aplicação de scopes no servidor.

## CP-PUBLIC-03a2-0 — bootstrap fail-closed e máquina de estados (primeiro PR executável)

**Objetivo:** resolver o erro crítico da UI **sem** fazer bypass no GET. Criar `app/core/authorized-bootstrap.js` como orquestração testável de estados `locked/loading/ready/unauthorized/forbidden/expired/unavailable/invalid`. Introduzir um único entrypoint de aquisição de dados para o comprador, sem carregar `app/app.js` como controlador plenamente utilizável antes de autorização.

- Marcar `.workspace`, valor e CTAs como **inert/hidden desde HTML inicial**, antes de qualquer renderização/await, para evitar flash de preço/elementos ativos (e também por teclado/assistivas). Expor estado `data-configuration-access-state` e mensagem acessível por causa: login/revalidar para 401, sem permissão para 403, indisponível para 5xx/timeout, inválido para contrato/schema.
- Resolver **somente** após GET autorizado `200` do **futuro** `/api/buyer-configuration`, validação de schema e correspondência de fonte; a partir daí executar `applyBuyerConfiguration()`, montar/atualizar cenas, estimativas, navegar, remover `inert` e setar `data-published-configuration-status='validated'`. Remover qualquer caminho de `null -> defaults interativos` para HTTP.
- Separar acoplamento do bootstrap a `app/app.js`: as constantes locais de cena e catálogo para geometria podem existir antes do GET, mas **nenhuma decisão comercial nem estimativa local é apresentada como publicação** antes do 200. Controles, eventos e `CASA_EM_MODULOS_DEBUG` não concedem autenticação.
- Falha/expiração posterior: invalidar estado na UI (incluindo resumo), descartar resultado sensível em memória onde possível, bloquear ações de solicitação/proposta e orientar renovação do link; qualquer cache de configuração sensível usar `no-store`, sem service-worker/offline fallback.
- Teste isolado com 200 fixture e 401/403/422/503/timeout inválido, antes de ligar Identity real; **não mergear somente este bloqueio** enquanto não houver a sessão produtiva.

**Gate 0:** 0 cenas/controles/preços interativos para HTTP bloqueado; conteúdo editorial/FAQ de acesso continua visível; `role=alert`, foco e retry úteis; nenhuma quebra em `file://` explicitamente offline. Teste negativo deve **falhar** se reaparecer fallback.

## CP-PUBLIC-03a2-1 — projetor servidor de comprador e adaptação do client

**Objetivo:** API cliente explícita `BuyerConfiguration2D 0.1`, separada da função administrativa. `netlify/functions/buyer-configuration.mjs` autentica cliente/admin **antes** de selecionar `getStore/getDeployStore`, lê publicação atual por `published-configuration` (sem mutar), valida v5 existente, converte via novo projetor puro, retorna `Cache-Control: no-store`, `nosniff`, sem CORS permissivo.

- Criar `app/core/buyer-configuration-projection.js` (puro, isomórfico, unit-testable). **Allowlist construtiva por campo**, nunca `{...published}`, `prepared.source`, `prepared.displaySettings` ou retorno bruto de `published-buyer-projection.prepare()`. Especificar schema cliente versionado, validar IDs/URLs de assets e relações de seleção/requisitos; falhar fechado para v5 inválido, não usar defaults.
- Inventário inicial de campos consumidos em `app/app.js:2040–2113`: `stages` hierárquicos e rótulos, `presentationPolicy`, textos editados `objects`, `dependencies` e `events`, `initialState`, opções publicadas `finishes`, `materialGroups`, materiais efetivamente selecionáveis, `handleProducts`, assets de exibição **allowlisted** e `pricing` estritamente necessário aos cálculos. Conferir todos os leitores indiretos `configurationCore/flowCore/pricingContract/pricing.js`, não só `app.js`; matriz campo -> consumidor -> necessidade -> classificação.
- Preços: como a UI atual calcula no cliente, a primeira versão autenticada pode receber **regras de cotação necessárias na sessão protegida**, se aprovadas como dados visíveis ao cliente. Caso preço ou algoritmo não devam ser observáveis pelo cliente, o corte correto é **mover cálculo para endpoint server-side com contrato de cotação** e revalidar identidade em cada cálculo; não fingir segredo enviando regras via DTO. Não criar preço hardcoded como substituição de valor publicado. A escolha operacional padrão do plano é *valores comerciais apenas na sessão*, não no JS publicamente servido.
- `prepareBuyer` / `applyBuyerConfiguration`: interpretar **DTO cliente**, não exigir o documento de administração completo para `flow.normalizeFlow`; preservar semântica v5 de etapas, objetos, dependências, eventos, campos e itens. Reter `published-buyer-projection.prepare()` como helper interno de compatibilidade, **não reutilizar `source` como DTO de rede**.
- Rejeitar version mismatch/schema desatualizado sem fallback, com mensagem de atualizar/recarregar. Metadado de proveniência **opaco**, não ETag/revisão de admin, permite teste de que valores aplicados vêm da publicação; logar só estado/código e identificador sem dados privados.

**Gate 1:** snapshot byte/field-level da allowlist; nenhum campo admin/preço não aprovado/segredo/ETag/metadata; 7 módulos e variações autoradas (frentes, pedra, rodapé, puxadores, dependências, serviços, preços e ordem) preservadas entre v5 e DTO sob fixture; alteração de preço/etapa na fixture muda o resultado esperado no browser. GET anônimo 401, Identity admin e sessão válida 200, PUT proibido em buyer endpoint, URL direta da Function protegida.

## CP-PUBLIC-03a2-2 — sessão por e-mail e provedor transacional

**Objetivo:** aproveitar o e-mail já capturado no fluxo comercial. NÃO pedir que o cliente cadastre senha/Google no primeiro corte, nem permitir ticket de uma pessoa escolher arbitrariamente o e-mail de outra.

- Fluxo `POST /api/access/request` recebe identificador/estado de lead permitido; emite resposta **igual** para e-mails elegíveis e inexistentes (sem enumeração). **Elegibilidade, destinatário e direito de acesso** são definidos no servidor a partir de registro/convite confiável ou do fluxo comercial auditado; campo `email` enviado pelo browser não é, por si, autorização. Enviar link apenas a esse destinatário, com throttling por IP, identidade e e-mail, limites globais e telemetria sem ticket.
- Ticket aleatório criptograficamente forte, hash em repouso, TTL curto (ex.: até 15 min, ajustável pela política), destino/scope `configuration:read`/lead vinculados. `/access/#ticket=...` mantém segredo fora de URL enviada ao servidor; JS de troca remove fragmento do histórico imediatamente e faz POST same-origin. `Referrer-Policy: no-referrer`, não carregar scripts/analytics de terceiros antes da troca.
- **Consumo único atômico:** repositório transacional com `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now RETURNING` ou equivalente comprovado. `@netlify/blobs` não substitui transações para corrida/replay. Provider do banco e do serviço de e-mail deve ser escolhido por discovery/capability e integração de ambiente separada; até termos garantias concretas, não simular sucesso na produção.
- Em troca válida: emitir identificador de sessão opaco, hash no servidor, cookie `__Host-casa-config-session` (`Secure; HttpOnly; SameSite=Lax; Path=/`; sem `Domain`), rotação após login, TTL deslizante/absoluto explícitos, revogação e logout. A autorização revê expiração/revogação na API e na borda; separação preview vs produção, validação de origem/CSRF nos POSTs e limitação de sessões. Session bearer não concede PUT nem acesso admin.
- Admin continua via Netlify Identity. Em caso de provider/e-mail indisponível, falhar fechado sem emissão silenciosa. E-mail só considerado enviado após resposta do provedor e teste observável, com templates, domínio e configuração isolados por ambiente.

**Gate 2:** ticket inválido/expirado/consumido -> 401, dois resgates simultâneos -> **exatamente um** ganha, rotação e logout revogam, cookie seguro/HttpOnly e não acessível em JS, falsificação/replay não autoriza, admin PUT nunca liberado ao cliente, anti-enumeração/rate limiting, teste E2E com caixa de e-mail sandbox; nenhum segredo em logs, URL ou monitoramento.

## CP-PUBLIC-03a2-3 — proteger rotas HTML e assets na distribuição real

**Objetivo:** `/` vira landing pública, `/viewer/` mantém o catálogo de módulos, `/config/` é protegido em **Netlify Edge/servidor** (admin ou sessão), e `/admin.html` fica sob policy admin. Rewrites não podem depender de controle JavaScript.

- Expor a configuração apenas em `/config/` e rotas normalizadas; tratar `/config`, `/config/`, `/index.html`, URLs internas e caminho direto `/.netlify/functions/*`, variantes `//`, case quando aplicável, hostname custom vs `*.netlify.app`. Provar que não existe cópia em `/config/index.html` ou asset alternativo que eluda a policy.
- Aplicar guard server/Edge para HTML e assets que contêm material restrito, sem se apoiar só em rota do SPA. Para JS físico de visualização que for público, documentar allowlist; retirar do artefato anônimo `app/data/mock-price-book.js` com preços comerciais ou entregá-lo somente por endpoint protegido (preferencialmente deixar valores autorizados no DTO).
- Revisar `Cache-Control`, `Vary: Cookie`, CSP, `Referrer-Policy`, redirects, URLs do preview e uso do cookie tanto no Edge quanto na Function. Edge/servidor e API devem compartilhar o mesmo verificador de sessão e regra de roles; qualquer impossibilidade técnica de validar consistentemente ambos é **gate bloqueador**, não motivo para abrir HTML.
- O gate de publicação da landing é separado: não alterar `/` até provas end-to-end e plano de rollback. Viewer não deve buscar `/api/configuration`.

**Gate 3:** acesso anônimo a HTML/JS restritos e endpoints -> negação; login admin e sessão válida -> rota correta; sem bypass de alias/hostname; logout/expiração tornam HTTP e UI bloqueados; landing e viewer públicos continuam acessíveis.

## CP-PUBLIC-03a2-4 — testes, limpeza e publicação coordenada

Ver [matriz executável de testes](../testing/cp-public-03a2-release-gates-2026-10-08.md). Separar testes de domínio com fixture controlada da prova de autenticação real, ampliar triggers CI para `netlify/**` e `app/**`. Substituir diagnóstico que **passa ao reproduzir bug** por invariant negativo que **falha se workspace/preço continuarem ativos em 401/403/503**. Remover replay `CP_PUBLIC_DIAGNOSTIC_V5` e testes/Build Plugin específicos da PR #180 antes de merge; manter somente fixtures explícitas em harness de teste isolado, nunca ativáveis na produção.

**Gate 4:** todos os workflows de domínio 3/3 em fixture válida; suite de Auth E2E isolada em ambiente deploy/DB/e-mail sandbox real; `buyer-v5-browser` prova publicação e DTO; cobertura de expirado/replay/401/403/503; viewer unchanged; admin salva v5 com CAS; nenhum preço disponível anonimamente quando classificado protegido; cleanup sem 404.

## Ordem de merges / rollback

- Implementar `03a2-0` (bloqueio da UI), `03a2-1` (DTO), `03a2-2` (sessão), `03a2-3` (rotas), `03a2-4` (gates) em **PRs DRAFT pequenas**, podendo formar branch de integração privada para smoke. Nenhuma PR que isoladamente derrube o bootstrap atual vai para `main`. Preferir ativação por configuração no servidor com default **seguro**, não `?debug=1` ou escape hatch público.
- Quando os gates passarem, consolidar numa PR de release com auditoria de diff, roteamento, replay de dados/rollback; aplicar cutover **atômico**, monitorar erros de login e 401/503 sem vazar logs e manter rollback que preserve segurança (não reabrir GET administrativo).
- Não migrar a publicação v5 rev7 por causa do auth, não escrever no Blob de produção durante testes, não ativar fixture do preview #180 no bundle final, não mexer na caixaria/pedra do viewer. Até release, `main` mantém o comportamento anterior para não interromper o comprador.

## Critérios de parada e autoridade

**STOP** se: a matriz não cobre algum campo lido no comprador; um token não é consumido atomicamente; a Edge diverge da API; preço protegido aparece em `app/`; erro HTTP reativa defaults; testes são green só por `route.fulfill` sem gate real; autenticado cliente recebe v5 bruto; PR merge parcial quebra comprador; ou o sistema não consegue provar isolamento preview/produção. Persistir nova decisão e redesenhar o incremento, sem flexibilizar autorização.
