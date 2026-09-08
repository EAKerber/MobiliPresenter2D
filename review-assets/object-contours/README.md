# Contornos de objetos — REVIEW

Esta rodada refina o polígono do cooktop e amplia a seleção da borda da cuba. A torneira permanece com o contorno anterior: a faixa clara mistura borda metálica, antialias e fundo, e uma erosão uniforme pode apagar metal.

`generated/contrast-review.png` mostra os recortes com três fundos de contraste. Ainda existem franjas claras e detalhes que precisam de revisão semântica; o script não emite PASS editorial.

As máscaras `*-mask.png` têm branco para inclusão e preto para exclusão. Os `*-trimap.png` distinguem exterior (0), uma faixa de um pixel para inspeção (128) e interior do polígono (255). Interior não significa verdade semântica comprovada. RGB selecionado é copiado exatamente da referência do PR #14; somente alpha é autorado. Pixels invisíveis são zerados.

Reproduzir: `python tools/review_object_contours.py --output-dir /tmp/object-contours`.

O cooktop perde 762 pixels da seleção anterior e ganha 11; a cuba ganha 298. Esses números medem diferença de seleção, não classificam automaticamente cada pixel como correto. Os patches de presença do PR #14 e as superfícies amarela/azul ficam intactos. Nenhuma alteração de runtime ou promoção de material.
