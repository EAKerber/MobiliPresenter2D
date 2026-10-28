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
