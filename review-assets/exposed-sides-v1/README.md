# Laterais expostas e vidro — revisão visual

Base do trabalho: `33bae296937cfb6edd5d44319a478e8b8baf8ca6`, exclusivamente EAKerber/MobiliPresenter2D.

## Decisão

1. Reconstrução 3D completa: oferece controle, mas não há câmera calibrada nem exportação Promob neste checkout. Reconstruir agora criaria hipóteses caras.
2. Geração de cenas inteiras: descartada para integração; a primeira saída alterou a largura das frentes.
3. **Material generativo confinado às bordas da cena:** selecionado. PNGs RGBA 1536×1024 independentes, atrás do próprio módulo, sem máscara de acabamento. Os pixels originais das frentes permanecem nos assets originais.

O vidro é uma geometria vetorial fixa, rasterizada para compatibilidade com o compositor existente. Seu alfa translúcido funciona sobre qualquer combinação de módulos. A faixa é estreita porque a divisória é vista quase de perfil nesta câmera; ampliar a faixa para imitar a largura aparente do Promob mudaria a perspectiva do site.

## Evidências localizadas

- `app/assets/kitchen/base.png`: fundo sem módulos, mas com lavadora, tanque, geladeira e janela; não é uma cena apenas com paredes.
- `app/assets/kitchen/composicao-completa.png`: referência histórica, preservada.
- `app/assets/kitchen/layers`, `masks`, `variants`, `overlays`: composição e máscaras reais.
- `review-assets/perspective-grid.json`, `gap-parallelism-grid.json`, `authoring-contracts.json`: medidas locais e limites de edição.
- Branch `origin/research/reconstruction-architecture-v0.1`: estudos locais de perspectiva, com ressalvas expressas contra tratar pistas históricas como câmera global calibrada.
- O catálogo contém dimensões e referências de origem Promob, mas não foram encontrados os próprios DXFs/modelos 3D nas duas branches de pesquisa consultadas nem na main. Nenhum outro repositório foi acessado.

## Cobertura dos módulos

| Módulo | Tratamento |
|---|---|
| 01 | Lateral existente preservada. |
| 02 | Continuação direita existente e sua regra de oclusão preservadas. |
| 03 | Sem nova lateral direita: inferência retirada após revisão de perspectiva. A posição à esquerda é ocupada pelo fogão substituto quando 02 sai. |
| 04 | Painel original preservado. |
| 05 | Nova continuação direita, visível somente sem 06. |
| 06 | Sem lateral na cena nesta câmera. O render esquerdo gerado permanece apenas na imagem principal do painel de especificações. |
| 07 | Nova continuação esquerda, visível somente sem 04; a projeção da face se estende para igualar 400 mm aos demais aéreos quando 04 sai. |

**Correção do usuário:** a geração do aéreo 06 mostrava duas laterais externas incompatíveis. Somente o material da esquerda foi aproveitado. A face direita dessa geração não participa de nenhum asset final. A geometria dos retornos continua sendo inferência local revisável, não medição 3D certificada.

## Vidro

`tempered-glass` lê diretamente `globalSelections.serviceIds`. Não tem host, exigência de módulos, hotspot, item no catálogo nem participação nos acabamentos. A opção existente é a única fonte de estado e preço. Reset conserva o padrão já existente de serviço selecionado. A camada encontra a coluna/parede ao fundo e fica atrás das camadas de módulos.

A junta de pedra entre 02 e 03 usa agora um único perfil projetado. O pixel de encontro pertence à pedra 02; a pedra 03 começa imediatamente após ele, evitando a cunha sobreposta que vinha das duas bordas incompatíveis.

## Validação e limites

- Núcleo do app após a correção de perspectiva: 20 entidades de cena, 7 módulos na lista; M06 permanece apenas como sobreposição da imagem de especificação.
- 256 estados de módulos/vidro: PASS, incluindo independência do vidro e exclusão de duas continuações externas no mesmo módulo.
- Navegador Edge: carregamento, toggle, reset, desktop/mobile e ausência de erros verificados.
- Assets: 38 imagens verificadas; baseline histórico sem diferenças de pixels.
- Quatro variantes históricas: PASS contra referência mais adição explícita do vidro.
- `gate.json`: recortes confinados às ROIs; isso valida localização, **não** certifica a perspectiva ou a estética.
- Aprovação visual final: PENDING. Animações não iniciadas: dependem do sucesso visual das laterais, conforme pedido.
- A suíte Python ampla executou 60 testes e apresentou 4 falhas e 2 erros. A execução em uma cópia limpa do commit base reproduziu exatamente os mesmos casos: hashes de PNG em experimentos históricos de torneira/pedra e limpeza de arquivo aberto no Windows. Esses problemas preexistentes não foram corrigidos nem classificados como PASS.

## Reprodução

As fontes geradas e as entradas estão nesta pasta. O gerador utilizado foi o imagegen integrado; não há chamada generativa em runtime. `prompts.json` registra os prompts.

Com Node e sharp disponíveis: `node tools/build_exposed_sides.cjs`. Em seguida, `python app/tools/update-technical-data.py` e `node app/tools/test-core.js`.

Com Playwright e Chromium disponíveis: `node tests/exposed-sides-glass.cjs <pasta-de-capturas>`. `BROWSER_EXECUTABLE` aceita um navegador instalado e `APP_URL` permite verificar uma prévia servida.

As saídas completas geradas são apenas doadoras; nunca substituir o fundo ou a cena por elas.
