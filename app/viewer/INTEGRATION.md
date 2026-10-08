# Viewer público: fronteira e migração

## 2026-10-08 — Autoridade editorial, estado inicial e caixaria (CP-PUBLIC-02a)

**Decisão de produto e implementação corrigida no staging:**
- `Destaques (um por linha)` no ADM são `objects[id].benefits[]`, lista de frases autoradas; no viewer podem aparecer sob um título cosmético **Descrição**, mas não devem virar `objects[id].description` nem `summary` sintético. O campo `description` real está vazio no baseline e continua opcional. Nenhum destaque é removido por conter a palavra “caixaria”.
- Componentes e Requisitos seguem `components[]` e `requirements[]`; cada linha é um item independente. Título/labels do bloco no viewer são apresentação, não fonte de dados.
- `module-07` era default arbitrário em `data.js` e foi removido. Precedência agora: deep link `?module=` válido **e visível** → `selectedEntityId` explícito no estado injetado, se válido/visível → primeiro módulo visível na **ordem fornecida pelos dados públicos**. Sem módulo visível, falha fechada. Na falta temporária de projeção externa, o staging usa cena + catálogo atual (não simula publicação v5).
- `createRepositoryAdapter` pode receber `publicModules` (a lista allowlist do CP-PUBLIC-02a com ordem/texto publicado) e `publicState` (`entities` e `finishId` publicados). **Não** receber v5 administrativo integral no browser. `getState()`, `subscribeState()` e `setGlobalFinish()` usam o mesmo `ViewerState2D` que renderiza a cena; mudança de acabamento atualiza a cena e emite estado sem segundo store/writer. Não há seletor novo nem sincronização entre abas/sessões implementada: isso requer contrato explícito de persistência/transporte no futuro.
- **Caixaria:** o usuário confirmou que não existe representação visual separável no cenário atual. A técnica de laterais está **congelada por prazo indeterminado**. Não fazer máscara/recoloração, não parsear destaques para inferir caixaria, não criar botão de cor sem efeito. O conceito futuro continua: acabamento próprio, Branco como opção única, seleção global, elegibilidade por módulo. Nenhuma alteração ao schema v5 em produção é autorizada por esse conceito.
- Metadado contratual da doadora `ProductCatalog2D 1.1` foi corrigido para a versão **1.0** declarada na main.

**Gates ainda abertos:** CP-PUBLIC-02a precisa integrar um transporte público seguro; o viewer standalone em preview ainda usa dados estáticos até receber `CASA_PUBLIC_VIEWER_INTEGRATION.repository`. Paridade stone/plinth/masks e segurança de acesso permanecem pendentes. PR #175 continua DRAFT/HOLD.


## 2026-10-08 — Rebase seletivo sobre a main v5 (CP-PUBLIC-01)

**Estado: staging experimental, NÃO autoriza publicação do viewer como experiência comercial final.** A branch doadora estava **228 commits atrás** da main no inventário. Foram importados arquivos isolados, sem substituir `app/data/catalog-data.js`, `app/index.html`, rotas, API, configuração v5 ou editor. O status canônico é `docs/backlog/cp-public-00-landing-viewer-config-access-roadmap-2026-10-08.md`.

