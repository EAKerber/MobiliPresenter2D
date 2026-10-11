# Viewer público: fronteira e migração

## 2026-10-10 — helpers compartilhados de desenho e geometria

`app/core/technical-drawings.js` agora é carregado pelo configurador e pelo viewer. Ambos usam os mesmos geradores de vistas frontal/lateral, isométrica e interna, incluindo os padrões `two-doors` e `two-doors-and-microwave`. `two-doors-and-lift` é um padrão legado e quebrado; a implementação preservada na extração não deve ser tratada como comportamento correto nem como referência visual. As páginas continuam normalizando seus próprios dados e montando seus wrappers, títulos, notas e recortes de foco. A vista interna aceita enquadramento e chamada próprios do viewer, preservando seu retângulo maior e o rótulo de vãos confirmados.

`app/core/scene-geometry.js` compartilha a conversão de `alphaBounds` para percentuais e a resolução de lado dos marcadores. A composição completa continua própria de cada página, mas `app/core/scene-component.js` também fornece a criação de camadas com máscaras, a atualização do estado de hotspots e o posicionamento do retângulo de seleção. Filtros, seleção, criação dos hotspots e estado comercial continuam próprios.

Gate visual local dos SVGs: rasterizei offline as vistas anteriores e atuais dos sete módulos do catálogo, incluindo frontal, lateral, isométrica e a vista interna disponível. Não encontrei diferença geométrica nas vistas do catálogo. A prancha também contém um oitavo caso sintético de `two-doors-and-lift`, que é legado quebrado; esse caso deve ser desconsiderado como referência de correção. A prancha está em `C:/Users/eduak/.codex/visualizations/2026/10/09/01a11e58-fea7-7d21-9732-fd375df49fa7/technical-drawings-20261011/svg-baseline-vs-current.png`.

Esta foi uma comparação offline da geometria SVG; não valida DOM/CSS responsivo, layout completo no navegador, foco/cena ou integração da página. Nenhum teste automatizado foi executado.

Os cabeçalhos das páginas permanecem explícitos no HTML. Há poucas páginas com links e comportamentos de navegação diferentes; não há template/build de páginas que reduza a duplicação sem introduzir carregamento em runtime ou alterar semântica/SEO.

## 2026-10-08 — Carregamento público preparado (CP-PUBLIC-02b, opt-in)

O adapter standalone foi corrigido para respeitar `publicModules` e `publicState` injetados (antes o caminho `create()` descartava `publicModules`). Módulos fora da allowlist publicada ficam invisíveis também na cena, não apenas sem hotspot.

`viewer/public-data.js` faz exclusivamente GET same-origin de `/api/public-modules`, sem cache, e exige `PublicModulePresentation2D 0.1`. `viewer.js` usa a resposta para iniciar a página quando `window.CASA_PUBLIC_VIEWER_INTEGRATION.usePublishedApi === true`; enquanto o endpoint não estiver presente, a flag fica desativada e o staging continua com dados do catálogo/cena **explicitamente de teste**.

**Fail-closed quando habilitado:** API sem publicação válida, erro HTTP, erro de rede ou payload incompatível → mensagem neutra, sem trocar silenciosamente para catálogo estático. Há testes de contrato do carregador, da fábrica standalone e dos acabamentos permitidos, mas NÃO há prova de integração em deploy real ainda.

