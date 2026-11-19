# DOM-001 — Mapa dos contratos de configuração V5

**Estado:** mapa de código e métodos de verificação revisto; testes não foram executados localmente. O gate Buyer definido abaixo passou no Product PR #274 em `7e440a5bb96fcf3a4ded82df6a0c698504a4b0ae` (run [#44442681429](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/44442681429)). A prova cobre a função sob os contratos e stubs descritos abaixo; não prova os serviços hospedados.  
**Baseline de runtime:** Produto `main@efc40584c3f3ca940cf6cbca408f8fda31e3e1c9`.  
**Contexto documental:** este mapa integra a proposta da PR #274, mas sua baseline de runtime é exclusivamente Product `main@efc40584c3f3ca940cf6cbca408f8fda31e3e1c9`; consulte o link da PR para o head candidato atual, sem autorreferenciar um SHA que muda a cada commit. O escopo da proposta não altera `app/**` nem `netlify/**`; o compilador/manifesto de build e as ferramentas de inventário têm suas próprias provas.  
**Método:** leitura estática do código e identificação de verificações existentes. Os caminhos e linhas abaixo são referências navegáveis no pin indicado; presença de teste não afirma que ele foi executado agora.  
**Finalidade:** entregar o mapa schema → validação/normalização → projeção → consumidor, API → autorização → DTO, preço, defaults e métodos de verificação previstos no DOM-001 do plano v0.9.

## Resultado resumido

A rota principal atual grava `ConfiguratorAdministration2D 5.0` (V5), mas o endpoint preserva gravação legacy V3 quando o documento já armazenado no Blob é V3. Portanto, V3 não é somente caminho de leitura; a versão efetiva depende do dado lido do store. V4 é uma forma hierárquica intermediária de migração. Este inventário não lê os bytes atuais do Blob. Buyer e Viewer recebem projeções com fronteiras próprias: o DTO Buyer não é o DTO público de módulos, e nenhum deles equivale ao estado administrativo completo.

## 1. Contratos, autoridades e transformações

| Contrato | Autoridade e verificação | Transformação / consumidor | Disposição no pin |
|---|---|---|---|
| `ConfiguratorAdministration2D 5.0` | `app/core/administration-v5.js:30, 169–180, 234–279`; `validate` e `normalize` do V5 | `/api/configuration` grava V5 no caminho V5; leitura publicada segue `app/core/published-configuration.js:5–42`; Buyer deriva fluxo e display settings | Formato principal atual, sem eliminar o caminho legacy V3 condicional da API. |
| `ConfiguratorAdministration2D 3.0` | `app/core/configuration.js:13, 276–284, 483–509` | Normalização legacy; reconhecido pelo Buyer em `app/core/published-buyer-projection.js:14–31`; endpoint pode continuar gravando V3 se o documento lido da store ainda for V3 | Caminho de leitura e gravação condicional; a versão do documento em Blob precisa ser observada para saber qual autoridade vale. |
| `ConfiguratorAdministration2D 4.0` | `app/core/hierarchy-administration.js:9, 67–96, 141–213` | `administration-v5.js:288–315` converte o formato hierárquico em V5; pode ser convertido de volta para projeção legacy | Etapa intermediária de migração; o endpoint publicado não o seleciona como formato persistente. |
| `NormalizedConfiguratorFlow 1.0` | `app/core/flow-model.js:9, 230–307, 324–380` | Derivado de configuração, registry do catálogo e defaults hierárquicos; consumido por Admin/Buyer para semântica de etapas e itens | Modelo de domínio derivado, não uma segunda fonte de autoria. |
| `ConfiguratorPresentation2D 1.1` | `app/core/presentation-contract.js:4, 105–220` | Defaults em `app/data/presentation-policy-defaults.js:5–46`; aplicado ao layout de seções e ao fluxo | Política de apresentação separada da estrutura/domínio V5. |
| `CommercialPricingRules 1.0` | `app/core/pricing-contract.js:4, 77–128` | Normaliza regras tipadas de preço; consumido pelo cálculo público em `app/core/pricing.js:120–173` | Regras de preço separadas de strings/UI e de apresentação. |
| `ProductCatalog2D 1.0` / `Scene2D 1.0` | `app/data/catalog-data.js:163`; `app/data/scene-data.js:11` | Alimentam registry, validação de entidades e renderer da cena | Fontes de dados distintas da administração; os identificadores precisam respeitar seus contratos. |
| `ConfiguratorSettings2D 1.0` | `app/data/configurator-settings.js:5–12` | Semente/defaults estáticos, usada para criar configuração inicial e fixtures | Não assumir que a semente é igual à configuração publicada. |
| `ConfiguratorLayoutProfiles2D 1.0` | `app/core/layout-profiles.js:4` | Perfilado pelo contrato de apresentação e projeções do renderer | Defaults/layout não substituem política administrativa. |
| `CommercialEstimatePriceBook 2.0` | `app/data/mock-price-book.js:61` | Fixture local para contratos/cálculos; runtime publicado recebe os dados permitidos pelo endpoint e pelas regras V5 | O arquivo nomeado mock é exemplo/fixture, não prova do conteúdo comercial ativo em produção. |

