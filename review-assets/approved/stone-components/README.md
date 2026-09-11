# Componentes aprovados e cor da pedra — R6

A aprovação literal de 2026-09-11 está em `approval.json`, vinculada aos hashes da revisão do PR23 e aos dois patches instalados. A torneira aprovada permanece intacta. Os patches acompanham module-02 e module-03; aparecem após as juntas para conservar também os pixels do cooktop sobre a junção.

A cor atua na bancada, revestimento, frente e rodapé, com grafite, claro, areia e seletor livre. A textura existente permanece; não se trata de um catálogo fotográfico de materiais. O reset da pedra remove a camada de cor e recupera exatamente a composição aprovada, independentemente da cor das frentes.

`source-manifest.json` fixa a fonte anterior à integração para repetir os experimentos históricos. O manifesto derivado do runtime atual continua sendo validado separadamente. O golden original não muda. Não atualizar a fonte histórica para acomodar deriva.

## Reprodução

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/stone-runtime.json
python tools/validate_approved_stone.py --manifest /tmp/stone-runtime.json --output-dir /tmp/stone-validation
```

O gate reconstrói o PR23, compara os patches e os inputs incorporados por pixels decodificados (independente da compressão PNG), verifica a composição atual em quatro estados, executa o algoritmo JavaScript real em doze combinações de cor/visibilidade e exige zero alteração fora da pedra e no interior opaco dos objetos. Reset deve produzir uma camada completamente vazia. Inputs incorporados permitem abrir index.html diretamente sem CORS em canvas.

As máscaras de frente e rodapé são reutilizadas sem reautoria. Tampo e revestimento deixam de excluir retângulos dos objetos antigos; o alfa dos objetos aprovados protege sua contribuição visual. Pixels semitransparentes mudam apenas pela contribuição do fundo. O acabamento usa luminância do fundo para conservar a textura. As bordas externas das máscaras conservadoras ainda podem manter uma linha clara; revisar a imagem de cor antes de publicar.

## Estado da entrega

Integração na branch, sem merge ou deploy. A aparência neutra está aprovada. As cores novas são uma implementação para revisão, não abrangidas retroativamente pela aprovação do PR23. `color-review.png` mostra original, grafite, claro e uma cor livre.

Validação visual da interface no navegador pendente: o browser remoto bloqueou a prévia local, e o download do Chromium local expirou. Sintaxe, empacotamento, núcleo, fidelidade e renderização determinística foram verificados.
