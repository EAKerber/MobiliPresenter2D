# CP-PUBLIC-04a — Publicar landing + viewer antes do Clerk

**Data:** 2026-10-08 · **Status:** integração independente; publicação só após gates verificáveis · **Autenticação deliberadamente DEFERIDA**.

## Decisão revisada pelo usuário

O configurador já é **público** em `/` na main, o que inclui o GET bruto de `/api/configuration` e o arquivo estático `/data/mock-price-book.js`. Mudar apenas o caminho do HTML para `/config/` **não adiciona uma nova barreira de acesso**, mas também não promete que os preços ou a publicação administrativa passaram a ser privados.

A sequência aprovada agora é:
1. Publicar **`/` landing, `/viewer/` público com leitura apenas de `/api/public-modules`, e `/config/` público** com UI atual, mantendo `/admin.html` e seu controle Identity.
2. Somente numa segunda atualização conectar **Clerk** (login Google/e-mail/invite-only), com verificação de credenciais e permissões no servidor; passar cliente ao `GET /api/buyer-configuration`, restringir GET administrativo integral e servir `/config/`/assets por controle real de autorização.
3. Não usar a PR #186 como solução provisória nem introduzir PostgreSQL/Resend. A PR #186 permanece como pesquisa/testes no Draft; parte dos gates de sessão pode ser reutilizada na arquitetura Clerk.

## Recorte técnico

- `app/index.html`: landing copiada da mesma versão `app/landing/index.html`; `<base href="/landing/">` mantém localização única de assets e scripts; links importantes para `/` e `/viewer/` são absolutos.
- `app/config/index.html`: cópia **literal da main anterior** quanto à UI e scripts, com somente `<base href="/">` para garantir que as dependências estáticas continuem no caminho já publicado (`/app.js`, `/data/`, `/core/`, `/styles.css`). Evita replicar árvores JS/CSS/dados. Sem login, sem nova sessão, sem alteração em `netlify/functions/configuration.mjs`.
- `app/viewer/`: superfície pública separada; cena/catalog/primitivas compartilhadas com a main. A UI sempre solicita `GET /api/public-modules` em vez de usar informações editoriais locais como autoridade. Caso a publicação não exista ou não valide, mostra estado de indisponibilidade e **não recai silenciosamente em dados locais**.
- `netlify/functions/public-modules.mjs`: recebe Blob de produção quando em contexto production; nas previews usa DeployStore isolado; valida v5 publicada e serve `PublicModulePresentation2D 0.1` sem dados comerciais, ETag, rev ou admin. Não há seed, fallback de produção, operação de PUT nem migração.
- Arquivos da PR #180 selecionados **sem** `netlify/plugins/cp-public-02c-preview`, `scripts/seed-public-preview-v5.cjs` ou marcador de fixture. A preview sem publicação v5 retorna 503 na API, como esperado; screenshots de viewer usam **resposta sintética interceptada exclusivamente no Playwright**. Isso não prova que a publicação v5 real de produção tem campos editorialmente completos.
- Testes de regressão de Stone, Summary, Mobile, Keyboard e Flow passam a usar `/config/`, mantendo invariantes de preços, pedra/rodapé, cenas, teclado e hierarquia.
- O conteúdo público está disponível em `/landing/` por compatibilidade, mas a navegação canônica é `/`. `/index.html` contém a landing, e `/config/index.html` continua público na fase intermediária.

## Gate de publicação 04a

1. Deploy Preview pronto: `/` carrega a landing, `/config/` carrega o configurador legado, `/viewer/` carrega apenas dados públicos mockados no Playwright, e links/estilos/assets resolvem sem 404.
2. Gate HTTP real em preview isolado: public module GET sem Blob de preview retorna 503, PUT 405, query inspeção 400; backend sem seed, dados privados e alterações no Blob; 200 somente se v5 realmente publicada e inspecionada.
3. Browser 1366x768 / 390x844: ambientes, cozinha → viewer, 7 módulos/cena/setas/detalhes, sem erros. Public viewer com duas entradas fora de ordem usa exata ordem publicada e sem fallback em 503.
4. 5 regressões do configurador atual continuam passando em `/config/`, sem patch nas regras comerciais ou na cena.
5. `/admin.html` continua acessível a Identity admin, sem mudanças na Function PUT.
6. Validar a experiência final com publicação **real** da produção antes do merge, inclusive texto de módulos, acabamento, pedras e rodapé. Se não houver prova, manter Draft. Não alegar como privado o configurador ou os dados comerciais.
7. Não alterar a main, publicação Blob, regras de preço, fonte de administração, tokens ou segredos nos testes.

## Próxima atualização Clerk

Criação de app Clerk e credenciais segura no Netlify é uma ação separada. API de sessão/papel deve validar identidade e entitlement; anonimato deve falhar fechado **antes do Blob** e do HTML protegido. Não expor preços/rules publicados como JS público. Reutilizar `BuyerConfiguration2D` allowlist (#185), bootstrap fail-closed (#184) e admin guard (#182) numa branch coordenada; não mesclar essas PRs individualmente no release intermediário.

**Trade-off aceito:** público poderá acessar `/config/` e conhecer preços/regras enquanto não houver Clerk. Usuário solicitou explicitamente essa ordem, evitando bloqueio do site por provedor externo. Revisar GDPR/LGPD antes de gravar propostas com email nos Blobs públicos; nada de PII neste recorte.