V3 normaliza dados legacy; V4 converte a estrutura para a forma hierárquica; V5 valida e normaliza seu próprio schema e oferece migração/projeção entre versões. O endpoint principal salva V5 quando recebe V5, mas conserva o caminho V3 se a versão atualmente lida da store for V3 (`netlify/functions/configuration.mjs:101–143`). O Admin também mantém fluxos condicionais V3/V5 (`app/admin/admin.js:1873–1923`). Os validadores verificam tipos/IDs do catálogo, etapas mínimas, seleções iniciais, disponibilidade de materiais, preço e política de apresentação. Nos caminhos de validação e projeção, dados submetidos sem schema reconhecido ou com falhas são rejeitados. Exceção delimitada: o GET de `/api/configuration` usa defaults se o documento estiver ausente ou se a leitura identificar V3 inválido (`configuration.mjs:29–43`); V5 inválido ou schema desconhecido não recebe esse fallback.

## 2. API, autorização e DTOs

| Superfície | Autorização e operação | Dados de entrada/saída e consumidor |
|---|---|---|
| `/api/configuration` — `netlify/functions/configuration.mjs:14–16, 24–27, 64–80, 101–145` | GET/PUT restritos à sessão Admin. Há gravação V5 no fluxo V5 e caminho V3 condicional se o documento lido da store for V3. | Consumidor Admin em `app/admin/admin.js:1284` e fluxos de edição V3/V5 em `:1873–1923`. Persistência usa Netlify Blobs store `configurator-settings`, key `published`; a rota seleciona `getStore()` em produção e `getDeployStore()` fora dela. `app/core/published-configuration.js:5–16` lê com consistência forte. O inventário não inspeciona o valor publicado atual. |
| `/api/buyer-configuration` — `netlify/functions/buyer-configuration.mjs:24–72` | Exige usuário interno ou grant temporário válido; nega antes de abrir o Blob; falha fechado em erro de Identity/sessão. O método local está em `tests/buyer-configuration-endpoint.test.mjs`; ele usa a política real e stubs de Identity/sessão/Blob. | `BuyerConfiguratorPayload 1.0` em `app/core/published-buyer-projection.js:63–109`. O fetch está em `app/app.js:2548`; aplicação em `:1765–1789`. `tests/buyer-v5-browser.cjs` intercepta a API e não prova autorização da função. O novo workflow roda o teste de fronteira em mudanças na função e seus contratos importados. |
| `/api/public-modules` — `netlify/functions/public-modules.mjs:10–25, 58–77, 79–112` | Leitura pública, somente leitura e limitada a allowlist de campos. Não concede acesso a preço ou regras comerciais por si só. | Projeção `PublicModulePresentation2D 0.1/0.2` por `app/core/public-module-projection.js:118–155`; leitor `app/viewer/public-data.js:6–43` e renderização `app/viewer/viewer.js:60–75`. Em Deploy Preview sem projeção local, o endpoint pode buscar a API do site primário; registrar a origem efetiva antes de atribuir dados ao Preview. |

