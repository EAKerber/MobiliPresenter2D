# Componentes de pedra — R6, revisão

Separação determinística da base limpa do PR #12. Arquivos RGBA full-canvas,
sem reposicionamento ou escala no compositor.

## Camadas

- `stone-02-material`: pedra visível do módulo 02.
- `stone-02-cooktop`: pixels visíveis do cooktop após remoção das panelas.
- `stone-03-material`: pedra visível do módulo 03.
- `stone-03-sink`: cuba e borda visível.
- `stone-03-faucet`: torneira.
- `stone-02-context` e `stone-03-context`: pixels restantes necessários para preservar a composição, incluindo bordas e contexto fotográfico.

As pontes de junta existentes permanecem no fluxo original, com sua própria
visibilidade. `ownership.json` vincula cada parte ao respectivo host.

A atribuição de cada pixel é exclusiva. Ao recompor sobre preto e branco, e
nos quatro estados reais do runtime, o resultado coincide exatamente com a
camada limpa antes da separação. Isso evita dupla aplicação de alpha.

## Parede e confinamento

Acima de y520, as regiões removidas deixam de ter alpha na camada proprietária:
a parede canônica reaparece. Não se incorporam os pixels de parede gerados pelo
donor. Foram retirados 2.837 pixels de alpha no módulo 02 e 5.411 no módulo 03.
Abaixo de y520 usa-se a base limpa candidata, limitada às máscaras já versionadas.

A composição candidata muda 17.749 pixels no estado inicial; 9.190 com módulo 02
oculto; 8.559 com módulo 03 oculto; zero com ambos ocultos. Zero mudança fora das
máscaras autorizadas em todos os casos. Esses números diferem do PR #12 porque
a parede original reaparece no lugar da parede gerada.

## Limites

REVIEW: a textura reconstruída na antiga área do escorredor ainda precisa de
julgamento visual. A divisão recompõe pixels exatamente, mas não prova que cada
contorno semântico esteja finalizado. O preview isolado permite inspecionar
franjas de contexto que ainda acompanham os objetos.

As superfícies escondidas sob cuba, torneira e cooktop NÃO foram inventadas.
Desativar um componente isolado deixaria uma lacuna: não há toggle independente
habilitado. Para troca de material, usar máscaras revisadas; não presumir que o
alpha inteiro de `material` é uma máscara de acabamento aprovada.

`context` é uma categoria de preservação, não uma solução definitiva para todos
os resíduos de contexto nas camadas antigas. Runtime, golden e main intactos.

## Reproduzir

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/components-manifest.json
python tools/split_stone_components.py --manifest /tmp/components-manifest.json --output-dir /tmp/components
```

Revisar `generated/objects-review.png` e `generated/review.png`.
Próximo incremento: finalizar os contornos junto à pedra e preparar o fundo
necessário para componentes realmente substituíveis; só então ligar acabamentos.
