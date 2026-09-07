# Máscaras de superfícies de pedra — R6 / Fase 4, preparação

Estado: **REVIEW**, sem instalação no runtime. O preset original permanece intacto.

`config.json` define polígonos em pixels canônicos para quatro superfícies:
revestimento vertical, tampo, borda frontal e rodapé. As exclusões protegem cooktop,
panelas, cuba, torneira e escorredor. Branco seleciona; preto protege; cinza é cobertura parcial.

As máscaras são separadas por asset proprietário: variantes expostas e pontes dos
módulos 02/03. Uma ponte só deve receber acabamento quando a própria ponte estiver
visível. Máscaras vazias para superfícies inexistentes numa ponte são intencionais.
Não compor permanentemente as máscaras das pontes com as variantes.

O gerador limita cada máscara ao alpha do proprietário, aplica exclusões rígidas
após antialias e elimina sobreposição entre superfícies do mesmo proprietário.
Os hashes de origem impedem reutilização silenciosa após mudança das camadas.

## Revisão

Veja `generated/review.png`: original, overlay de seleção e rodapé.
Magenta = revestimento vertical; ciano = tampo; amarelo = borda frontal; azul = rodapé.
As cores são diagnóstico de seleção, não propostas de acabamento.

As exclusões são deliberadamente conservadoras: também deixam pedra sem seleção
junto aos objetos e atrás das grades do escorredor. Não representam segmentação
final nem cobertura completa. Não ativar um acabamento com essas lacunas sem refiná-las.
Frestas e contornos devem ser revisados no canvas 1536×1024.

Os testes verificam landmarks independentes em objetos protegidos, seleção de
pontos reais de pedra, reprodutibilidade, alpha do proprietário e ausência de
sobreposição. PASS técnico não aprova o recorte semântico inteiro.

## Reproduzir

```sh
python tools/build_stone_surface_masks.py --output-dir review-assets/stone-masks/generated
python -m unittest tests/test_stone_surface_masks.py
```

Próximo passo: refinar os limites junto aos objetos, produzir a revisão em cada
estado de visibilidade e somente depois integrar um primeiro acabamento.
