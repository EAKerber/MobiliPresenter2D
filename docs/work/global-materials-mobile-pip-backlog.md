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
