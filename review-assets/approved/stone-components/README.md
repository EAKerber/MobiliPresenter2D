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

Integração publicada na `main` pelo PR #25, commit `9ec9cb052c43cccf2ffd5cbb8c1b2c947ef2bc27`, em <https://mobilipresenter2d.netlify.app/>. A aparência neutra está aprovada. A autorização posterior de publicação não reescreve retroativamente o escopo da aprovação do PR23; `color-review.png` continua registrando original, grafite, claro e uma cor livre para avaliação dos tons.

Após a publicação, foi encontrado um defeito independente na máscara histórica de acabamento do módulo 02, que cobria a cena por usar PNG grayscale sem alfa. O hotfix em revisão corrige a representação para RGBA e preserva as pontes de terminação nas configurações em que apenas um dos módulos 02/03 permanece visível.

Validação de interação concluída em Chromium no GitHub Actions: cores, reset visual exato, independência das frentes, quatro estados de visibilidade e ausência de overflow horizontal em 390×844 passaram. Teste versionado em `tests/stone-browser.cjs`, workflow `Stone browser`; capturas ficam no artefato do CI. A cena permanece visível durante o ajuste: controles com rolagem própria no desktop, visualizador fixado durante a rolagem no celular. A aprovação humana das novas cores permanece pendente.
