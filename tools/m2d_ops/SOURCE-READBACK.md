# Readback de design — 26/11/2026, aproximadamente 15h20 BRT

Consulta somente leitura pelo conector GitHub, não clone local. Os SHAs abaixo são os observados naquela consulta e não devem ser tratados como estado atual depois dela.

- Produto development: `3f45567c81a68ad967340bae6d914e126830b541`.
- Produto main: `0db1d021f6917cd7a030debd0ab92c04ca28e39e`.
- DS main: `8686df1cf13f84f18f755cb7de2067fda4f7c66d`.
- Registro `PlanV09OperationalRegister/1`: 125 entradas; 13 done, 24 partial, 88 unreviewed. Estados registrados, não percentual arquitetural.
- Anexo A do plano: 125 IDs distintos, correspondência exata com o registro. Leitura exploratória equivalente à heurística de headings/dependências da CLI encontrou 115 IDs com cabeçalhos reconhecíveis e 107 com menções explícitas de dependência; isso não é o grafo integral. A pin do plano registrada era `59bb530b14172eb9772b9f89bb62272173f4381c`.

## Fontes primárias consultadas

- https://github.com/EAKerber/MobiliPresenter2D/blob/3f45567c81a68ad967340bae6d914e126830b541/tools/branch_hygiene_observe.py
- https://github.com/EAKerber/MobiliPresenter2D/blob/3f45567c81a68ad967340bae6d914e126830b541/tools/branch_hygiene_plan.py
- https://github.com/EAKerber/MobiliPresenter2D/blob/3f45567c81a68ad967340bae6d914e126830b541/tools/branch_hygiene_merged_pr_cleanup.py
- https://github.com/EAKerber/MobiliPresenter2D/blob/3f45567c81a68ad967340bae6d914e126830b541/tools/branch_hygiene_consumption.py
- https://github.com/EAKerber/MobiliPresenter2D/blob/3f45567c81a68ad967340bae6d914e126830b541/tools/ci/test-impact-bundles.json
- https://github.com/EAKerber/MobiliPresenter2D/blob/3f45567c81a68ad967340bae6d914e126830b541/ops/development-main-authority-policy.json
- https://github.com/EAKerber/MobiliPresenter2D/blob/3f45567c81a68ad967340bae6d914e126830b541/docs/architecture/plan-v0.9-execution-register.json
- https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/8686df1cf13f84f18f755cb7de2067fda4f7c66d/docs/architecture/MOBILIPRESENTER2D_PLANO_DIRETOR_CONSOLIDADO_v0.9.md

Limite: `git ls-remote` no container falhou por resolução DNS. Não foi possível executar o protótipo contra clones reais. A demonstração e os testes são locais, com fixtures explicitamente sintéticas. Nenhuma alteração nos repositórios, branches ou workflows reais durante aquela inspeção.
