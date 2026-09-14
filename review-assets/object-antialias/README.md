# Antialias localizado — REVIEW

Experimento solicitado pelo usuário após o PR #15. Compara máscara dura com cobertura de polígonos a 4×, reduzida por média BOX. O núcleo opaco fica fixo; toda mudança de alpha é limitada à vizinhança de um pixel do contorno. Não há blur do RGB, redimensionamento do objeto ou warp.

Reproduzir:

```sh
python tools/review_object_antialias.py --output-dir /tmp/object-antialias
```

`generated/comparison.png`: hard e AA em magenta, depois hard e AA em fundo escuro. A ampliação usa nearest-neighbor para mostrar os pixels produzidos, sem suavização adicional do visualizador.

O alfa muda em 477 pixels do cooktop, 176 da cuba e 271 da torneira (924 ao todo). As duas composições de contraste têm zero mudanças fora da faixa. RGB selecionado permanece original, RGB invisível é zerado. Os PNGs usam alpha não pré-multiplicado.

A inspeção indica redução discreta do serrilhado, mas a franja clara persiste. Cobertura geométrica não estima a opacidade física original, nem separa a cor do objeto da cor do fundo já misturada em um pixel. Metal/reflexo legítimo e contaminação não devem ser removidos indiscriminadamente. Esta variante não substitui os patches de recomposição exata do PR #14 e não promete round-trip no fundo original.

## Experimentos anteriores e aplicação

A recuperação de contexto localizou `MobiliPresenter2D-revisao-2026-09-05.md`, que relata limitações de recortes opacos com contexto e o falso negativo de bbox em diferenças RGBA. Por isso, este script verifica RGB por canal e alpha separadamente, e não usa round-trip como aprovação semântica. A busca não localizou os experimentos generativos específicos mencionados pelo usuário; não lhes atribuímos parâmetros ou resultados.

Os prompts efetivamente versionados em `review-assets/stone-backing/prompt.txt` e `review-assets/stone-cleanplate/refinement-prompt.txt` documentam geração guiada por região e composição confinada. Esse método já foi usado para as bases ocultas. Nesta rodada não houve geração: o teste isola o efeito do antialias. Uma eventual correção generativa de borda precisa da mesma limitação de área e de referência de forma/material, preservando o interior e o restante da cena.

Próximo problema: separar cor de fundo de reflexo metálico na faixa de borda. Requer revisão semântica localizada; não se resolve automaticamente promovendo este alpha.
