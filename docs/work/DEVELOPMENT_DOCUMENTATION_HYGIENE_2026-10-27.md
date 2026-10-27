# Bloco 08 — checkpoint histórico + higiene por lote na development (27/10/2026)

## Proveniência e escopo

O inventário de 60 branches em `docs/work/DEVELOPMENT_CLUSTER_INVENTORY_2026-10-27.json` define `08-documentation` como a única fonte `docs/handover-reconcile-20261023@d6c238946526cfd33b3b498b5d2187790c1d78bd`, divergente de `main` e `development` (6 ahead em relação a ambas). A comparação com o destino de 27/10 tinha um **único caminho modificado**, `docs/handoffs/ARCHITECTURE-CURRENT-2026-10-22.md`: são 26 linhas adicionadas em 23/10, que registram estados históricos de OIDC, CI/Flow, ARC-03C, Migration Inspector e tokens.

Nenhum dos eventos antigos deve sobrescrever um estado posterior ou justificar publicação. A inserção **literal** de 26 linhas foi salva, com blob SHA da fonte `06ece5e9f97dc7b8141338a0dc2c844d90e80ec7`, em [ARCHITECTURE_CHECKPOINT_2026-10-23_ARCHIVED.md](../handoffs/ARCHITECTURE_CHECKPOINT_2026-10-23_ARCHIVED.md). O verificador confronta o fragmento com `git show d6c23894:docs/handoffs/ARCHITECTURE-CURRENT-2026-10-22.md` e verifica que o resto do arquivo é byte a byte equivalente em linhas ao arquivo em `development`. [Gate #40576099332](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40576099332) **PASS** após corrigir a inclusão da linha em branco terminal. São 14 testes negativos/invariantes de lote, mais a prova literal do checkpoint.

A branch divergente contém uma DAG exclusiva. **Não basta guardar 26 linhas para apagar a ref.** A política exige primeiro criar uma tag Git de retenção com SHA exato `archive/m2d/docs-handover-20261023-d6c23894 -> d6c238946526cfd33b3b498b5d2187790c1d78bd`; validar via `ls-remote --tags`; depois, e somente depois, admitir exclusão da branch. A tag é uma ref de recuperação, não uma homologação de código. Não alterar `main`, workflows de produção ou apps.

## Outros dois candidatos de manutenção

As duas referências do grupo `00-ops` são ancestrais da `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, verificado por GitHub compare em 27/10:

- `maintenance/branch-retirement-r9-operational-20261026@535a2edf9d7bcfaab5e51d9a00374417a0e376b9`: ancestor, 0 behind relativo à main.
- `maintenance/branch-retirement-r10-squash-20261026@74562dd8a26b6ed5ebcdc3d039eb0ee3306c9bd6`: ancestor, 0 behind relativo à main.

Não têm PR aberta. Mesmo nesses casos, nenhum nome ou idade de branch autoriza poda sem `merge-base --is-ancestor`, GitHub branch protection/rulesets, roster completo e lease.

## Mecanismo generalizado na development

`tools/development_retirement_batch.py` substitui o padrão de um script específico para cada auxiliar (scripts antigos permanecem históricos e **consumidos**). O novo executor exige um manifesto `ops/development-retirement-batch.json` e impõe:

1. **No máximo três targets explícitos** e SHAs exatos presentes no inventário fixado de 60. `main` e `development` são impossíveis como targets. `retired` descreve as referências consumidas por lotes anteriores e prova sua ancestralidade/tag arquivada, tornando o executor reutilizável para lotes posteriores sem assumir sempre 62 refs.
2. Roster completo de `git ls-remote --heads`, sem refs surpresa ou SHAs alterados; contexto GitHub exato `development` e HEAD da execução; `main` verificada em SHA fixo.
3. Todos os números das **12 PRs abertas** fixados, nenhuma branch alvo pode constar como head/base; nenhum branch protegido ou ruleset não homologado; nenhum workflow ativo referencia literalmente as refs.
4. Para `ancestor-main`, identidade ancestral provada por `git merge-base`. Para `archive-diverged`, registro de proveniência em `docs/` com SHA original e tag específica, além de verificações adicionais de conteúdo quando aplicáveis.
5. **Auditoria sem efeitos**; fase apply exige credencial de escrita e autorização de execução restrita a `push` real na `development`. Primeiro cria/verifica tags de arquivo; depois aplica `git push --force-with-lease` a cada alvo, com readback integral entre todas as exclusões.
6. O workflow `.github/workflows/development-retirement-batch.yml` só dispara mutações por **edição explícita do manifesto** na `development`; atualizações ordinárias de código/docs nunca reexecutam o último lote. Relatórios audit/apply são artifacts e handover os referencia.
7. O workflow `.github/workflows/development-hygiene-safety.yml` é separado e **somente read-only** para testar refutações e reprodução do checkpoint. Isso evita acoplar atualização da ferramenta a exclusão.

## Lote proposto e limites

O primeiro lote contempla exatamente as três refs citadas acima, nunca os 57 itens restantes e jamais a PR #34 ou o pacote dos 40 originais DS-02. O manifesto de execução deve ser escrito **depois** dos gates de ferramenta, e a exclusão só pode ser considerada concluída quando audit + apply + inspeção de tag + contagem de branches retornarem sucesso; erros geram HOLD, não `force`.

Não fechar PRs automaticamente. Não fazer Deploy Preview ou deploy de `main`. O fluxo de tags e todos os arquivos aqui são de higiene Git e não um atestado de autenticação, CI produtivo ou qualidade visual.

## Execução comprovada do primeiro lote

- [GitHub Actions #40576562178](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40576562178): **AUDIT PASS** e **APPLY PASS** no commit `821ff78e18796120b8531eeb709cf65650f1def5`. Artifacts: `dev-bounded-retirement-audit-40576562178` ID `12766939318`; `dev-bounded-retirement-apply-40576562178` ID `12768360061`.
- A tag de recuperação foi criada **antes de qualquer exclusão**, `refs/tags/archive/m2d/docs-handover-20261023-d6c23894@d6c238946526cfd33b3b498b5d2187790c1d78bd`. A API GitHub `git/ref/tags/...` confirmou objeto do tipo `commit` e SHA idêntico.
- Exatamente três branches removidas: `docs/handover-reconcile-20261023` (DAG divergente retida pela tag), `maintenance/branch-retirement-r9-operational-20261026` e `maintenance/branch-retirement-r10-squash-20261026` (ancestrais `main`). Cada operação validou SHA lease, proteção, PR e readback.
- Readback independente: **62→59 refs**, 12 PRs abertas inalteradas, 57 das 60 branches históricas preservadas. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` intacta; `development` continha `821ff78e...` no momento de aplicação. O pacote DS-02 de 40 originais, a PR #34 e sua branch de laterais/vidro permanecem intactos.
- `ops/development-retirement-history.json` é o ledger de lotes consumidos e de tags. O próximo lote deve transportar as três linhas `waves[].retired` para `ops/development-retirement-batch.json.retired`, permitindo que a auditoria compare os 57 refs originais restantes com o inventário histórico de 60. Este manifesto **foi consumido**; não reexecutar sua alteração sem preparar novo lote explícito.
- Os 14 testes negativos e a inspeção literal do checkpoint ficaram verdes após corrigir a linha em branco final: [#40576099332](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40576099332) PASS; [#40576457872](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40576457872) PASS após remover a dependência de workflow ativo na ref documental retirada.
- Sem alterações no código do Viewer/Admin, imagens, schema, preço, sessão, banco ou branch `main`. Não houve solicitação de deploy Netlify.

## Segundo lote — prova de reutilização (27/10/2026)

- Duas refs historicamente **ancestrais** da main atual foram classificadas por comparação e SHA: `architecture/arc03c-static-page-build-20261022@fbd00a9628c81b4902a8c679abb7ac72e93ca549` e `fix/focus-ring-about-approved-vis002-20261024@e7b02c04308e9fcc7b52f1d09534058a2a0bbc65`. Nenhuma era HEAD/base de PR aberta.
- Havia gatilhos de push nominais em `.github/workflows/arc03c-static-page-build-gate.yml` e `.github/workflows/about-skip-link-focus.yml`. Foram retirados antes do lote, para não deixar workflows apontando para refs aposentadas. O gate ARC-03C histórico permaneceu executável manualmente; o gate skip-link manteve `pull_request` para `main` e ganhou execução manual. Nenhuma lógica de teste foi alterada.
- `ops/development-retirement-batch.json` foi atualizado para `dev-20261027-ancestor-build-and-focus-b` com **`retired[]` contendo as três baixas da onda anterior**, permitindo validação do roster original de 60 menos baixas já provadas.
- [GitHub Actions #40577256058](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40577256058) **AUDIT+APPLY PASS**, com artifacts de auditoria ID `12766104720` e aplicação ID `12766224515`. Exclusão por SHA lease e leitura de cada ref; readback por GitHub **59→57** branches, nenhuma das 12 PRs alterada. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` imutável.
- **Total das duas ondas: cinco branches limpas**, sendo uma divergente com DAG arquivada em tag e quatro ancestrais da main; ainda **55 refs históricas + main + development**. O ledger `ops/development-retirement-history.json` agora possui as duas waves e suas cinco disposições; o próximo manifesto precisa transportar todas elas em `retired[]` para manter a auditoria completa.
- Nenhum workflow de produção Netlify foi executado nesta etapa; não houve alterações de schema, banco, acesso, preços, objetos visuais ou deploy. As refs de PRs e o arquivo DS-02 permanecem retidos.
