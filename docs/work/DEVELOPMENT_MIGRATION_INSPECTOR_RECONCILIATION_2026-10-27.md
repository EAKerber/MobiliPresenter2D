# Bloco 12 — Migration Inspector V0, reconciliação com preferência por implementação e intenção recentes

Data: 27/10/2026. **Source SHA pinado:** `tooling/migration-inspector-v0-20261023@2b00351acc1d1369116d8eeb546146a6b363072e`.

## Intenção vigente e cronologia

O propósito do Inspector é coletar **evidência estática conservadora e reproduzível** sobre consumidores diretos de scripts/CSS/HTML. Não é autoridade sobre relações dinâmicas, autoria do Design System, compatibilidade de autenticação, ausência de impacto ou dispensa de testes. A intenção declarada mais recente do usuário (27/10) manda **preferir a implementação mais recente para a mesma função e considerar a intenção expressa mais recente**; nenhuma decisão nova autoriza o Inspector a homologar automaticamente o Design System ou desativar gates.

- Código original: commits `107bf34f`, `77fe8794` e `05100f14` de **23/10/2026**, incluindo correções de `<base href>` e distinção entre bundles gerados e arquivos de origem ausentes. Importação exata na `development` no commit `89d5343f7e627ea5f8bebccb4ecb78c4eb962bfb` de **27/10/2026**, sem modificar os bytes da ferramenta ou testes.
- `tools/migration-inspector.mjs` é **exatamente** o blob histórico `0d862e435898daa8443ada12f7d093c5ab6232bc` na development.
- `tests/migration-inspector.test.mjs` é **exatamente** o blob histórico `abe491f840c82b12e93c578442a9c548f47f8a5a` na development.
- O workflow atual `.github/workflows/development-migration-inspector.yml` integra a versão de desenvolvimento e usa permissões `contents:read`, fixture/compilação e relatório determinístico de aplicação. O workflow antigo `.github/workflows/migration-inspector-v0.yml` tinha um *passo adicional útil*: imprimir **diagnósticos positivos por rota**, que não estavam presentes no atual. Esse passo foi portado seletivamente e também torna explícita a cobertura `NOT_PROVEN`. Isto **não** muda o código da ferramenta e **não** converte diagnósticos em verdades negativas.
- `docs/handoffs/MIGRATION_INSPECTOR_V0_2026-10-23.md` contém os limites científicos/metodológicos e a explicação dos **39 falsos alertas iniciais** (33 relativos a `base href`, seis a bundles esperados). Esta documentação era um arquivo **exclusivo da branch histórica**; foi reintroduzida com **exatamente os bytes originais**, blob `4f7cc27e51ee0840c6df90ea335a17cc770b8266`. Seu texto é uma fotografia **histórica**, não afirmação de status presente nem nova homologação.

## Matriz de destinação

| Item de origem | Situação | Decisão |
| --- | --- | --- |
| `tools/migration-inspector.mjs` | SHA de blob igual no destino | **KEEP_CURRENT** |
| `tests/migration-inspector.test.mjs` | SHA de blob igual no destino | **KEEP_CURRENT** |
| `.github/workflows/migration-inspector-v0.yml` | Workflow antigo preso à branch histórica; contrato já existe em development | **EXTRACT_ONLY** diagnóstico por rota, preservando gate atual sem execução Netlify |
| `docs/handoffs/MIGRATION_INSPECTOR_V0_2026-10-23.md` | Exclusivo, contém decisões de cautela e histórico de false positives | **RESTORE_VERBATIM** em development |

## Evidências e limites de retirada

O gate da `development` foi ampliado para validar **todos os três blobs SHA exatos** diretamente contra o commit histórico, preservar testes fixtures, saída determinística e validar cobertura `NOT_PROVEN`. Também emite os diagnósticos por rota sem os interpretar como erros nem permitir dispensar gate. Não precisa conexão privilegiada, banco, deploy ou navegador autenticado.

A retirada da branch de origem **não pode** ocorrer até o gate no HEAD da development comprovar o contrato e o executor de higiene criar e ler a tag de proteção `archive/m2d/migration-inspector-2b00351a` apontando para `2b00351acc1d1369116d8eeb546146a6b363072e`; é necessário verificar ainda 12 PRs intactas, proteção de branch, rulesets, SHA leases e lista completa de refs. A auxiliar `integration/12-migration-inspector-consolidation-20261027` deve ser integrada por fast-forward com lease e retirada se for ancestral de development; não pertence ao inventário original de 60 refs. Nenhuma exclusão deve ocorrer por semelhança de nome.

**Status neste documento, antes do gate:** seleção e integração documental preparadas; nenhuma aposentadoria ainda autorizada. Registrar PASS/FAIL, run IDs, ledger e contagens aqui e no handover antes de declarar encerramento.


## Gate final, incorporação e retirada comprovadas — onda F

- [Actions #40611491832](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40611491832): **PASS na auxiliar** para igualdade dos três blobs de origem, cobertura, testes e relatório determinístico. A auxiliar foi absorvida por **fast-forward com lease** `development@13330682daa3a12a18100c3fc187c2137e97604e -> 8f5de5ad86b340b23b3df15222cf7787650d64b8`, com quatro caminhos de mudança (workflow atual, relatório de reconciliação, handover canônico e cópia exata do handover histórico). **Nenhuma mudança no código do Inspector, nos seus testes ou na aplicação.**
- [Actions #40611669102](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40611669102): **PASS na própria development**, verificação dos SHAs históricos e do handover idêntico, fixtures, saída determinística, cobertura negativa `NOT_PROVEN` e relatórios de diagnóstico por rota como pistas, não provas de ausência de impacto.
- [Actions #40611772782](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40611772782): **AUDIT PASS / APPLY PASS** da onda `dev-20261027-migration-inspector-exact-f`, artefatos `12782788428` (audit) e `12782843456` (apply). Antes da exclusão, tag `archive/m2d/migration-inspector-2b00351a -> 2b00351acc1d1369116d8eeb546146a6b363072e` criada e verificada no GitHub. Retiradas apenas a branch histórica e a auxiliar já ancestral da development.
- Verificações independentes de conclusão: **53 refs ativas** (51 históricas originais + main + development), **12 PRs abertas**, `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` intacta, branches de imagens DS-02 e PR #34 intactas. O ledger `ops/development-retirement-history.json` contém **seis ondas, nove históricas retiradas e três auxiliares absorvidas**; a próxima onda deve carregar todos os **nove** `waves[].retired` históricos, não as auxiliares.
- Este bloco encerrou reconciliação de **código, testes, documentação histórica, diagnóstico da CI e DAG recuperável**. Não executou Netlify, Auth, database, Viewer/Admin nem modificou o Design System.
