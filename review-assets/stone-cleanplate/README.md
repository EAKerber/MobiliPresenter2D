# Base limpa de pedra — candidato R6

Pedido: substituir recortes grosseiros junto a panelas/escorredor por uma base limpa,
com preservação pixel a pixel de todas as áreas que não precisam mudar.

## Resultado e limites

- Panelas removidas; reconstrução local das áreas de pedra, parede e grelhas antes ocultas.
- Escorredor removido; textura da pedra reconstruída é **REVIEW**, especialmente o padrão na antiga área do escorredor. Não confundir remoção do objeto com aprovação da textura.
- Cuba, incluindo borda metálica, e torneira: 0 pixels alterados.
- Frente amarela e rodapé azul aprovados: máscaras anteriores preservadas por hash e regiões da cena com 0 pixels alterados.
- 18.376 pixels alterados: 8.958 na região das panelas e 9.418 na do escorredor.
- Fora das máscaras de remoção: 0 pixels alterados. Round-trip source + candidate: 0 mismatch.
- Runtime e main intactos; não é uma nova composição golden nem um asset promovido.

## Método

`guides.png` foi a guia inicial da geração; `prompt.txt` registra o pedido.
A primeira máscara deixou fragmentos das tampas: seu PASS de confinamento não
significava remoção completa. A configuração final usa amostragem por linhas de
1 px do contorno superior das panelas, bandas do corpo e margem local de 3 px.
O feather atua para dentro da máscara, sem ampliar a região autorizada.

`config.json` é a autoridade final dos recortes; as máscaras PNG correspondentes
foram atualizadas após a inspeção. A guia inicial é histórica e não define o gate final.
A geração foi usada somente como donor. Os pixels de fora das máscaras foram
substituídos pelos bytes RGB originais antes da extração da camada delta.
`generated/donor-regions.png` contém apenas os pixels necessários para replay.

O resultado está em `generated/composed.png`; `generated/review.png` amplia as
regiões antes/depois. `generated/candidate.png` é delta full-canvas RGBA, sem
reposicionamento. Não é um recorte semântico independente de panelas ou escorredor.

## Próxima separação

Escolhida uma base limpa, separar em camada de pedra a região abaixo de y520 e
remover o alpha dos objetos acima dela. O fundo canônico deve reaparecer acima da
pedra; não colar parede gerada na camada só para esconder o objeto antigo.
Cuba e torneira devem ser extraídas dos pixels atuais, preservando sua borda metálica,
antes de considerar regeneração. Só recriar componentes que não puderem ser isolados
com qualidade. Escorredor, se desejado, deve voltar como acessório independente.

O halo de exclusão da cuba na máscara R6 inicial era conservador, não uma seleção
final da borda da pedra. Será refinado em nível de pixel, sem pintar o metal.

## Reproduzir

```sh
python tools/materialize_stone_cleanplate.py --donor review-assets/stone-cleanplate/generated/donor-regions.png --output-dir /tmp/stone-cleanplate
python -m unittest tests/test_stone_cleanplate.py
```

CI verifica replay, máscara e descarte de arredores gerados adulterados.
PASS técnico nunca define aprovação estética.
