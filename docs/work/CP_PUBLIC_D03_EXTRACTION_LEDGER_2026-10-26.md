# CP-PUBLIC — D03 lote documental 01 (26/10/2026)

Política D03=A: extrair conteúdo útil de PRs antigas/substituídas ANTES de encerrá-las. Os documentos abaixo são **históricos de 08/10**, não uma nova autoridade de login, grant ou DTO. Cópia textual exata dos Git Blobs das PRs originais, sem edição.

| PR origem | Branch de origem | Documento copiado na branch de reconciliação | SHA Blob origem |
| --- | --- | --- | --- |
| [#181](https://github.com/EAKerber/MobiliPresenter2D/pull/181) | `work/cp-public-03a-security-and-hygiene-inventory-20261008` | [`docs/architecture/cp-public-03a-access-security-surface-2026-10-08.md`](../architecture/cp-public-03a-access-security-surface-2026-10-08.md) | `506c573e3dbce8e1a7bba5908f568b24717df53c` |
| [#181](https://github.com/EAKerber/MobiliPresenter2D/pull/181) | `work/cp-public-03a-security-and-hygiene-inventory-20261008` | [`docs/architecture/cp-public-05-duplications-and-cleanup-ledger-2026-10-08.md`](../architecture/cp-public-05-duplications-and-cleanup-ledger-2026-10-08.md) | `53dcc1f0b4ebfbebe96c39a484c38c35261e9ba7` |
| [#183](https://github.com/EAKerber/MobiliPresenter2D/pull/183) | `work/cp-public-03a2-buyer-session-and-bootstrap-plan-20261008` | [`docs/architecture/cp-public-03a2-authorized-buyer-bootstrap-plan-2026-10-08.md`](../architecture/cp-public-03a2-authorized-buyer-bootstrap-plan-2026-10-08.md) | `8e4343c3630b6a935ab0588052d5db9447226202` |
| [#183](https://github.com/EAKerber/MobiliPresenter2D/pull/183) | `work/cp-public-03a2-buyer-session-and-bootstrap-plan-20261008` | [`docs/testing/cp-public-03a2-release-gates-2026-10-08.md`](../testing/cp-public-03a2-release-gates-2026-10-08.md) | `5eaf5755a6797debd6e814a36ba366da4870c34c` |

## Regras de leitura

- O roadmap, CURRENT_STATE.md e handovers divergentes de 08/10 não foram sobrepostos aos arquivos correntes. Eles permanecem recuperáveis nas heads das PRs originais; suas diferenças semânticas devem ser avaliadas antes de classificar as PRs como totalmente reconciliadas.
- PRs #181 e #183 são documentação/plano; seu fechamento eventual não autoriza excluir refs, nem reativar configuração/acesso antigo.
- Fluxos #182/#184/#185/#186 incluem mudanças de execução e contratos de segurança próprios; permanecem em HOLD até matriz campo/erro/autorização provar destino. Não integrar nada que exponha raw v5 ou bypass de sessão.
- Outras PRs #175, #178–#180 e #196 devem ser reconciliadas contra os endpoints/projetores atuais, sem presumir equivalência só porque há arquivos com nomes parecidos.

## Reconciliação dos arquivos compartilhados das PRs #181/#183

As três superfícies compartilhadas (`CURRENT_STATE.md`, `docs/backlog/cp-public-00-landing-viewer-config-access-roadmap-2026-10-08.md` e `docs/handoffs/public-pages-current-handoff-2026-10-08.md`) foram comparadas com a main atual. Em cada origem, as diferenças restantes de linhas longas são **cabeçalhos/links históricos dos planos extraídos** e uma linha de status de 08/10 substituída por informações mais novas da main; não sobrepor documentos atuais por versões antigas.

**Recibo documental condicional:** #181 e #183 não têm arquivos executáveis exclusivos no diff para main. Os quatro documentos de segurança/plano listados acima contêm os detalhes exclusivos relevantes. Portanto, após mesclar este recorte, as PRs podem ser **encerradas como substituídas / históricas**, mantendo branches e SHAs originais enquanto durar a classificação das demais CP-PUBLIC. Fechar PR não significa mesclar nem apagar código. PRs #182/#184/#185/#186 permanecem intocadas e requerem gate de contrato.

## Próximo gate D03

Checar deltas dos documentos comuns (CURRENT_STATE, backlog, handover) e compatibilidade dos contratos ativos. Para fechar uma PR, registrar: destino dos caminhos, confirmação de ausência de código executivo novo ou substituto equivalente, SHA/head no fechamento e decisão explícita de conservar a branch enquanto houver dúvida.
