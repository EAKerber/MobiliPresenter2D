# Handover corrente — estratégia de desenvolvimento por blocos (27/10/2026)

## Objetivo homologado no chat

O produto `EAKerber/MobiliPresenter2D` deve convergir preferencialmente a **duas branches permanentes**, `main` (estável/publicada) e `development` (integração não estável), usando `integration/<bloco>` auxiliares de vida curta para trabalho próximo e rebaselined em `development`. Não mesclar 60 branches indiscriminadamente na main.

## Identidade das evidências

- main observada no início: `221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; 61 refs inicialmente, 60 legadas, 12 PRs abertas.
- Matriz consolidada [`docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json`](../work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json), índice humano [`docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.md`](../work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.md) e cinco shards de compare com SHAs completos.
- `development` e auxiliar inicial `integration/00-inventory-governance-20261027` nasceram idênticas à main. Após integrar a auxiliar na development, confirmar o SHA vivo antes de prosseguir.
- Netlify produção `mobilipresenter2d`: READY em commit `221b54b2a41ecc8c338d1bf2cf67280cf165ce95` na verificação; branch deploy settings não são disponibilizadas pelo conector. Nenhum build/preview deve ser provocado sem necessidade e sem garantir isolamento.

## Prioridades e bloqueios

1. Tratar CI-BASELINE-01 e PR #238 como primeiro cluster técnico e extrair só testes válidos de branches antigas; distinguir CI isolada de runtime autenticado.
2. Páginas/headers e tokens VIS-002 sob autoridade do DS (NAV-004/NAV-005), com A11y; evitar aplicar variantes divergentes simultaneamente.
3. CP-PUBLIC sob D03=A: contrato V5 público e protegido, dados brutos privados, 401/403/503/fail-closed. PRs antigas ficam HOLD até mapa campo-destino.
4. Viewer/preços/medidas e Config sob schema data-driven, com estado global de publicação.
5. Renderização e lado exposto/vidro com evidências de fidelidade antes de considerar #34 obsoleta.
6. Higiene e poda somente após retenção DAG histórica protegida e consolidação de proveniência. Script P12/R10 antigo não é autorização para replay.

**Documentação é gate preparatório, não afirmação de absorção funcional.** Manter a `main` intacta. Não criar todas as auxiliares de imediato; abrir apenas o bloco em execução. Este handover não autoriza exclusão de refs. Testes D01–D04 aplicam-se a cada integração.


## Gate concluído — primeiro bloco técnico absorvido em development (27/10/2026)

- **Auxiliar:** `integration/00-migration-inspector-20261027@89d5343f7e627ea5f8bebccb4ecb78c4eb962bfb`, derivada da `development` documentada.
- **Fontes históricas preservadas literalmente:** `tools/migration-inspector.mjs` blob `0d862e435898daa8443ada12f7d093c5ab6232bc` e `tests/migration-inspector.test.mjs` blob `abe491f840c82b12e93c578442a9c548f47f8a5a`, provenientes de `tooling/migration-inspector-v0-20261023@2b00351acc1d1369116d8eeb546146a6b363072e`. O restante da branch de origem **não foi fundido**.
- **CI na auxiliar:** [Actions #40522017182](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40522017182), PASS; 4/4 testes, relatório determinístico, 8 rotas, 58 assets diretos, 29 compartilhados, 5 pares de classes lexicais candidatos, zero referências estáticas faltantes.
- **Integração:** fast-forward SHA-exato da auxiliar para `development@89d5343f7e627ea5f8bebccb4ecb78c4eb962bfb`; diff da auxiliar = quatro arquivos (ferramenta, teste, workflow scoped e recibo), sem runtime. [Actions development #40522167157](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40522167157) PASS.
- **Produção intacta:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` e Netlify production deploy `6adfce5d891219db4d8ed416` READY, mesmo commit, sem deploy manual nesta rodada. Nenhuma exclusão e as 12 PRs permanecem abertas.
- **Próximo bloco recomendado:** `01-ci-auth`, começando pelo diagnóstico seguro #238/issue #232, extraindo casos úteis (WebKit 1050/1051 e fronteira auth) sem mesclar fluxos legados. Outra auxiliar deve partir do HEAD novo da development e passar gates negativos de segurança. Reavaliar suas dependências antes de adotar o código.
- **Auxiliares de inventário e inspector** ainda existem como refs temporárias; seus commits foram incorporados à `development`. Excluí-las somente com gate de ref ancestral/lease e readback, nunca para atingir contagem arbitrária.

A `development` pode avançar independentemente da `main` sem herdar estabilidade ou publicação. Nenhuma automação nesta etapa promove branches antigas, nem o Inspector autoriza redução de testes de forma negativa.
