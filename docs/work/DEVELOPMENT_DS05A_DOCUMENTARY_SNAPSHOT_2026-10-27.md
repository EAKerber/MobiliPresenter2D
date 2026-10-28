# Bloco 18 — preservação documental DS-05A, sem aplicação visual (27/10/2026)

## Escopo e evidência

Fonte histórica `docs/ds05a-theme-lab-20261017@6120a294e0de4b018b18b1b50f20411ce44cce09`, subárvore Git `d98e16e5bbd563c8bb1f19a6a0597fddc6021296`, **20 arquivos** (PROVENANCE.json + 19 inventariados, dois PNGs, dois HTMLs, dois JSONs de decisões históricas, auditorias, ferramentas e fixtures). A fonte é documentação/laboratório de 17/10, não aplicação. O snapshot preserva bytes e proveniência; não substitui VIS-002C v0.3 de 24/10 nem autoriza CSS/estados novos. Não executar laboratório antigo como certificação.

A subárvore foi ligada diretamente sob `docs/design-system/review-lab/` apontando ao SHA original, sem reserializar binários. `tests/test_development_ds05a_snapshot.py` valida igualdade do subtree no Git, inventário completo, 19 SHA-256 e ambas assinaturas PNG. Workflow local Python apenas, não executa JS do laboratório, browser nem Netlify.

## Triagem das seis branches VIS-002 ainda em revisão

| Histórico | SHA | Avaliação |
| --- | --- | --- |
| `architecture/p-token-02b-contextual-copy-20261022` | `afb80965336083209eac93e2729de77170524ee5` | PR #231 aberta; três consumidores v0.1, não podar |
| `fix/vis002c-public-text-contrast-20261022` | `007fc8e0ca8d9366efd0c9b5c7adf0da1a5325e5` | cinco seletores #705C4B superados por mapping v0.3; preservar sem CSS antigo |
| `integration/vis002c-p-token-02b-v2-20261023` | `34a305c1ddb9850dc194f68b16fa097c6691c06b` | oito consumidores v0.2; gate equivalência same-DOM/raster possivelmente aproveitável |
| `integration/consolidated-arc03c-vis002c-token-20261023` | `c239012c126c9b3e2c477778ea4b2d37b74c963f` | CI 23/10 PASS, porém merge/release HOLD explícito; não mesclar HEAD |
| `integration/vis002c-contextual-support-v02-20261024` | `a285a2dc6f543f33f45615ba653a296236f8b3ac` | ARC-03C autoral com import v0.2; fonte atual já é v0.3, não reverter |
| `docs/ds05a-theme-lab-20261017` | `6120a294e0de4b018b18b1b50f20411ce44cce09` | evidências históricas únicas; recuperar bytes e manter arquivo antes de retirar ref |

## Gates/limites

Verificar Git blob/tree exatos na auxiliar, depois fast-forward lease para development e repetição da CI no destino. A fonte 18 só poderá ser aposentada após gate de proveniência, tag archive no commit fonte, proteção das 14 históricas anteriores, 12 PRs, DS-02/PR #34 e readback. Os estilos atuais, Design System externo e Netlify não são modificados.

## Gate de destino e proposta de higiene L

- [Auxiliar #40622603669](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40622603669) PASS 4/4; [development #40622653562](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40622653562) PASS 4/4, ambos no commit 0a0f0ee1187ef2ae7c989e28bffab75cac5bb5f1. 20 arquivos do laboratório correspondem à subárvore `d98e16e5bbd563c8bb1f19a6a0597fddc6021296` do commit `6120a294e0de4b018b18b1b50f20411ce44cce09` com SHA-256 individuais conferidos. Não há import na aplicação.
- A fonte `docs/ds05a-theme-lab-20261017@6120a294e0de4b018b18b1b50f20411ce44cce09` será preservada também pela tag `archive/m2d/ds05a-theme-lab-6120a294` antes da exclusão da ref, caso o gate L finalize com PASS. Fonte documental e auxiliar ancestral, sem PR aberta, com main protegida e 14 registros anteriores. **Não declarar retirada antes de AUDIT+APPLY readback.**

## Gate L consumido — arquivo recuperável

- [GitHub Actions #40622806456](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40622806456): **AUDIT+APPLY PASS**, 28 testes de seleção, leases e readback. Origem `docs/ds05a-theme-lab-20261017@6120a294e0de4b018b18b1b50f20411ce44cce09` aposentada após tag `archive/m2d/ds05a-theme-lab-6120a294 -> 6120a294e0de4b018b18b1b50f20411ce44cce09`, conferida remotamente. Auxiliar `integration/18-ds05a-documentary-snapshot-20261027@0a0f0ee1187ef2ae7c989e28bffab75cac5bb5f1` retirada após integração por fast-forward; seus arquivos permanecem na development.
- Artifacts: AUDIT `12787309905`, APPLY `12788291123`. Roster **49→47 branches** (**45 históricas** + main + development), 12 PRs, DS-02 e PR #34 preservados; main intacta. O manifesto L foi consumido; não reexecutar. Snapshot de 20 arquivos não significa homologação visual.
