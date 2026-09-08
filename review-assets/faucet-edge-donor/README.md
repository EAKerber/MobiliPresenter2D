# Torneira — donor generativo restrito à borda

REVIEW. Vantagem visual inconclusiva; não selecionado para runtime.

Implementa um teste generativo localizado usando a distinção alvo/referência recuperada no roteiro standalone B5. Não reproduz nem afirma sucesso do experimento standalone: os resultados daquele chat não foram recuperados.

- `target.png`: único alvo, recorte da torneira do PR #16 ampliado 8× sobre cinza.
- `guide.png`: somente guia, magenta na faixa de borda autorizada.
- `prompt.txt`: instrução exata enviada ao image_gen integrado.
- `generation-receipt.json`: identidade dos inputs, donor bruto e mapeamento.
- `donor-crop.png`: donor reduzido para 128×160, suficiente para reprodução sem nova geração.
- `generated/faucet.png`: candidato RGBA com alfa original fixo.
- `generated/comparison.png`: original acima, borda gerada abaixo; fundos magenta, escuro e claro.

A geração bruta mudou interior e fundo apesar do prompt. Essas mudanças não entram na composição. O materializador copia apenas RGB no cruzamento da faixa autorizada com o suporte do alfa original. Interior protegido e alfa não mudam. 462 pixels alterados, zero fora da borda em três fundos e na prévia da cena.

A saída veio em 1122×1402, em vez de 1024×1280. O erro relativo de proporção é ~0,036%; o mapeamento é do canvas inteiro ao crop, por BOX. Não há realinhamento de feições, warp ou aprovação geométrica implícita. Assim, eventuais desvios locais do donor continuam sendo limitação editorial.

A comparação ainda mostra franja clara, e a cor do fundo cinza pode estar misturada ao RGB do donor. A geração restrita não prova separação física entre metal/reflexo e fundo. O gate técnico verifica confinamento e não aprova estética. Os patches de recomposição exata anteriores permanecem intactos.

```sh
python tools/prepare_faucet_edge_inputs.py
python tools/materialize_faucet_edge.py --donor review-assets/faucet-edge-donor/donor-crop.png --output-dir /tmp/faucet-edge-donor
python -m unittest tests/test_faucet_edge.py
```

O CI inclui o teste com interior/fundo do donor adulterados em verde: o candidato deve permanecer idêntico. A cena completa é reconstruída no artifact da CI, evitando versionar outra cópia de todo o frame. Main, assets do runtime e publicação não são modificados.
