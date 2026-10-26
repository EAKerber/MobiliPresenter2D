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
