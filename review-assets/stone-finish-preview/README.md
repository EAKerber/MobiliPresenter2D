# Prévia de acabamento sob a torneira — REVIEW

Desmonta a camada aprovada em backing e RGBA da torneira, aplica a cor de diagnóstico à pedra e recompõe o metal por cima. Sem cor, recupera exatamente o runtime atual nos quatro estados. Com cor, preserva o RGB da região opaca da torneira e todos os pixels fora do suporte das máscaras de material. O RGBA aprovado nunca é alterado; pixels semitransparentes naturalmente refletem o novo fundo na composição.

Dois tons planos (grafite e claro) são testes de contraste, não materiais finais ou presets comerciais. A faixa de backing y520..574 pode ser recolorida; a parede acima permanece protegida. Frente e rodapé usam as máscaras já aprovadas, sem reautorar seus contornos.

A inspeção mostra que o backing da torneira já acompanha a cor, mas as exclusões conservadoras ao redor da cuba, cooktop/panelas e escorredor deixam ilhas e linhas da pedra antiga. Esses defeitos são explícitos em `generated/review.png`; o resultado não é promovido ao app. A versão neutra é exata, a máscara semântica de acabamento ainda está incompleta.

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/finish-manifest.json
python tools/preview_stone_finishes.py --manifest /tmp/finish-manifest.json --output-dir /tmp/stone-finish-preview
```

O CI repete oito combinações (quatro estados × duas cores). Quando os dois módulos estão ocultos, não há alteração. Não há geração nova, merge ou deploy. Próximo trabalho: fechar as máscaras ao redor dos objetos, usando as bases limpas já preparadas onde adequado e revisão visual para não pintar metal.
