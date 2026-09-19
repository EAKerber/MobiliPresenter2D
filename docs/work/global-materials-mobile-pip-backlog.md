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
