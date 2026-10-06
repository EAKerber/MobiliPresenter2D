# Configuração administrativa

O painel fica em `/admin.html`. A configuração publicada continua sendo lida pelo configurador público e gravada em um store site-scoped do Netlify Blobs.

## Modelo atual

A produção continua publicada em `ConfiguratorAdministration2D 3.0`.

O painel administrativo já trabalha localmente com a representação hierárquica `ConfiguratorAdministration2D 4.0`:

```text
Etapa
└── Grupo
    └── Seção
        └── Item
```

O upgrade v3 -> v4 acontece somente em memória ao abrir o painel. Ele não migra o registro publicado.

Enquanto a produção ainda estiver em v3, a estrutura explícita usada para esse upgrade vem de `app/data/hierarchy-defaults.js`. Esse arquivo é a única configuração de compatibilidade que define:

- grupos e sua ordem/span;
- seções e sua ordem;
- labels/apresentação de seção;
- quais itens/tipos do estágio legado pertencem a cada seção;
- políticas de itens disponíveis no editor;
- a fonte das opções agregadas de Frentes, Puxadores e Pedra.

`flow-model.js` não deve conhecer IDs como `cabinet-finishes`, `handles` ou `additional-services`; `hierarchy-administration.js` não deve manter um mapa paralelo de nomes/apresentação. O HTML pode manter IDs equivalentes apenas como hooks de renderer, validados contra o fluxo normalizado.

Responsabilidades:

- catálogo/dados definem quais itens e opções existem e seus dados comerciais;
- a hierarquia administrativa define em que etapa, grupo e seção cada item aparece e sua ordem;
- estado do comprador continua separado da hierarquia;
- o renderer/teclado consomem o fluxo normalizado;
- scene/assets continuam sendo autoridade da composição visual do móvel.

## Editor hierárquico

Na aba de etapas é possível:

- reordenar etapas;
- editar o nome e o estado habilitado das etapas sob as regras dos estágios obrigatórios;
- reordenar grupos;
- editar nome e largura validada do grupo;
- reordenar seções;
- editar nome e apresentação validada da seção;
- mover seções entre grupos;
- separar uma seção em um novo grupo e unir grupos novamente;
- reordenar itens;
- mover itens entre seções compatíveis;
- separar um item em uma nova seção;
- retirar um item e recolocá-lo a partir da lista de itens disponíveis;
- configurar o estado inicial dos itens que já possuíam esse contrato;
- inspecionar, dentro de itens agregadores como `Puxadores`, `Cor das frentes` e `Pacote de pedra`, quais opções concretas estão disponíveis.

As opções concretas continuam sendo dados/opções do item, não novos donos hierárquicos. Por exemplo, `handles-all` continua sendo o único item da seção Puxadores; Tango/Íris, Ponto, Alça em cores e Definir depois aparecem como inventário de opções e continuam configurados comercialmente nas abas apropriadas.

Os controles de mover para cima/baixo e os seletores de destino são a base acessível. Drag-and-drop não é requisito para operar a hierarquia.

A apresentação das seções usa um vocabulário fechado:

- `auto`;
- `swatches`;
- `cards`;
- `list`;
- `grid`.

A largura do grupo aceita apenas os spans validados pelo schema. O painel não publica CSS, HTML arbitrário ou coordenadas.

## Compatibilidade v3 / v4

O painel mantém uma fronteira fail-closed.

Ao salvar:

1. valida o modelo hierárquico v4;
2. tenta projetá-lo para v3 sem perda;
3. se a hierarquia ainda for equivalente ao contrato legado, envia somente o v3 projetado para a API;
4. se grupos/seções/apresentação tiverem mudado de forma não representável em v3, o painel bloqueia a publicação antes do `PUT` e mantém a alteração como rascunho local.

A projeção compatível preserva a ordem histórica dos itens do v3 quando a estrutura hierárquica daquele estágio não mudou. Essa informação de compatibilidade existe apenas para round-trip seguro; não é uma segunda autoridade de navegação/layout.

A função server-side também recusa diretamente payloads `ConfiguratorAdministration2D 4.0` com `hierarchy_publication_required`. Portanto um cliente modificado não contorna a barreira do painel.

A publicação efetiva da hierarquia v4 pertence ao checkpoint autenticado de migração e não ocorre automaticamente ao editar no admin.

## Ativação no Netlify

1. Habilite Netlify Identity no projeto e configure o cadastro como **Invite only** antes de convidar qualquer conta.
2. Convide as pessoas que poderão administrar o configurador.
3. Atribua a função `admin` a cada conta autorizada em `app_metadata.roles`. O painel não permite cadastro nem concede funções.
4. Publique o site com as dependências e a função deste repositório.
5. Acesse `/admin.html` e entre com uma conta convidada com a função `admin`.

## Proteções

- O painel pode ler a configuração publicada, mas somente a função server-side grava.
- Toda gravação v3 valida o esquema e a lista de IDs permitidos, exige a função `admin` e compara a revisão enviada com a atual.
- O navegador não escolhe IDs arbitrários para módulos, itens ou etapas.
- Hierarquia v4 não pode ser publicada enquanto a barreira explícita estiver ativa.
- Alteração hierárquica incompatível não é achatada silenciosamente para v3.
- A configuração publicada é servida sem cache para que a próxima visita ao configurador receba a revisão nova.
- Testes de reordenação/publicação hierárquica usam stores/harnesses isolados e não escrevem no blob de produção.

## Retomada

Antes de alterar o contrato administrativo:

1. leia `CURRENT_STATE.md`;
2. leia `docs/backlog/ux-navigation-hierarchy-roadmap-2026-10-05.md`;
3. confirme o schema/revisão realmente publicados antes de qualquer migração autenticada;
4. não combine a publicação hierárquica com a migração independente de `stone-skirting` sem um plano explícito que prove ser mais seguro.