### Origem do documento publicado

`netlify/functions/configuration.mjs:24–27` escolhe `getStore()` em produção e `getDeployStore()` fora de produção; a configuração publicada fica no Blob store `configurator-settings`, chave `published`. `app/core/published-configuration.js:5–16` lê com consistência forte. Isso descreve a rota de código; este snapshot não inspeciona a store ou prova qual schema está gravado no ambiente hospedado.

### Buyer

A projeção valida o V3/V5 recebido, produz `NormalizedConfiguratorFlow` e preserva apenas os campos listados em `BUYER_SETTING_FIELDS`. Em V5, `displaySettings.stages` é uma visão plana derivada da administração hierárquica; não representa um segundo registro editável. O validador do DTO exige as coleções e objetos usados pelo Buyer. Campos de Admin não incluídos na allowlist ficam fora do transporte. O endpoint exige autorização antes de devolver o payload.

### Viewer público

A projeção recebe V5 validado e constrói dados públicos de módulo, em vez de serializar o objeto administrativo. Ela limita módulos/entidades à configuração visível e publica preço-base apenas quando a política V5 o habilita e o módulo é visível. As regras completas, estado do Admin e detalhes comerciais não são projetados. O leitor aceita somente as versões públicas declaradas do DTO; schema desconhecido ou payload estruturalmente inválido falha.

## 3. Propriedades comerciais: cálculo e apresentação

