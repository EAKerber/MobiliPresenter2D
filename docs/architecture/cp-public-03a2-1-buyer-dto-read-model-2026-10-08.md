# CP-PUBLIC-03a2-1 — DTO comprador derivado de publicação v5 e leitura protegida

**Data:** 2026-10-08. **Estado:** implementação 03a2-1A em [PR #185](https://github.com/EAKerber/MobiliPresenter2D/pull/185), **DRAFT/HOLD**, baseada em `main bf30e008a81b7bc9cc34573e3d60a953810a9e72`. Nenhum merge / mudança na publicação ou Blob de produção. Plano canônico: [PR #183](https://github.com/EAKerber/MobiliPresenter2D/pull/183); bootstrap UI já preparado separadamente na [PR #184](https://github.com/EAKerber/MobiliPresenter2D/pull/184); guard raw-v5 admin-only na [PR #182](https://github.com/EAKerber/MobiliPresenter2D/pull/182).

## Entregue

1. `app/core/buyer-configuration-projection.js`: `BuyerConfiguration2D 0.1` gerado **construtivamente** de v5 válida (`ConfiguratorAdministration2D 5.0`). Dois métodos puros `project(published, deps)` e `prepare(dto, deps)`. `prepare` valida schema e chaves de topo, deriva `flow.normalizeFlow` diretamente do DTO, normaliza `pricing` tipado e projeta somente a view plana por etapa. **Não transporta `published-buyer-projection.prepare().source`, nem reintroduz o documento admin integral.**
2. `netlify/lib/authorized-buyer-read.cjs`: `GET` apenas, sem query; `@netlify/identity.getUser()` determina permissão, nenhum header/cookie/role vindo da requisição concede acesso. **Admin autenticado temporariamente** é o único principal aceito (200). Anônimo = 401; Identity não admin = 403; erro Identity = 503; PUT = 405; query = 400. Verificação de Identity antecede **seleção/leitura** do Blob, inclusive na Function direta.
3. `netlify/functions/buyer-configuration.mjs` + `netlify.toml`: expõe `GET /api/buyer-configuration` como endpoint **admin-only** (até o gate 03a2-2), usando `getStore()` só em production e `getDeployStore()` em outros contextos. Leitura `readRawPublished`/ `inspectPublishedRaw` com `consistency: strong`, exigindo v5 armazenado válido. Missing/invalid/v3 => 503 genérico, **nunca default 200**, sem ETag/revision e com `Cache-Control: private, no-store`, `Vary: Cookie, Authorization`.
4. `app/tools/test-buyer-configuration-projection.js`: paridade do fluxo normalizado, ordem/hierarquia, apresentação, eventos, dependências, estado, copy, imagens disponíveis e typed pricing incluindo `frontFinishAdjustment.type="amount"`; sentinelas de campos administrativos injetadas no topo, em objeto, material, materialGroup, stage/section, asset, initialState e apresentação não podem atravessar a projeção. `test-authorized-buyer-read.js`: testes unitários HTTP auth-before-Blob/403/401/405/400/503 e ausência de ETag. `.github/workflows/authorized-buyer-read.yml`: CI pura e **HTTP real** no Netlify Deploy Preview para rota, Function direta, query e PUT anônimos, sem bypass de autorização. Integrado ao `npm test`.

## Allowlist de dados autorizados ao comprador

| Campo DTO | Razão para cruzar a fronteira | Exclusão intencional |
| --- | --- | --- |
| `schemaVersion: BuyerConfiguration2D 0.1`, `sourceKind: published-v5` | Proveniência de publicação e evolução de contrato | `revision`, `etag`, `source`, IDs da sessão, metadados do ADM |
| `stages` → grupos → seções | Mesma ordem/hierarquia/behavior/component publicada | `items` misturado ao hierárquico e atributos editoriais não mapeados |
| `presentationPolicy` → views, PiP, bottomDock | Política visual/comportamental publicada | Campos extras/anotações internas aninhadas |
| `objects`, `objectAssets` | Copy + arte dos itens configuráveis e opções utilizadas | Inventário não referenciado, URLs remotas, campos internos/segredos |
| `initialState` | Estados de módulos, serviços e escolhas globais | Flags de sessão/admin e IDs de entidades fora da cena |
| `materials`, `materialGroups`, `handleProducts`, `finishes` | Opções realmente utilizáveis; texturas locais e preço dos handles pelo ID comercial | Materiais sem referência, flag `locked` exclusiva ADM, metadados extras |
| `dependencies`, `events` | Regras para cálculo/visibilidade do comprador | Chaves administrativas extras |
| `pricing` → `CommercialPricingRules 1.0` | Simulação financeira **na sessão autorizada**; mesma semântica tipada v5 | Campos extras, regras de custo secreto não presentes no contrato, ETag/revisão |

**Detalhe importante:** `handles-all.materialIds` aponta para IDs de **produtos** de puxador, não IDs de materiais. O projetor mantém a distinção e recolhe materiais através de `handleProducts[].materialIds`; usar o conjunto de `materialGroups` diretamente falhou no primeiro teste e foi corrigido sem transportar inventário inteiro. O requisito é não inventar nenhum material ou valor.

**Observação de negócio:** valores que o próprio navegador precisa calcular são inspecionáveis por um comprador autenticado. Este DTO é **restrito à sessão**, mas não criptografa/oculta o preço de quem recebe. Se preços/regras forem confidenciais inclusive perante o comprador, mudar a arquitetura para cálculo de cotação no backend antes de habilitar a sessão.

## Contratos testados e limites

**Unidade:** `node app/tools/test-buyer-configuration-projection.js` e `node app/tools/test-authorized-buyer-read.js`; **preview real:** `.github/workflows/authorized-buyer-read.yml` exige anônimo 401 em ambas as URLs, query 400, PUT 405. Esses testes não fingem 200 real de comprador. Os testes de preços/pedra/mobile na PR verificam regressão da `main`, **não** UI consumindo este DTO (nenhum `app/app.js` foi alterado).

**HOLD 1 — segurança externa ainda não consolidada:** a `main` continua servindo `GET /api/configuration` raw v5 sem autenticação até integrar a [PR #182](https://github.com/EAKerber/MobiliPresenter2D/pull/182). A Function buyer nova é admin-only, mas **não** torna a aplicação atual protegida. O JS estático de `mock-price-book` ainda é público.

**HOLD 2 — consumo do DTO:** a [PR #184](https://github.com/EAKerber/MobiliPresenter2D/pull/184) bloqueia UI até configuração autorizada, mas ainda lê `/api/configuration` raw. O método `prepare(dto)` neste checkpoint é um adaptador puro, **não está ligado** a `app/app.js`/bootstrap. A ligação será feita em branch de integração com #184, após 03a2-2 completar autorização de comprador ou em preview protegido por admin, sem permitir fallback no browser.

**HOLD 3 — sessão real ainda ausente:** no 03a2-2 o endpoint poderá compartilhar um verificador central de sessão cliente (token hash, expiração/revogação, escopo e consumo atômico). Não confiar em `Cookie` ou headers sem verificador do provedor. Unificar verificações de role entre esta Function e a #182 na etapa de higiene; não remover nenhuma até paridade testada.

**HOLD 4 — prevenção de duplo contrato:** `published-buyer-projection.js` continua compatível com v3/v5 para administração e testes offline. **Não** converter suas funções de retorno em DTO de rede, nem manter duas autoridades de seleção. O DTO novo tem schema diferente e deve ser validado/projetado pelo adaptador específico. Se uma política v5 mudar, alterar projetor + gates, sem hardcodes na UI.

## Sequência recomendada

1. Observar CI da #185 e corrigir falsificações sem afrouxar `401` ou requisitos de schema.
2. 03a2-2: definir fornecedor transacional e e-mail sandbox, emitir/trocar ticket single-use e sessão HttpOnly com revogação; integrar verificador à Function buyer (não raw admin).
3. Branch de integração: incorporar #182, #184, #185; migrar o bootstrap de `app/app.js` para `GET /api/buyer-configuration` e adaptador DTO, **preservando ADM Identity**. Provar UI `ready` apenas com resposta autorizada real e matéria de teste publicada em Blob do Deploy Preview, sem seed produtivo.
4. 03a2-3: Edge e aliases de `/config/`, política de HTML/asset e remoção da exposição anônima de price-book. 03a2-4: suíte E2E completa, cleanup #180/#182 e cutover com rollback seguro. Sem merges parciais com endpoint admin raw exposto.

**STOP** se houver fallback de v3/default em endpoint buyer, resposta com `revision/etag/source`, vazamento de field-level, autorização por header/cookie não verificado, desvio de cálculo v5, necessidade de receber pricing anônima, ou CI que interprete fixture em Playwright como sessão real.
