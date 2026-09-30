# Extração por diferença de pixels — v3

Este checkpoint valida a técnica proposta usando as duas capturas Promob recebidas em 2026-09-29. Ambas têm 1920 × 1128 px e o mesmo enquadramento. `promob-with-side.png` é a captura com a face direita do módulo 01; `promob-without-side.png` é a captura sem essa face.

`tools/extract-promob-side-difference.py` calcula a diferença RGB sem redimensionar ou registrar as imagens. Para esta extração, a região foi limitada a x=377, y=321, largura=22, altura=196. O resultado em `module-01/side-extracted.png` contém somente pixels que mudaram nessa região; `difference-mask.png` e `extraction.json` registram a máscara e os hashes das fontes.

A extração confirma a geometria da lateral do módulo 01, mas não é uma textura final: as faces coloridas do Promob funcionam como máscara. O asset existente do módulo 01 já contém uma face lateral na cena do site, então este resultado fica como evidência e teste reproduzível, sem substituir o asset nem alterar a composição. A posição da cena do site segue como base para qualquer aplicação.

As faces dos módulos 02, 05, 07 e do fogão substituto continuam presentes nas duas capturas; a mudança nelas é de tom, não de presença/ausência. Portanto, este par não fornece máscaras confiáveis dessas peças. O módulo 05 permanece aprovado na implementação atual. Para extrair os módulos 02 e 07, e a lateral metálica do fogão substituto, são necessários pares próprios em que apenas a face desejada apareça ou desapareça.