O endpoint separado é proposto na PR #179 (que depende de #178 e aponta para `main` para gerar deploy preview), nunca em `/api/configuration` integral. Habilitar a flag em produção só depois que endpoint + viewer estiverem na mesma árvore, com publicação v5 correta, browser tests e revisão do isolamento do configurador. A rota `/` e o GET completo ainda permanecem legados por enquanto.

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
- `app/core/scene-component.js` é **parte do viewer standalone**, não um renderer compartilhado com a main. Os helpers puros de bounds e lado do marcador agora são compartilhados em `app/core/scene-geometry.js`. Camadas, máscaras, hotspots, seleção e composição continuam distintas: o configurador filtra módulos configurados, define z-index e acrescenta comportamento de pedra, rodapé, overlays e oclusão. Não trocar o renderer aceito em lote.
- Os geradores SVG comuns de `app/viewer/technical-views.js` e `app/app.js` agora vivem em `app/core/technical-drawings.js`; as páginas passam dados normalizados e mantêm wrappers/notas/foco. `two-doors-and-lift` é um padrão legado quebrado, não uma referência correta; a oitava amostra sintética da prancha visual deve ser ignorada. O gate de CSS/responsividade e integração em browser continua distinto e não foi executado.
- A cena também compartilha em `app/core/scene-component.js` a criação das camadas, aplicação de máscaras, atualização de estados acessíveis dos hotspots e geometria do retângulo de seleção. O configurador injeta a resolução de assets administrativa e mantém z-index inline. A seleção de módulos, filtros, criação dos hotspots, controles, visibilidade e acabamento comercial continuam com suas políticas próprias.
- `node --test app/viewer/scene-adapters.test.mjs` (invocado da raiz; no pacote `app` roda `node --test viewer/scene-adapters.test.mjs`) verifica catálogo/cena **atuais**, sete entidades, detalhes reais, callbacks e assets. **Não** verifica pixel-perfect, visibilidade dinâmica de pedra/rodapé nem auth; esses gates ficam para CP-PUBLIC-02/03.
- A landing e o viewer são páginas públicas planejadas; o configurador irá de `/` para `/config/` somente após o gate de sessão emitida por e-mail e proteção server-side. O admin continua Identity. Não criar backend de contas nem ativar Google nesta etapa.


O viewer é uma página independente: não carrega `app.js` nem a UI do configurador/admin. Seu contrato público fica em `PublicSceneAdapter 0.5`; o contrato do produto continua no catálogo existente (`ProductCatalog2D 1.1`), sem um segundo schema de produto.

## Fonte de cada dado

- `app/data/scene-data.js` é a fonte de IDs, entidades, bounds, assets, máscaras, camadas e visibilidade.
- `app/data/catalog-data.js` é a fonte de título, categoria, medidas, componentes, requisitos, destaques e desenho técnico. `publicPresentation.description` e `.carcass` são campos opcionais aditivos para texto público que não pertence aos dados geométricos.
- `app/viewer/data.js` define apenas a ordem dos blocos, os tipos de vista e os placeholders de detalhe. Não mantém cópias de módulos.
- `app/core/scene-component.js` atende a cena do viewer standalone: aplica suas camadas/máscaras, hotspots, seleção e atalhos. O configurador mantém renderização própria em `app/app.js`; não assumir que a implementação do viewer já é compartilhada ou equivalente.
- `app/viewer/scene-adapters.js` traduz os contratos atuais para o modelo que a página consome. Esse limite deve permanecer durante as atualizações do core.

## Caminhos do adapter

`CASA_PUBLIC_SCENE_ADAPTERS.create(options)` é a factory única: recebe `repository` (cena, catálogo, core, validação, componente de cena, máscaras, acabamento e prefixo de assets) e retorna a interface estável. A página lê a configuração opcional de `CASA_PUBLIC_VIEWER_INTEGRATION.repository`; se ausente, usa a factory standalone com os contratos locais. `onSelectionChange` pode ser fornecida nessa configuração e recebe `{ moduleId, module, entity }` na inicialização e a cada seleção. A assinatura é igual à de `subscribe`. O host pode assim sincronizar o viewer com uma rota, telemetria ou painel externo sem importar `app.js`.

`createStandaloneAdapter` encaminha para `createRepositoryAdapter`; o mapeamento do conector é exercido também na página independente. O adapter centraliza `getAssetUrl(asset)` e `getSceneCanvas()` para renderizadores e mantém `subscribe(listener)`/`select(id)` para controle bidirecional. Evitamos comparar versões literais de contratos em runtime: a factory valida capacidades necessárias, e o host pode inspecionar `contractVersion` antes de ligar uma integração externa.

