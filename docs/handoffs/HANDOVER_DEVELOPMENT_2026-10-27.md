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
