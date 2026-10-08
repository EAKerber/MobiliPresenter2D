# CP-POSTV5-01 — discovery de cobertura da autoria v5 — 2026-10-08

Status: **DISCOVERY COMPLETE / CODE CHANGE NOT AUTHORIZED BY THIS DOCUMENT**. Estado verificado contra a `main` após PR #171. Não se realizou PUT/GET sensível nem qualquer leitura/gravação do Blob de produção.

## Objetivo e método

Distinguir o que o editor administrativo v5 consegue publicar como **edição de dados existentes**, o que pode compor genericamente a **estrutura de apresentação** e o que exige alterar a **autoridade estática de catálogo/cena**. A existência de um campo no schema não é prova, por si só, de que existe UI/asset/interação que o interpreta.

Arquivos examinados: `app/admin/admin.js`, `app/admin.html`, `app/core/administration-v5.js`, `app/core/hierarchy-editor.js`, `app/core/configuration.js`, `app/core/item-capabilities.js`, `app/core/published-buyer-projection.js`, `app/core/flow-model.js`, `app/data/scene-data.js` e `app/data/hierarchy-defaults.js`.

## Matriz de capacidade atual (classificação estática, não smoke de publicação)

| Ação de autoria | Evidência concreta | Classificação | Gate antes de depender em produção |
|---|---|---|---|
| Editar nome/descrição/destaques/componentes/requisitos de objetos existentes | `renderObjects()` lê `model.objects[id]` e edita esses cinco campos; `catalogObjects()` lista identificadores já conhecidos de módulos/acessórios/serviços/puxadores/pedra | **Suportado para IDs existentes** | Save v5 no fake endpoint + buyer de detalhe |
| Reordenar etapas, grupos, seções e itens já cadastrados | `hierarchy-editor.js` implementa `moveStage/Group/Section/Item` e `split/merge`; `administration-v5.js` valida o componente/comportamento por seção | **Suportado com regras** | Casos válidos e inválidos de section binding, navegação e ausência sem fallback |
| Criar etapa personalizada | `addStageButton` insere etapa `custom` desativada, com limite de 12; `item-capabilities.js` restringe quais tipos podem ser atribuídos | **Estrutura suportada, conteúdo restrito ao registro existente** | Criar etapa, atribuir um item válido e verificar comprador/teclado; etapa vazia/desativada não é prova de nova entidade |
| Reatribuir item existente entre etapas/seções | `getItemOptions()` consulta `configurationCore.itemRegistry(catalog)` e `stageAllowsItem()`; renderização de destino respeita compatibilidade | **Suportado apenas para catálogo registrado** | Validar ownership único, card e navegação; não forçar IDs desconhecidos |
| Criar nova cor/material na UI | `addMaterialButton` acrescenta material, associação inicial a Frentes, disponibilidade desativada e regra de preço percentual zero; `setMaterialTarget()` permite associar material a Frentes/Pedra/puxadores existentes | **Autoria local presente; persistência/efeito visual de novo ID ainda não comprovados aqui** | Fixture real v5 de nova cor, `validate/normalize`, buyer swatch/preview, preço e round-trip; falha vira bug de contrato, não fallback |
| Editar preço tipado | `renderPricing()` usa `pricingContract.ROLE_CAPABILITIES`, número em centavos/bps e seletor de tipo só quando a role declara mais de um tipo | **Suportado conforme role declarada** | Testar valor fixo e percentual, base, arredondamento e retorno da revisão |
| Adicionar regras de dependência/evento | `addDependencyButton` e `addEventButton` criam regras com IDs existentes; `model.dependencies/events` são validados | **Suportado para referências e ações permitidas** | Dependência real/ciclo inválido + evento permitido em fixture e teste de cena/estado |
| Editar escolhas de acabamento/puxador/pedra existentes | `materialTargetOptions()` usa `model.handleProducts` para materiais dos puxadores e os grupos `fronts-all`/`stone-all` | **Suportado como associação a produtos existentes** | Confirmar que produto/máscara/textura concreta existe e é representável no buyer |
| Criar um **novo módulo físico** apenas no admin | `configurationCore.itemRegistry(catalog)` extrai módulos de `catalog.modules`; `catalogObjects()` enumera esses mesmos módulos; `scene-data.js` declara entidades e suas sobreposições/visibilidade | **Não existe autoria completa de nova entidade** | Exigir contrato de catálogo + assets + scene, geometria, z-index, máscaras, preço, dependências e controles antes de expor botão |
| Criar novo produto de puxador ou pedra (não apenas material) | IDs de produto vêm de `catalog.options.handles` e `catalog.options.stonePackages`; `handleProducts` em v5 liga opções às regras de preço | **Não demonstrado como criação arbitrária independente do catálogo** | Declarar identidade comercial, disponibilidade, apresentação, preço e imagem antes de adicionar |
| Substituir imagem/máscara por upload novo | `assetChoices()` lista caminhos existentes em `scene.entities`; objeto v5 guarda `imageAsset/detailImageAsset/maskAsset`, mas a lista não prova upload nem criação de máscara geométrica | **Seleção/referência parcial, pipeline de novos assets não comprovado** | Verificar hospedagem, máscara/alfa, recorte e compatibilidade geométrica; nunca gerar referência quebrada |
| Ajustar layout/PiP/dock como política arbitrária no admin | `administration-v5.js` valida `presentationPolicy`; política está no v5 e é interpretada pelo comprador, mas os controles vistos no admin não expõem editor completo dessas relações | **Contrato de runtime existente; autoria administrativa geral não demonstrada** | Falsificar com fixture de política válida e inválida antes de criar controles visuais |

