# Estado atual — 2026-09-08

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

## Revisão humana das máscaras e base limpa

Frente (amarelo) e rodapé (azul) aprovados pelo usuário e preservados por hash.
Magenta com problemas nas panelas/escorredor: preparada base limpa generativa confinada, em `review-assets/stone-cleanplate/`.
Cuba e torneira permanecem originais. Candidato em REVIEW: ainda falta julgar a textura reconstruída e separar os componentes em camadas; nenhuma promoção automática.

## Componentes R6 — 2026-09-08

Separação candidata em pedra, cooktop, cuba, torneira e contexto de preservação.
Recomposição exata em quatro estados e zero diff fora das máscaras. Parede original reaparece nos locais removidos acima da pedra.
Arquivos/limites em `review-assets/stone-components/README.md`. Revisão semântica e textura ainda pendentes; não existem toggles independentes nem promoção no runtime.

## Base sob os componentes — R6 em revisão

Branch `work/r6-stone-backing`, sobre `work/r6-stone-components` (PR #13).
Reconstrução generativa confinada sob cooktop, cuba e torneira; oito combinações de presença reproduzíveis em `review-assets/stone-backing/`.
15.996 pixels alterados ao remover os três, zero fora das máscaras, zero na frente/rodapé. Recolocar todos recupera exatamente a composição candidata do PR #13 (não o golden do runtime).
A primeira máscara deixou um segmento da torneira; a inspeção visual identificou o defeito e o contorno foi corrigido antes desta entrega.
Os patches restauram pixels originais em posição fixa, incluindo contexto local: não são recortes móveis nem máscaras prontas para trocar materiais.
Próxima etapa: julgar textura e bordas da base reconstruída, refinar máscaras semânticas de material e então integrar componentes vinculados aos módulos. Main, runtime e publicação permanecem sem alterações nesta etapa.

## Contornos finos — revisão seguinte

`work/r6-object-contours`, sobre PR #14: cooktop com contorno mais detalhado e borda da cuba ampliada; torneira conservada para evitar corte de metal por erosão automática. Contraste magenta/ciano/escuro e trimaps de um pixel em `review-assets/object-contours/`.
O contraste ainda revela franjas claras: máscaras permanecem em REVIEW. Não promover para acabamentos sem revisão semântica; nenhum RGB selecionado é alterado e nenhum asset do runtime é substituído.

## Antialias — experimento após PR #15

`work/r6-object-antialias`: cobertura a 4× apenas no alpha, limitada à faixa de borda. 924 pixels de alpha alterados, zero mudanças fora da faixa nos fundos de contraste, RGB selecionado preservado. Comparação em `review-assets/object-antialias/generated/comparison.png`.
Serrilhado discretamente suavizado; franjas claras ainda visíveis. Sem promoção: próxima dívida é separar fundo contaminante de reflexo metálico, não aplicar mais blur. Os experimentos generativos específicos citados pelo usuário não foram localizados; prompts de geração confinada já versionados continuam sendo referência para eventuais novas intervenções.

## Correção generativa localizada da torneira

`work/r6-faucet-edge-donor`, sobre PR #16. Alvo e guia separados; geração incorporada apenas na faixa autorizada com alfa fixo. 462 pixels RGB alterados, zero fora da faixa ou no interior protegido.
A geração bruta alterou também o interior e o fundo, descartados pelo materializador. A saída 1122×1402 foi mapeada ao crop 128×160; erro relativo de proporção <0,04%, sem registro por feições.
Comparação em `review-assets/faucet-edge-donor/generated/comparison.png`. Melhora visual inconclusiva, franja ainda visível: candidato não selecionado para runtime. Métodos/limites e reprodução documentados no README do experimento.

## Fit da torneira regenerada integralmente

Branch `work/r6-faucet-regenerated-fit`, sobre PR #17. Candidato 35×115 em (991,443), base y558; 4.526 pixels alterados e zero fora da máscara de remoção unida ao alfa novo. Fonte candidata, não golden. Comparação nativa/3× em `review-assets/faucet-regenerated-fit/generated/fit-review.png`.
Encaixe visual plausível, menor franja bege na escala de uso, porém metal mais brilhante e detalhes diferentes. Aguarda revisão humana; runtime não alterado.

## Torneira aprovada — integrada ao runtime da branch

Usuário aprovou o fit e a diferença de cor: “Achei bom, a cor é diferente mas não parece fora do lugar”. Integração autorizada em seguida. Branch `work/r6-approved-faucet`, sobre PR #18.
Entidade `faucet-approved` acompanha `module-03`, sem controle independente. 4.526 pixels alterados nos estados com pia; zero alteração com pia oculta e zero fora da máscara aprovada. Aparência e fit originais do candidato preservados exatamente.
Golden canônico original permanece intacto. A validação de variantes compara o default com golden + camada aprovada e relata a alteração explicitamente. A camada contém fundo de remoção em posição fixa: futuros acabamentos devem substituir esse backing, não recolori-lo como se fosse metal.
Integração na branch/PR, sem merge na main ou publicação. Próximos itens R6 continuam sendo máscaras de material, revisão de cuba/cooktop e catálogo de acabamentos.