`CommercialPricingRules 1.0` declara papéis de preço e unidade monetária inteira em centavos; a validação rejeita schema/keys/roles incompatíveis (`app/core/pricing-contract.js:77–128). O cálculo da estimativa pública é feito em `app/core/pricing.js:47–81, 120–173` a partir de cena, seleção, catálogo, visibilidade e regras resolvidas. O endpoint de módulos públicos pode expor somente preço-base autorizado, sem transportar o motor de regras.

A formatação monetária ocorre depois do cálculo: `app/app.js:1569–1570` formata centavos como BRL na interface Buyer, e `app/viewer/viewer.js:72` formata o preço-base recebido pelo Viewer. Formatação não recalcula preço e não confere autorização.

## 4. Defaults: domínio e apresentação

| Fonte | Responsabilidade | Tratamento |
|---|---|---|
| `app/data/configurator-settings.js:5–12` | Semente de etapas e seleções iniciais V3 | Valor inicial/fixture; é normalizado contra catálogo, preço e cena. |
| `app/data/catalog-data.js:163` | Catálogo de produto, módulos e opções | Fonte de IDs e capacidades de item usadas por validação e registry. |
| `app/data/scene-data.js:11` | Cena e entidades renderizadas | Fonte de geometria/entidades; não substitui disponibilidade comercial. |
| `app/data/hierarchy-defaults.js` | Templates de estágios/seções para derivação e migração | Default de domínio/estrutura; consumido por Flow e conversores V4/V5. |
| `app/data/presentation-policy-defaults.js:5–46` | Política de apresentação | Default visual/layout, validado contra perfis e fluxo. |
| `app/data/mock-price-book.js:61–70` | PriceBook 2.0 e regras de fixture | Não assumir como PriceBook efetivamente publicado. |

A distinção essencial é: defaults de domínio (catálogo, cena, etapas/templates, regras) definem dados válidos; defaults de apresentação definem como as seções são organizadas; valores gravados pelo Admin sobrepõem o que o schema permite; estado transitório do comprador não se torna fonte autoral.

## 5.1 Escopo prioritário do DOM-001 e método ligado a cada contrato

O plano v0.9 associa este pacote aos contratos ARC-11, ARC-12 e ARC-16. Para evitar ambiguidade, este inventário trata como prioritários os contratos de administração V3/V4/V5, fluxo normalizado, apresentação, preço, catálogo/cena, autorização das APIs e DTOs Buyer/Viewer. `ConfiguratorSettings2D`, `ConfiguratorLayoutProfiles2D` e `CommercialEstimatePriceBook` são inputs/defaults/fixtures de suporte, não contratos prioritários independentes; seus efeitos são verificados pelos consumidores que os usam.

| Contrato prioritário | Consumidor principal | Método de verificação definido |
|---|---|---|
| Administração V3/V4/V5 | Admin, leitor publicado, migração | `app/tools/test-administration-v5.js`, `app/tools/test-v5-normal-save.js`, `app/tools/test-v5-publication-migration.js`, `app/tools/test-published-configuration.js`; rota Admin em `app/tools/test-v5-endpoint-safety.js`, executado no novo gate quando `configuration.mjs` muda. |
| `NormalizedConfiguratorFlow 1.0` | Admin, Buyer e hierarquia publicada | `app/tools/test-flow-model.js`, `app/tools/test-hierarchy-administration.js`, `app/tools/test-postv5-new-material-roundtrip.js`. |
| `ConfiguratorPresentation2D 1.1` | Organização das seções e apresentação do fluxo | `app/tools/test-presentation-contract.js`, `app/tools/test-flow-layout.js`. |
| `CommercialPricingRules 1.0` e cálculo de preço | Estimativa Buyer e preço-base Viewer | `app/tools/test-core.js`, `app/tools/test-v5-endpoint-safety.js`, `tests/viewer-base-price-publication.test.cjs`, `tests/summary-pricing-browser.cjs`. |
| `ProductCatalog2D 1.0` / `Scene2D 1.0` | Validação de capacidades, módulos públicos e renderer | `app/tools/test-item-capabilities.js`, `app/tools/test-core.js`, `app/tools/test-public-modules-endpoint.js`. |
| API pública de módulos / DTO Viewer | `/api/public-modules`, Viewer | `app/tools/test-public-modules-endpoint.js`, `tests/public-module-projection.test.cjs`, `tests/viewer-base-price-publication.test.cjs`; workflows `public-routing-before-clerk.yml` e `viewer-base-price-contract-gate.yml`. |
| API Buyer / `BuyerConfiguratorPayload 1.0` | Buyer, configuração projetada | `tests/buyer-configuration-endpoint.test.mjs` cobre autorização e deny-before-store, sessão temporária simulada e caminhos Admin/Staff; também confere as chaves exatas do envelope Buyer e de `displaySettings`, além das omissões de campos administrativos. `app/tools/test-published-buyer-projection.js` cobre a projeção de domínio em `app-build-purity.yml`; `.github/workflows/buyer-configuration-boundary.yml` liga mudanças da função, política e projeção a CI. |

**Estado da prova:** os métodos acima são referências, não uma afirmação de que todas as suítes rodaram no SHA atual. O workflow Buyer passou em `7e440a5bb96fcf3a4ded82df6a0c698504a4b0ae` (run [#44442681429](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/44442681429)). A função foi exercitada com política e leitura de cookie reais e stubs de Identity/sessão/Blob; a sessão é fixture e a prova não valida sua expiração/revogação no SQL nem integra os provedores hospedados.

## 5. Testes e métodos de verificação identificados

| Contrato/risco | Verificações existentes encontradas | Limite desta auditoria |
|---|---|---|
| Admin V3/V5, validação e salvamento | `app/tools/test-administration-v5.js`; `app/tools/test-v5-normal-save.js`; `app/tools/test-v5-publication-migration.js`; `app/tools/test-postv5-new-material-roundtrip.js`; `tests/admin-v5-save-browser.cjs` | Caminhos de edição e migração; arquivos identificados, sem execução nesta auditoria. |
| Hierarquia e derivação do fluxo | `app/tools/test-hierarchy-administration.js`; `app/tools/test-flow-model.js`; `app/tools/test-flow-layout.js` | Não cobre por si só todos os consumidores hospedados. |
| Apresentação | `app/tools/test-presentation-contract.js` | Contrato local; não é prova de aparência em todos os deploys. |
| Publicação e inspeção de configuração | `app/tools/test-published-configuration.js`; `app/tools/test-v5-publication-inspection.js`; `app/tools/test-published-buyer-projection.js`; `tests/buyer-v5-browser.cjs` | Inspeção e fixture local não provam quais bytes estão atualmente em produção nem acesso real de comprador. |
| Autorização `/api/configuration` (Admin) | `app/tools/test-v5-endpoint-safety.js` | Exercita a função administrativa real com Identity/Blob injetados; cobre 401/403 e zero abertura de store para acesso negado. Não cobre a função Buyer. |
| Autorização `/api/buyer-configuration` e DTO servido | `tests/buyer-configuration-endpoint.test.mjs` + `.github/workflows/buyer-configuration-boundary.yml` | Gate focado chama a função Buyer com política e leitura de cookie reais, sob stubs locais; verifica 401/403 antes de abrir store, falhas fechadas, sessão temporária simulada, acessos Admin/Staff e as chaves exatas do envelope/`displaySettings` Buyer. Não valida expiração/revogação da sessão no SQL nem exercita Identity, Postgres ou Blob hospedados. |
| DTO público de módulos e preços-base | `app/tools/test-public-modules-endpoint.js`; `tests/public-module-projection.test.cjs`; `tests/viewer-base-price-publication.test.cjs`; `tests/viewer-price-v5-save.test.cjs`; `tests/viewer-base-price-browser-gate.mjs`; `tests/summary-pricing-browser.cjs` | Projeção/publicação e UI são camadas distintas; browser local não é prova de produção. |

**Método de verificação por contrato:** validar/normalizar entradas V3/V4/V5 nos testes core; validar autorização nos testes de endpoint; verificar allowlists/omissões nos testes de projeção; verificar cálculo e publicação de preço-base nos testes de pricing/Viewer; conferir a renderização browser nos bundles Buyer/Viewer apropriados. Para a fronteira Buyer, a prova local liga a função de endpoint e a projeção a um workflow por path; o mock devolve uma sessão temporária para o token conferido pelo teste, mas não verifica expiry/revogação em SQL nem o provedor hospedado. Nenhum resultado é promovido sem run ligado ao SHA e ao ambiente corretos.

## 6. Divergências, exceções e lacunas

1. `docs/architecture/runtime-contract-map-2026-10-05.md` é histórico: descreve V3 como autoridade/produção e migração pendente; isso diverge do cutover atual em `netlify/functions/configuration.mjs:14–16, 101–115` e dos saves V5.
2. Documentos CP-SD de 07/10 são decisões/recibos datados. Preservam proveniência, mas não substituem esta fotografia de código em `main@efc40584`.
3. O mapa é uma consolidação estática com links para validadores, projeções, consumers e verificações. O novo gate Buyer exercita o código em harness local, mas não prova quais bytes estão publicados em Netlify, o conteúdo atual de stores, credenciais, nem autenticação/consistência real dos provedores.
4. O leitor público e o DTO Buyer têm fronteiras diferentes; nenhum contrato autoriza inferir acesso global a dados ou preços.
5. `DOM-005` deve decidir a retirada/alcance dos caminhos históricos V3/V4; até lá, este inventário os trata como compatibilidade existente, não como motivo para introduzir novos consumidores.
6. Os testes listados são métodos de verificação existentes. Cobertura/executabilidade por contrato e checks no SHA exato devem ser lidos dos runs aplicáveis, não deduzidos da presença dos arquivos.

## 7. Dependências do plano v0.9

- `DOM-001`: o mapa explicita o subconjunto prioritário ARC-11/12/16, associa autoridades, consumidores e métodos, e separa as provas Admin, Buyer e Viewer. O gate de autorização Buyer passou no SHA exato `7e440a5bb96fcf3a4ded82df6a0c698504a4b0ae` (run [#44442681429](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/44442681429)); o DoD documental do mapa está satisfeito neste candidato. A integração na `main` continua separada no preflight de GIT-014.
- `LOC-001`: pode usar este mapa para separar conteúdo editorial de nomes/IDs técnicos, regras comerciais e valores derivados; o inventário ARC-13 continua candidato, não uma ordem de extração automática.
- `LOC-002`, `DOM-002` e `DOM-003` continuam tarefas distintas. Este documento não aprova catálogo pt-BR, textos/alt, migração de runtime nem mudança de schema.
