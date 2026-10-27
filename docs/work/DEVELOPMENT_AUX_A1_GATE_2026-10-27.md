# Desenvolvimento — higiene limitada A1 (27/10/2026)

Este executor atua somente sobre três refs ancestrais da development, conforme SHAs completos do manifesto `ops/development-aux-retirement-batch.json`; **não apaga as 60 branches históricas, a main, a development ou as outras auxiliares**. Os seis commits auxiliares permanecem alcançáveis por ancestralidade a partir de development.

O [plano de proveniência](DEVELOPMENT_AUX_RETIREMENT_PLAN_2026-10-27.json) permanece com `PROPOSAL_ONLY_NO_DELETE`; não alterá-lo como autorização. A ação está delimitada por um manifesto independente A1 de uma única onda, testes negativos e preflight Git/GitHub. Não reutilizar os manifestos históricos da higiene da main.

Gates: inventário remoto de todos os 69 refs esperados (60 legados + 6 auxiliares + main + development + operacional); ausência de PR em auxiliar; 12 PRs abertas com IDs esperados; nenhuma ruleset nova; branches não protegidas; ancestralidade de todos os seis SHAs em development; ref do executor exatamente igual ao SHA corrente da development no momento do push; triggers antigos das seis auxiliares retirados dos quatro workflows de CI; e SHA lease de cada ref. Antes e depois de cada exclusão ocorre readback completo. Se qualquer dado desviar, parar.

O GitHub Actions roda somente **audit** no ramo `integration/01-aux-retire-gate-20261027`. **Apply** só no `development`, condicionado ao fast-forward seguro do commit já auditado. A execução produz recibo JSON anexo ao Actions. Os próximos três ramos requerem A2 com novo manifesto, novo gate e novo recibo; nunca reexecutar A1. Esta limpeza não altera nenhum comportamento do produto nem aciona deploy deliberado.