O adapter exige as capacidades `createInitialState`, `resolveVisibility` e `assertValidScene` e valida a cena recebida. Ele usa IDs de entidade para relacionar catálogo e geometria, em vez de depender de posição em arrays ou comparar a versão literal dos contratos. A seleção inicial aceita `?module=module-07` e volta ao primeiro módulo disponível quando o ID não existe.

## Código temporário e aposentadoria

O snapshot local dos sete módulos foi removido. O staging usa `ProductCatalog2D 1.0` da main apenas como fallback até que `publicModules` e `publicState` sejam entregues por transporte seguro. Descrição editorial separada permanece vazia no baseline; Destaques são a lista `benefits[]` do ADM. Não existe informação visual independente de caixaria, e não se infere caixaria de benefícios. A composição da página em `data.js` permanece necessária e não é uma cópia do catálogo.

`app/viewer/technical-views.js` mantém o adaptador de dados, o foco de cena e os wrappers; os algoritmos geométricos são compartilhados com `app/app.js` por `app/core/technical-drawings.js`. A geometria de seleção/posicionamento também usa dois helpers pequenos compartilhados. Sequência restante:

1. Na hospedagem integrada, fornecer `CASA_PUBLIC_VIEWER_INTEGRATION.repository` com contratos e helpers ativos e ligar `onSelectionChange` à rota/página hospedeira; o teste local cobre factory, mapeamento de catálogo, bounds, requisitos, seleção e prefixo de assets.
2. Comparar a cena e os detalhes para os sete módulos. Depois da aprovação, retirar `createStandaloneAdapter` e os scripts locais de `scene-data`, `catalog-data`, `mask-data`, `state`, `visibility`, `validation`, `finishes` e `scene-component` de `viewer/index.html`; o host passa a fornecê-los uma única vez.
3. **Concluído localmente:** extrair os geradores para `app/core/technical-drawings.js`, com dados normalizados, sem estado de produto/configurador.
4. **Concluído localmente:** configurar viewer e configurador para consumir o módulo mantendo wrappers de cada página.
5. **Pendente antes de publicar:** comparar vistas frontal, lateral, isométrica, foco e interna confirmada nos sete módulos em desktop/mobile e confirmar que acabamento não colore caixaria.
6. Não excluir `technical-views.js`: o adapter ainda fornece foco, integração de dados e wrappers do viewer. Não unificar renderizadores. Manter `createRepositoryAdapter` como fronteira.

Antes de cada remoção, confirmar ausência de referências com busca no projeto e executar os testes de contrato e a comparação visual. Não remover o catálogo, `data.js` de composição, nem o adapter de fronteira: eles seguem tendo papéis distintos após a integração.

## Acabamentos

O viewer aplica o acabamento-base pelas máscaras compartilhadas, mas ainda não oferece picker. O catálogo publica opções globais de frente, e o estado existente também modela essa seleção como global; para adicioná-la, expor leitura e troca de acabamento no adapter e renderizar as opções publicadas, sem importar `app.js`. A caixaria não tem grupo nem máscara próprios e **não** é apresentada como propriedade visual deduzida de texto. Qualquer seleção própria de cor requer geometria/máscaras separadas, mas a frente de laterais está congelada indefinidamente; não implementá-la como parte deste viewer.


## CP-PUBLIC-02b — materiais novos sem duplicar autoridade
`publicState.availableFinishes[]` traz somente opções públicas da publicação v5, incluindo materiais cadastrados depois do catálogo físico. O adapter valida os campos e usa esses acabamentos para atualizar a cena; `getFinishes()` expõe opções ao futuro controle sem nova cópia de estado, e `setGlobalFinish()` altera o `ViewerState2D` compartilhado. A fixture do viewer comprova IDs de acabamento inéditos e recusa texturas externas. Não adicionamos controle visual nem persistência de seleção local/inter-sessão neste recorte.
