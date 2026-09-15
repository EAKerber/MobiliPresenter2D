# Module 02↔03 — contrato visual da junção

Este slice corrige a propriedade geométrica e visual do encontro entre o módulo 02 (fogão) e o módulo 03 (pia).

## Invariantes

- A máscara frontal do módulo 02 cobre somente material pertencente ao próprio módulo e não invade a faixa de sobreposição 02↔03.
- A área metálica protegida do forno permanece fora da recoloração.
- `stone-02-joint-bridge` e `stone-03-joint-bridge` são seams do par: só podem ficar visíveis quando **02 e 03** estão simultaneamente visíveis.
- Com 03 oculto, a lateral direita exposta do módulo 02 continua sendo o fechamento geométrico correspondente, sem bridge residual.
- Com 02 oculto, nenhuma seam do encontro 02↔03 pode permanecer junto ao fogão substituto/pedra 03.
- Com ambos ocultos, não pode restar qualquer pixel derivado da junção.

## Matriz visual de aceitação

Os estados `02+03`, `só 02`, `só 03` e `nenhum` devem ser revisados com acabamento frontal escuro, claro e intermediário. A terminação da pedra, o encontro fogão↔bancada, a lateral revelada e a parede/fundo exposto devem permanecer geometricamente plausíveis e sem pixels flutuantes.

O browser contract em `tests/stone-browser.cjs` exige explicitamente `a && b` para os dois stone joint bridges.
