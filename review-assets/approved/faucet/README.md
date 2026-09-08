# Torneira aprovada — runtime

Aprovação humana literal e hashes em `approval.json`. Integra exatamente o fit do PR #18, incluindo a diferença de cor aceita. A entidade `faucet-approved` usa `module-03` como host e não é controlável separadamente. Ao ocultar/restaurar a pia, a camada acompanha o módulo.

A camada combina o backing inferido apenas na máscara de remoção com a torneira RGBA aprovada. O restante vem dos assets originais do runtime; não promove as remoções de panelas/escorredor nem outros candidatos R6. Esse patch de posição fixa será uma limitação a resolver ao implementar novos materiais da pedra.

O golden original não é sobrescrito. `render_variant_fidelity.py` exige exatamente golden + overlay com hashes aprovados e relata os 4.526 pixels de mudança autorizada. `validate_approved_faucet.py` verifica o alfa, a equivalência ao fit aprovado, a ordem real da composição, a visibilidade vinculada e zero alteração fora da máscara em quatro estados.

As reconstruções históricas do PR #14 e o hash do clean frame do fogão excluem explicitamente a nova entidade para manter suas fontes pinadas; a composição atual é verificada separadamente pelo novo gate. Não há relaxamento de hashes antigos nem atualização do golden para esconder diferenças.

Revisão dos quatro estados em `generated/review.png`; CI reproduz o gate. Integração em branch de trabalho, sem merge/deploy.
