# Fit da torneira regenerada — REVIEW

Teste da regeneração completa autorizada pelo usuário. Camada candidata de 35×115 pixels em (991,443), base em y558, próxima à altura e apoio anteriores. Transparência original preservada no crop, redução com alfa pré-multiplicado e Lanczos; sem warp.

O donor bruto tem ruído de alfa distante do objeto. O crop usa bbox de alfa≥128 mais oito pixels de margem e conserva todos os valores de alfa dentro dele. Não há remoção por cor nem erosão da borda. Dimensões, hash e regra de recorte ficam no receipt. `donor.png` é o recorte utilizado, preservado para reprodução.

A composição usa o fundo inferido do PR #14 somente dentro da máscara de remoção da torneira; cooktop, cuba e restante da cena vêm da fonte candidata anterior. A região autorizada é a união dessa máscara com o suporte da nova camada. São 4.526 pixels alterados, zero fora da união e zero na frente/rodapé. Isso não é comparação com o golden do runtime.

`generated/fit-review.png` mostra original e candidato na escala 1:1 e ampliados 3×; `generated/contrast.png` mostra o recorte em três fundos. A camada em `generated/faucet.png` é full-frame RGBA. A cena inteira é reconstruída no artifact da CI.

Leitura visual: encaixe plausível e menos franja bege na escala de uso; acabamento mais brilhante e desenho interno diferentes. Ainda existem detalhes de borda visíveis quando ampliados. REVIEW, sem aprovação humana, calibração física da câmera ou promoção para runtime.

```sh
python tools/fit_regenerated_faucet.py --output-dir /tmp/faucet-regenerated-fit
```

Main e app permanecem intactos. Este teste não substitui os candidatos/experimentos anteriores.
