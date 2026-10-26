# R1 — Evidence-based branch hygiene

Status: active

## Purpose

Extract the useful branch-cleanup invariant from MobiliPresenter without importing its scheduler/agent stack or making `gh` a runtime dependency.

The R1 path is deliberately small:

`GitHub/git observation -> pure plan -> exact planHash -> reobserve -> point deletes -> full ref readback`

## Safety boundary

A branch prefix or name never authorizes deletion. Protection wins over deletion evidence. `main`, GitHub-protected branches, explicit preserves, and any branch currently participating in an open PR are kept.

Automatic evidence is intentionally narrow: a non-control branch whose current head is an ancestor of current `main`. A diverged branch requires an explicit terminal disposition bound to its exact current SHA.

Before apply, the executor rematerializes the whole observation and plan. Any changed branch inventory, control head, PR relationship, branch SHA, policy, or plan hash blocks mutation. After every delete, the complete remote branch inventory must equal the expected inventory with only that exact ref removed.

## Trigger policy — revisão 2026-10-26

Observação e planejamento automáticos permanecem permitidos em pull requests, push para `main`, agendamento e execução manual. **Todos esses eventos são somente leitura**: publicam observação, plano com hash e artefatos de auditoria; nenhum deles executa exclusão de refs.

O executor `tools/branch_hygiene_apply.py` permanece no repositório como ferramenta de execução restrita, mas não é chamado pelo workflow. A reintrodução de mutação requer proposta separada, autorização explícita por lote de branches e SHAs, reobservação CAS/readback e revisão da capacidade real do executor. Não inferir autorização a partir de `delete-candidate` no plano: esse campo registra elegibilidade técnica, não aprovação de descarte.

A diretriz operacional é reduzir dívida em ondas pequenas, sem teto numérico para branches. A primeira onda examina ancestralidade e referências; só uma decisão auditada por branch permite remover uma ref. Essa regra tem precedência sobre o comportamento de limpeza automática anteriormente documentado aqui.

## R4 — lotes restritos (2026-10-26)

O workflow periódico `.github/workflows/branch-hygiene.yml` permanece **somente auditoria** com token `contents: read`.

O novo workflow `.github/workflows/branch-hygiene-bounded.yml` só executa a fase de aplicação após integração na `main` de uma alteração explícita no manifesto `ops/branch-hygiene-batch.json`. A PR executa auditoria sem mutação. A fase de aplicação tem token `contents: write` isolado e exige 1 a 3 nomes de branches com SHAs exatos e comprovadamente ancestrais de `main`, sem proteção, preservação ou vínculo com PR aberta.

O executor nativo `tools/branch_hygiene_apply.py` **não possui mais modo de excluir todos os candidatos automaticamente**: exige manifesto, identidade de repositório, `planHash`, reobservação do inventário, confirmação de `main`, `--force-with-lease` específico e leitura do estado remoto após cada ref. Qualquer divergência interrompe o lote; o recibo é persistido progressivamente. O workflow de auditoria geral não chama o executor.

A onda R4 contém duas branches antigas integralmente absorvidas na `main`: CI-BASELINE-01 estabilização e branch operacional da PR #247. **ARC-03C permanece preservada** por referência histórica em workflow especializado; a tentativa de alterar esse gatilho foi bloqueada, então não será removida neste lote.

## R0/R1 bootstrap result

The first accepted R1 plan removed five exact refs and left only `main`:

- `incoming/r0-v3.3.0`
- `work/r0-baseline-freeze`
- `work/r0-baseline-freeze-check`
- `work/r0-baseline-tools-stage`
- `work/r1-branch-hygiene`

Receipt: `deletedCount=5`, `remainingBranchCount=1`, `readback=PASS`.

## Non-goals

No scheduler supervisor, leases, peer recovery, agent lifecycle, branch-prefix heuristics, force updates, or `gh` executable are introduced.
