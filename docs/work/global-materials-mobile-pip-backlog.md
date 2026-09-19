# Backlog — materiais, rodapé, navegação e PiP

Branch: `feat/global-finishes-stone-mobile-pip`  
PR: #32 (draft)  
Estado: implementação em preview; nenhuma promoção para `main`.

## B1 — Rodapé com semântica de material
- [x] Manter um único `plinthMask` físico.
- [x] Rodapé OFF usa material MDF global e não herda luminância/granulação da pedra original.
- [x] Rodapé ON usa a pedra global selecionada.
- [x] Mudança de pedra não altera o rodapé quando OFF.
- [x] Mudança de MDF não altera o rodapé quando ON.
- [ ] Revisão visual pelo usuário no deploy-preview.

## B2 — MDF: cor autoritativa + textura tonal
- [x] Recuperar o comportamento cromático validado da `main` como camada primária.
- [x] Usar a imagem fornecida apenas como variação tonal/detalhe, sem `multiply` RGB sobre a cor antiga da cena.
- [x] Aplicar a mesma semântica aos swatches.
- [x] Branco base volta a usar opacidade 0,84 do preset validado.
- [ ] Revisão visual de claros, madeira e escuros no preview.

## B3 — Navegação sem overflow
- [x] Compactar rótulos pela largura real do container, não pela largura da viewport.
- [x] Preservar nome completo em `title` e `aria-label`.
- [x] Impedir overflow mesmo fora do modo compacto.
- [x] Gate em painel estreito de desktop e mobile.

## B4 — PiP
- [x] `viewerCard` continua sendo o containing block dos controles ao voltar ao modo normal.
- [x] Fora do PiP, somente o controle de pin permanece visível.
- [x] Transparência e resize aparecem apenas quando pinned.
- [x] Posição/tamanho personalizados são reclampados após resize/orientação.
- [x] Clique em módulo continua abrindo a ficha sem derrubar o PiP.
- [ ] Revisão visual do usuário.

## Gates
- [x] `npm test`.
- [x] Browser gate: matriz MDF/pedra do rodapé.
- [x] Browser gate: composição tonal de MDF sem `mix-blend-mode:multiply`.
- [x] Browser gate: ausência de overflow nas etapas.
- [x] Browser gate: afiliação/visibilidade/reclamp dos controles PiP.

## B5 — Discovery e correção geométrica do rodapé
- [x] Hipótese CONFIRMADA: o plinthMask era horizontalmente conservador demais.
- [x] Medição stone-02: máscara 503..744 versus owner alpha 485..756 no band 858..893.
- [x] Medição stone-03: máscara 744..1203 versus owner alpha 736..1216 no band 858..893.
- [x] Expandir somente até o suporte alpha medido; o gerador continua clipando pelo owner alpha.
- [x] Bridges não possuem suporte alpha de rodapé e permanecem vazios.
- [ ] Revisão visual da pequena lateral esquerda e das duas extremidades.

## B6 — Coerência tonal do rodapé MDF
- [x] Hipótese CONFIRMADA: frentes e rodapé MDF usam pipelines estruturalmente diferentes.
- [x] Hipótese REFUTADA como necessidade imediata: não criar um donor plate manual novo.
- [x] Gerar plate neutro de baixa frequência a partir da iluminação do caso, removendo granulação da pedra.
- [x] Normalizar o plate para média 1,0 e limitar ganho a 0,86..1,10 no runtime.
- [ ] Revisão visual de branco, claro médio e carvão.

## B7 — Seams adaptativas
- [x] Hipótese CONFIRMADA: não existia camada estrutural dedicada sobre o material.
- [x] Extrair máscaras shadow/highlight por contraste local, sempre dentro da máscara de acabamento e com erosão de 1 px para não criar outline externo.
- [x] Medir luminância das texturas reais; valores observados: 0,9242 / 0,5259 / 0,9216 / 0,7679 / 0,7988 / 0,1647.
- [x] Bounds adaptativos: escuro 0,12..0,25; claro 0,78..0,94; interpolação smoothstep sem saltos.
- [x] Claros recebem shadow progressivo; escuros recebem shadow reduzido + highlight sutil.
- [x] Validador falha se a luminância configurada divergir do asset em mais de 0,015.
- [ ] Revisão visual de seams em branco, Névoa, madeira e carvão.


## B8 — Correção do grafo de dependências da iluminação
- [x] Iluminação 08 requer simultaneamente Módulo 04 e Módulo 06.
- [x] Dependência não recíproca: desligar a iluminação não oculta Módulo 04 nem Módulo 06.
- [x] Ocultar Módulo 06 torna a iluminação indisponível por `requirement-hidden`, assim como já ocorria com Módulo 04.
- [x] Copy comercial/UX atualizado para refletir ambos os requisitos.
- [x] Cobertura adicionada ao teste determinístico do grafo.


## B9 — Refinos visuais e navegação das visualizações
- [x] Branco base aproximado suavemente de branco puro sem alterar a textura nem a camada estrutural de seams.
- [x] Indicador decorativo sem semântica removido do contador `8 de 8`.
- [x] Corrigido o seletor CSS que transformava acidentalmente `#totalCount` em uma bolinha de 8×8 px.
- [x] Pager de visualizações explicitado semanticamente como tablist e mantido dentro do carousel.
- [x] Swipe horizontal adicionado às visualizações; gesto vertical continua reservado ao scroll da página.
- [x] Dots, clique e swipe compartilham o mesmo `detailPageByEntity` e permanecem sincronizados.
- [ ] Revisão visual do branco e do gesto de swipe no deploy-preview.


## B10 — Branco-base: alvo visual mais limpo
- [x] Clarear moderadamente o branco sem alterar as seams estruturais.
- [x] Aumentar a dominância do material branco com \`overlayOpacity=0.90\`.
- [x] Aplicar ganho de luminância restrito ao material (\`textureBrightness=1.05\`), preservando a textura.
- [ ] Revisão visual do alvo branco no preview.

## B11 — Tags dos módulos superiores
- [x] Detectar hotspots próximos ao topo pelo \`alphaBounds\`.
- [x] Posicionar a tag numérica abaixo dos módulos superiores em vez de deixá-la escapar pelo topo da cena.
- [x] Gate garante tag do Módulo 06 dentro do viewer.

## B12 — Swipe desktop completo
- [x] Pointer capture para drag de mouse continuar mesmo quando o cursor sai do stage.
- [x] \`pointermove\` diferencia drag horizontal de movimento vertical.
- [x] Suporte a gesto horizontal de trackpad via \`wheel.deltaX\`.
- [x] Clique nos dots, drag e trackpad compartilham \`detailPageByEntity\`.
- [x] Browser gate cobre drag com pointerup fora do stage e wheel horizontal.

## B13 — SVG guiado pelas seams reais
- [x] Derivar linhas internas a partir da energia das máscaras estruturais shadow/highlight dos módulos count-confirmed.
- [x] Gerar \`data/front-guide-data.js\` determinístico a partir das seams medidas em 01/05/06/07.
- [x] Preservar layout técnico confirmado do Módulo 03 como fonte prioritária.
- [x] Para layouts apenas count-confirmed, usar linhas internas derivadas dos componentes visuais em vez da heurística fixa 50/50 e 34%.
- [x] Aplicar os mesmos guides à vista frontal e à face frontal isométrica.
- [ ] Revisão visual dos quatro módulos guiados.
