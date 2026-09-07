# Estado atual — 2026-09-07

## Onde estamos

Fase 3: revisão técnica R5A concluída, revisão estética final pendente.
Fase 4: preparação R6 de máscaras de pedra iniciada, sem novos acabamentos no runtime.
As fases do produto e os incrementos R0–R5A são duas numerações diferentes.
O README da raiz ainda descrevia o bootstrap R0; este documento passa a ser o ponto de retomada.

| Fase do produto | Situação observada |
| --- | --- |
| 0–2: baseline, dados e relações | Implementadas; composição inicial preservada, visibilidade e substituições testadas. |
| 3: assets estruturais | Pedras separadas, alpha e juntas 02/03 corrigidos; fogão aprovado integrado nesta branch. Revisão técnica de quatro estados concluída; fechamento estético pendente. |
| 4: acabamentos globais | Cores lisas existentes; máscaras de pedra R6 em revisão, com superfícies e objetos protegidos separados. Catálogo fotográfico ainda pendente. |
| 5: puxadores | Planejada. |
| 6: iluminação | Toggle/layer existentes; fechamento da fase ainda não declarado. |
| 7: decoração | Planejada. |
| 8: UI guiada e resumo | Interface base existente; expansão do fluxo planejada. |
| 9: exportação e endurecimento | Planejada. |

## Fogão integrado

O usuário aprovou a aparência da última geração e autorizou sua implementação.
A camada RGBA preserva os pixels, escala e posição do recorte aprovado; a máscara é um contorno manual com antialias, sem sombra de piso adicional.
Ao ocultar module-02, range-freestanding aparece automaticamente. Ao restaurá-lo, o fogão substituto desaparece.
Nenhuma geração ocorre no runtime.

- Camada: `app/assets/kitchen/substitutions/range-freestanding.png`.
- Máscara, extração e autorização: `review-assets/approved/range-freestanding/`.
- Gate: `tools/validate_approved_range.py`.
- 82.696 pixels alterados na composição, zero fora da máscara/ROI, zero alteração do golden inicial.
- O antigo donor v2 foi arquivado e seu materializador automático desativado; não deve reaparecer sobre o novo fogão.
- Aprovação de aparência humana não significa conformidade exata com a caixa 3D proposta. Os antigos PASS de perspectiva não se aplicam.
- A linha roxa representa altura projetada da traseira do tampo. Não é uma dobra para adaptar o fogão ao revestimento vertical da parede.

## Ordem de retomada

1. Revisão técnica realizada nos quatro estados, incluindo 02 e 03 ocultos juntos. Revisão estética restante: contato de piso e borda do fogão isolado.
2. Coluna inspecionada: nenhum defeito evidente reproduzido, sem alteração do background. Registro de débitos atualizado; detalhes em `r5a-structural-review.md`.
3. Fechar a Fase 3 e iniciar a Fase 4: máscaras de pedra e um conjunto pequeno de acabamentos globais, preservando caixaria branca e reset original.
4. Seguir puxadores → iluminação → decoração → UI/resumo → exportação conforme o guia.

## Git e entrega

Implementação em `work/r5a-approved-range`, sobre `work/r5a-gap-pixel-calibration` (PR #9), que depende de `work/r5a-module02-hidden` (PR #8).
A main e a publicação do site não foram alteradas. A integração está disponível na branch/PR; ainda não equivale a merge ou deploy.
O guia completo permanece em `app/docs/GUIA-IMPLEMENTACAO-2D-DATA-DRIVEN.md`.

## Preparação R6 — máscaras de pedra

Branch `work/r6-stone-surface-masks`, sobre o PR #10. Contrato, config, máscaras e overlay em `review-assets/stone-masks/`.
Recortes conservadores, sem aprovação semântica automática. Nenhuma alteração de aparência no app.