- A main atual **não contém** `publicPresentation.description` nem `.carcass` no catálogo; a branch doadora propunha dados adicionais. O adapter em staging faz fallback para dados existentes (benefícios etc.); **isso não prova equivalência editorial com v5**. Nenhuma descrição/caixaria comercial deve ser inventada ou copiada do catálogo defasado. A próxima revisão deve obter a apresentação pública do contrato publicado, com projeção allowlist segura, preservando cena e dimensões do catálogo/scene.
- **Falha real falsificada no browser (PR #175):** após seleção, o `viewer.js` aplicava `aria-pressed` lendo `data-module-id`, enquanto o adapter marca `data-select-scene-entity`/`data-entity-id`; sobrescrevia a seleção correta do componente com `false`. Corrigido removendo o segundo writer. Gating: screenshot e clique em um segundo módulo em desktop e mobile.
- `app/core/scene-component.js` importado ainda **não é o renderizador da main**; contém implementação paralela de camadas, máscaras, finish, hotspot, quadro e teclado. O configurador v5 contém caminhos mais completos (pedra, rodapé, overlays, oclusão). Reutilizar só primitivas após testes de imagem/caso, não trocar o renderer aceito em lote.
- Os geradores SVG ainda são duplicados entre `app/viewer/technical-views.js` e `app/app.js`. Extração `app/core/technical-drawings.js` requer comparação por módulo, tipo, estado interno e breakpoint. Carrosséis de ambientes, de views e dock/PiP são domínios diferentes, não candidatos a compartilhamento automático.
- `node --test app/viewer/scene-adapters.test.mjs` (invocado da raiz; no pacote `app` roda `node --test viewer/scene-adapters.test.mjs`) verifica catálogo/cena **atuais**, sete entidades, detalhes reais, callbacks e assets. **Não** verifica pixel-perfect, visibilidade dinâmica de pedra/rodapé nem auth; esses gates ficam para CP-PUBLIC-02/03.
- A landing e o viewer são páginas públicas planejadas; o configurador irá de `/` para `/config/` somente após o gate de sessão emitida por e-mail e proteção server-side. O admin continua Identity. Não criar backend de contas nem ativar Google nesta etapa.


O viewer é uma página independente: não carrega `app.js` nem a UI do configurador/admin. Seu contrato público fica em `PublicSceneAdapter 0.5`; o contrato do produto continua no catálogo existente (`ProductCatalog2D 1.1`), sem um segundo schema de produto.

## Fonte de cada dado

- `app/data/scene-data.js` é a fonte de IDs, entidades, bounds, assets, máscaras, camadas e visibilidade.
- `app/data/catalog-data.js` é a fonte de título, categoria, medidas, componentes, requisitos, destaques e desenho técnico. `publicPresentation.description` e `.carcass` são campos opcionais aditivos para texto público que não pertence aos dados geométricos.
- `app/viewer/data.js` define apenas a ordem dos blocos, os tipos de vista e os placeholders de detalhe. Não mantém cópias de módulos.
- `app/core/scene-component.js` é compartilhado para renderizar a cena, aplicar máscaras, selecionar entidades e tratar os atalhos.
- `app/viewer/scene-adapters.js` traduz os contratos atuais para o modelo que a página consome. Esse limite deve permanecer durante as atualizações do core.

## Caminhos do adapter

`CASA_PUBLIC_SCENE_ADAPTERS.create(options)` é a factory única: recebe `repository` (cena, catálogo, core, validação, componente de cena, máscaras, acabamento e prefixo de assets) e retorna a interface estável. A página lê a configuração opcional de `CASA_PUBLIC_VIEWER_INTEGRATION.repository`; se ausente, usa a factory standalone com os contratos locais. `onSelectionChange` pode ser fornecida nessa configuração e recebe `{ moduleId, module, entity }` na inicialização e a cada seleção. A assinatura é igual à de `subscribe`. O host pode assim sincronizar o viewer com uma rota, telemetria ou painel externo sem importar `app.js`.

`createStandaloneAdapter` encaminha para `createRepositoryAdapter`; o mapeamento do conector é exercido também na página independente. O adapter centraliza `getAssetUrl(asset)` e `getSceneCanvas()` para renderizadores e mantém `subscribe(listener)`/`select(id)` para controle bidirecional. Evitamos comparar versões literais de contratos em runtime: a factory valida capacidades necessárias, e o host pode inspecionar `contractVersion` antes de ligar uma integração externa.

O adapter exige as capacidades `createInitialState`, `resolveVisibility` e `assertValidScene` e valida a cena recebida. Ele usa IDs de entidade para relacionar catálogo e geometria, em vez de depender de posição em arrays ou comparar a versão literal dos contratos. A seleção inicial aceita `?module=module-07` e volta ao primeiro módulo disponível quando o ID não existe.

## Código temporário e aposentadoria

O snapshot local dos sete módulos foi removido. As descrições públicas e a informação da caixaria agora ficam no `ProductCatalog2D 1.1`; componentes, requisitos, benefícios, medidas, desenho e geometria vêm de suas fontes atuais. A composição da página em `data.js` permanece necessária e não é uma cópia do catálogo.

`app/viewer/technical-views.js` ainda repete os geradores SVG do configurador. Essa é a duplicação temporária remanescente; não a apagar antes de substituir ambas as implementações por um módulo puro compartilhado. Sequência segura:

1. Na hospedagem integrada, fornecer `CASA_PUBLIC_VIEWER_INTEGRATION.repository` com contratos e helpers ativos e ligar `onSelectionChange` à rota/página hospedeira; o teste local cobre factory, mapeamento de catálogo, bounds, requisitos, seleção e prefixo de assets.
2. Comparar a cena e os detalhes para os sete módulos. Depois da aprovação, retirar `createStandaloneAdapter` e os scripts locais de `scene-data`, `catalog-data`, `mask-data`, `state`, `visibility`, `validation`, `finishes` e `scene-component` de `viewer/index.html`; o host passa a fornecê-los uma única vez.
3. Extrair os geradores e suas funções auxiliares de desenho para `app/core/technical-drawings.js`, recebendo apenas dados normalizados e sem acessar o estado ou DOM do configurador.
4. Fazer configurador e viewer chamarem esse módulo, preservando os wrappers de layout de cada página.
5. Comparar vistas frontal, lateral, isométrica, foco e interna confirmada nos sete módulos, em desktop e mobile; também confirmar que o acabamento não colore a caixaria.
6. Só depois remover os geradores duplicados de `app/app.js` e excluir `app/viewer/technical-views.js`; apagar scripts e estilos que ficarem sem referências. Manter `createRepositoryAdapter` como fronteira de compatibilidade.

Antes de cada remoção, confirmar ausência de referências com busca no projeto e executar os testes de contrato e a comparação visual. Não remover o catálogo, `data.js` de composição, nem o adapter de fronteira: eles seguem tendo papéis distintos após a integração.

## Acabamentos

O viewer aplica o acabamento-base pelas máscaras compartilhadas, mas ainda não oferece picker. O catálogo publica opções globais de frente, e o estado existente também modela essa seleção como global; para adicioná-la, expor leitura e troca de acabamento no adapter e renderizar as opções publicadas, sem importar `app.js`. A caixaria não tem grupo nem máscara próprios: neste momento pode ser apresentada como propriedade do módulo, mas sua seleção de cor requer geometria/máscaras separadas e um contrato específico.
