# Laterais expostas v2 — revisão visual

Esta revisão corrige os pontos indicados pelo usuário para a cena do site. O canvas de 1536 × 1024 e os limites reais dos módulos são a autoridade geométrica; as capturas do Promob ajudam a identificar o tipo de face, mas não definem o ângulo ou a dimensão final.

## Alterações

- Módulo 02: lateral direita refeita como uma única face estreita, presa ao corpo do armário entre y=590 e y=856. A área acima da bancada e qualquer fragmento solto foram removidos. A lateral continua subordinada à visibilidade do módulo 02 e à oclusão pelo módulo 03.
- Módulo 05: asset preservado byte a byte.
- Módulo 07: lateral preservada com corte reduzido na quina inferior esquerda para eliminar a ponta excedente.
- Fogão substituto: nova lateral de aço escovado, vinculada ao fogão convencional (módulo 02 oculto). Ela fica depois do módulo vizinho e antes da frente do fogão na ordem de desenho; portanto não aparece como módulo selecionável e desaparece quando o fogão substituto desaparece.
- Vidro: todas as camadas agora aplicam o `zIndex` declarado na cena. O vidro deixa de receber uma prioridade CSS isolada e fica atrás dos módulos, mantendo o alcance até o fim da parede.

## Fontes e reprodução

`prompts.json` registra os prompts, nomes e hashes das saídas originais do ImageGen. Os doadores RGBA recortados estão em WebP sem perdas para reduzir o tamanho do repositório. `tools/build-corrected-exposed-sides.py` materializa os PNGs finais no canvas da aplicação e limita cada textura ao polígono definido para a cena. O mesmo script corta a quina do módulo 07 sem regenerar a lateral 05.

O manifesto testa cinco variações. Os três crops WebP mostram a lateral 02, a lateral 07 com módulo 04 oculto e o fogão metálico com módulo 02 oculto. As imagens de cena podem ser regeneradas pelo manifesto; os gates de pixels continuam usando PNGs sem compressão com perdas.

## Limites da evidência

A cena do site governa o encaixe. A profundidade das faces ocultas foi inferida dos limites raster e das referências visuais, não de uma câmera 3D calibrada. As faces ficam disponíveis para revisão visual antes de qualquer alegação de geometria certificada.
