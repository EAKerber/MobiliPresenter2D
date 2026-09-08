# R6 — base reconstruída sob objetos

REVIEW, sem instalação no runtime. O experimento remove cooktop, cuba e torneira da composição candidata do PR #13 e restaura seus pixels originais em oito combinações.

`source.png` é a composição exata de partida. `guide.png` e `prompt.txt` são as entradas da geração; a guia inicial não incorpora a correção posterior da máscara da haste. `config.json` contém os contornos finais de composição, com prioridade torneira → cuba → cooktop nas interseções. Branco nas máscaras permite alteração. Feather somente para dentro, nenhum redimensionamento ou warp.

A geração fornece apenas pixels dentro dos contornos. O restante vem diretamente da referência. `generated/donor-regions.png` retém os pixels necessários para repetir o experimento sem nova geração. A frente amarela e o rodapé azul continuam protegidos; a banda y≥575 não pode entrar nas máscaras.

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/backing-manifest.json
python tools/build_stone_backing.py --manifest /tmp/backing-manifest.json --donor review-assets/stone-backing/generated/donor-regions.png --output-dir /tmp/stone-backing
python -m unittest tests/test_stone_backing.py
```

A comparação `generated/review.png` mostra oito estados. `generated/gate.json` registra 15.996 pixels alterados com todos removidos, zero fora das máscaras e recomposição exata com todos presentes. A referência é a candidata do PR #13, não uma atualização do golden original.

Os arquivos `*-present.png` são patches de presença em posição fixa: incluem contexto original no suporte alterado e não servem para mover objetos ou recolorir a pedra independentemente. O fundo oculto foi inferido, e a fidelidade estética ainda precisa de revisão humana. A primeira máscara da torneira deixou uma haste residual; o contorno final cobre esse trecho. Nenhum PASS numérico aprova automaticamente textura, semântica ou geometria.

A integração futura precisa vincular cada backing ao módulo correto e às variantes expostas, depois de refinar as máscaras de material. Não há novos toggles no app nesta etapa.
