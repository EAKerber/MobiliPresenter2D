# ADR 0002 — Repository operations

Status: Accepted for R0
Date: 2026-09-03

## Decision

Repository operations are defined by capabilities and invariants, not by a required `gh` executable.

A mutation-capable provider must preserve this sequence:

1. observe repository identity and exact target head;
2. define exact branch/path scope;
3. build a closed candidate change;
4. validate the observed head again before apply;
5. apply without force;
6. independently read back the resulting commit/tree/content;
7. record a receipt or blocker.

Provider availability does not expand authority. Missing provider evidence is `UNKNOWN`, not proof that the logical Git capability is unavailable.

## R0 mutation path

The connected GitHub provider exposes Git-data operations sufficient for a direct closed mutation path: blob creation, tree creation, commit creation with explicit parent, non-force ref update and content readback.

R0 therefore does not depend on local `gh` or on a mutable working tree. Candidate Git objects may be created before branch movement; the branch only changes after the candidate commit is complete and the expected head is re-observed.

## Concurrency

R0 does not introduce durable leases. With one active writer, exact expected-head checks and non-force ref updates are sufficient. Leases remain a future option if independent concurrent writers become real.

## Main protection

`main` was written once only to materialize the previously empty repository. Normal implementation work occurs on work branches. No force update, repository-wide overwrite, or whole-main replacement is permitted.
