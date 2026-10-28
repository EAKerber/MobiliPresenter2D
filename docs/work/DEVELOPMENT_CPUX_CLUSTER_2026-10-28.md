# Bloco 20 — CP-UX: quatro branches em uma reconciliação (28/10/2026)

## Escopo

Quatro refs source-locked:
- `feat/cp-ux-04-hierarchy-layout@5d8347edb6ea247307b6fc27b424117553542f78`
- `feat/cp-ux-05a-publication-prep@de0358134963f5ce72bdee98437922a3520ee24a`
- `feat/cp-ux-05a-publication-prep-v2@1872ca2a79585449df370910f18500ad5351451a`
- `feat/cp-ux-05a-v4-publication-prep@ba22963ad304bddb6b77d59d7340b9e085f4d9b7`.

Uma única auxiliar de **família** conserva onze blobs históricos exatos: quatro versões do roadmap, layout/guard inicial, serviço e test fixture antigos da preparação v3→v4, e a proposta v4 de API/admin. Nenhuma alteração em `app/`, `netlify/`, `architecture/` ou workflows preexistentes. Os caminhos são documentais `docs/reconciliation/cp-ux/legacy/`, não usados pelo runtime.

## Decisão de conflito pela implementação e intenção mais recente

As fontes históricas são diferentes estados de CP-UX-04/05A, mas a `development` carrega `ConfiguratorAdministration2D 5.0`, usa o código atual de flow/hierarquia e a função `netlify/functions/configuration.mjs` com GET/PUT autenticado, migração v5 já encerrada, `v5NormalSave` e tratamento fail-closed de dados inválidos. O roadmap mais recente registra a execução autenticada de CP-UX-05A0 como pendente, condicionada à consolidação schema-driven. Não substituir o caminho v5 por POST/preflight ou `hierarchy-publication.mjs` antigos. A intenção antiga de preparar v4 e o teste histórico permanecem disponíveis para comparação, não homologados para reativação.

## Contratos e gates

`tests/test_development_cpux_cluster.py` compara 11 blobs atuais arquivados contra cada `source SHA:path`, e verifica de forma independente blobs e guardrails das fontes autoritativas atuais. Também exige que a integração não importe código arquivado na aplicação. Workflow offline repete os testes atuais `app/tools/test-flow-layout.js`, `app/tools/test-hierarchy-administration.js` e `npm run pages:check`; não escreve banco, Netlify, Admin nem storage.

**Retirement:** CP-UX-04 (UI) e 05A/v4 (funções/admin) ficam HOLD até prova independente das contribuições e do histórico completo; 05A-v2 tem somente um arquivo de roadmap distinto e é candidato a tag archive + aposentadoria após gates. Nenhum branch com PR aberta entra em poda. Independente do grupo de quatro, o executor de higiene permanece limitado a três refs por execução. O gate só promove documentação e proteções, não o backend histórico.

## Saída

Se workflow da auxiliar passar: FF de lease para development; repetir gate no destino; registrar handover. Após isso, uma rodada de higiene de escopo exato pode retirar a auxiliar e, se comprovado, a v2 documental com tag. Não fazer merge ou deploy em main.

## Gate CP-UX verificado e lote N documental

- [Auxiliar #40680719779](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40680719779) PASS; [development #40680800240](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40680800240) PASS, ambos sobre o mesmo HEAD de código `6fc6ab3ea759e4d1f4dd237e8483a897d46eec93`, com quatro testes de reconciliação, testes atuais de layout/admin e `pages:check`. Uma auxiliar reconciliou quatro fontes, **não** quatro auxiliares.
- `feat/cp-ux-05a-publication-prep-v2@1872ca2a79585449df370910f18500ad5351451a` é doc-only (uma única alteração no roadmap frente à base original), o conteúdo foi preservado por blob `2b335334d24235c92a1e9f2ae3f2128a24b5e077` em `docs/reconciliation/cp-ux/legacy/cp05av2/docs/backlog/ux-navigation-hierarchy-roadmap-2026-10-05.md`. A intenção/roadmap atual é posterior e domina a alternativa antiga. Para aposentadoria, preservar o commit inteiro pela tag `archive/m2d/cpux05a-v2-1872ca2a` antes do delete. Auxiliar `integration/20-cpux-hierarchy-publication-family-20261028@6fc6ab3ea759e4d1f4dd237e8483a897d46eec93` é ancestral de development e também pode ser retirada.
- Sem PR, sem proteção, 12 PRs gerais inalteradas, 45 históricas no conjunto anterior (43 originais; lote N retira apenas 1 original). O manifesto N é de uso único; **não declarar retirada até o gate audit+apply e readback**. CP-UX-04, CP-UX-05A e CP-UX-05A-v4 com código relevante continuam em HOLD.

## Conclusão — lote N confirmado

- [Actions #40680948612](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40680948612) **AUDIT+APPLY PASS**, 28 testes; [gate auxiliar #40680719779](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40680719779) PASS; [gate development #40680800240](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40680800240) PASS; [gate após manifesto #40680948561](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40680948561) PASS.
- Tag remota `archive/m2d/cpux05a-v2-1872ca2a` -> `1872ca2a79585449df370910f18500ad5351451a`, blob roadmap original `2b335334d24235c92a1e9f2ae3f2128a24b5e077` recuperável e gravado no cluster. Removidas somente `feat/cp-ux-05a-publication-prep-v2@1872ca2a79585449df370910f18500ad5351451a` e `integration/20-cpux-hierarchy-publication-family-20261028@6fc6ab3ea759e4d1f4dd237e8483a897d46eec93`; aplicar somente após provar SHA e ausência de PR/guards. Readback: **46→44** heads; **42 originais restantes, 18/60 aposentados**, **11 auxiliares aposentadas**, 12 PRs abertas, main intacta. Receipts: audit `12812208700`; apply `12812867207`.
- HOLD: `feat/cp-ux-04-hierarchy-layout`, `feat/cp-ux-05a-publication-prep` e `feat/cp-ux-05a-v4-publication-prep` mantidas por risco de regressão em layout, autorização, configuração e migração. A reconciliação de evidências **não** prova que todos os efeitos funcionais dessas branches já estão presentes. O manifesto N está consumido.