## Fronteira arquitetural encontrada

A estrutura `stage → group → section → item` é **schema-driven** para IDs admitidos. Isso não torna o catálogo de produtos nem a cena automaticamente extensíveis: o registro de itens, as entidades geométricas, os assets e muitos vínculos de preço são autoridades distintas. Um novo módulo não pode surgir corretamente apenas porque um ID foi colocado em uma seção.

A principal oportunidade de experimento de **baixo risco** é provar a cadeia completa para **uma nova cor/material**, porque o admin já oferece o fluxo de criação local e vincula disponibilidade/preço. Em vez de inventar um novo módulo ou introduzir um schema 5.1, um pequeno teste de fixture permite falsificar se essa cadeia realmente atravessa `administration-v5.validate/normalize → published-buyer-projection.prepare → renderização de Frentes → pricing`.

## Próximo checkpoint recomendado: CP-POSTV5-02a

**Somente prova em memória/browser, sem mudanças de produção**:

1. Gerar fixture v5 a partir de dados canônicos do repositório, acrescentar material de teste com ID novo exatamente pelo contrato usado por `addMaterialButton`, habilitá-lo e associá-lo a `fronts-all` sem tocar nos materiais existentes.
2. Executar `administration-v5.validate/normalize`, `published-buyer-projection.prepare` e round-trip de Save v5 sobre store falso; capturar com precisão qualquer erro. Testar negativamente ID de módulo não registrado e assets ausentes.
3. Se validar, provar em browser que o swatch novo aparece e sua cor/estado/preço sobrevivem seleção e releitura. Se o buyer não reconhecer o material, considerar o fluxo **PARCIAL/FAIL**, não como capacidade funcional pronta.
4. Não abrir edição de entidade/catálogo no admin antes da prova. Se o método revelar dependência de ID estático ou asset obrigatório, especificar o menor contrato possível antes do código.
5. Reportar diffs, falhas e gates na matriz; só então decidir implementação. O público landing/viewer segue sob coordenação separada.

## Decisão de parada

Não fazer alteração genérica de schema ou criar engine de cena para satisfazer o experimento. Se a nova cor já funciona integralmente, registrar **PASS/NOOP** e escolher o próximo recorte de valor. Se falhar, isolar uma única quebra no admin/validador/comprador, preservando o baseline aceito e preços. Se depender de novo asset real, pedir evidência/arte antes de declarar suporte completo.

Este é inventário de capacidade com base em código; **não** significa que testes de novas cores ou novos módulos já foram executados.
