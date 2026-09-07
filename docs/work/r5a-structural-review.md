# R5A — revisão estrutural de 2026-09-07

Revisão sobre o fogão aprovado do PR #10, sem nova geração, warp ou mudança de pixels.

## Resultado

Os três estados existentes recompõem corretamente. Acrescentado o estado com
módulos 02 e 03 ocultos simultaneamente: fogão visível, duas pedras e duas pontes
ocultas. O gate exige igualdade exata entre esse render e o fundo correspondente
composto com a camada aprovada; falha se algum componente cortar/sobrescrever o fogão.
O estado inicial continua com zero diferença contra o golden.

Inspeção visual do agente: não foi reproduzido defeito evidente da coluna; as
terminações atuais não justificam reaplicar os antigos candidates de endcap.
O fogão isolado torna mais visíveis sua borda direita e o contato com piso.
A máscara não inclui sombra de piso adicional. Isso permanece julgamento visual,
sem uma nova aprovação humana inventada nem modificação preventiva da imagem.

## Retomada da Fase 4

Após a revisão estética dos estados estruturais, começar por máscaras de superfícies
de pedra, mantendo revestimento vertical, tampo, cuba, torneira e eletrodomésticos
semanticamente separados. Não usar o alpha inteiro da camada stone como máscara:
essas camadas também contêm itens que não devem trocar de material.

Primeiro incremento: máscaras revisáveis, preset original sem overlay e testes de
pixels protegidos. Só então oferecer um acabamento fotográfico de pedra e um de
madeira; não criar um catálogo amplo antes de validar um exemplar de cada classe.
Cores lisas e reset existentes devem permanecer equivalentes ao estado atual.

## Reproduzir

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/phase3/manifest.json
python tools/render_variant_fidelity.py --manifest /tmp/phase3/manifest.json --output-dir /tmp/phase3/views
python tools/validate_approved_range.py --manifest /tmp/phase3/manifest.json --output-dir /tmp/phase3/range
```

Os workflows existentes executam os quatro casos e publicam as imagens de revisão.
Main e site publicado permanecem intactos.
