# Reconciliação semântica das branches históricas — 27/10/2026

## Resultado da varredura read-only completa

[GitHub Actions #40578562289](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40578562289) **PASS**, artifact machine-readable `development-semantic-reconciliation-40578562289`, ID `12768017815`. O scanner auditou as **55 branches históricas remanescentes**, comparou cada SHAs ao inventário fixo de 60 e subtraiu as cinco aposentadas, verificou a `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, a `development@a005918f04f81abea45d75b1e9679db15c99936d`, todas as refs remotas e as **12 PRs abertas**.

Algoritmo: para cada branch, identificar seu ancestral comum com a main via `git merge-base`, listar os caminhos alterados nesse ramo desde o ancestral, e comparar os **SHA de cada Git blob contribuído** com o mesmo caminho na development. Não confundir centenas de arquivos que evoluíram em outras branches com alterações introduzidas especificamente pelo ramo auditado. Roster, open PRs, árvore e hashes são fail-closed; scanner não tem permissão de escrita.

| Resultado sobre os caminhos contribuídos | Branches | Consequência |
|---|---:|---|
| Todos os blobs iguais ao destino | **1** | Candidata à higiene após reter toda a DAG |
| Parcialmente reconciliados | **19** | Inspecionar diferenças semânticas e lacunas antes de substituir |
| Sem nenhum blob contribuído idêntico | **35** | Sem autorização de descarte por esta auditoria |
| **Total** | **55** | Não inferir equivalência a partir de nomes/commits |

**Observação metodológica:** `0 blobs iguais` não prova ausência de funcionalidades no produto: o arquivo pode ter sido refatorado, renomeado ou integrado semanticamente. Reciprocamente, `1 blob igual` não dispensa verificar que o caminho é **a única contribuição** do ramo, que não tem PR, que não existe dependência ativa, e que a DAG divergente será recuperável.

## Equivalência exata verificada e proposta para higiene

- Branch `fix/mobile-menu-scene-stacking-20261019@b81308a22c2a9d281037306f5ebf9eecb521d15e`, grupo `05-navigation`, sem PR aberta e com exatamente **um caminho contribuído**, `app/styles.css`.
- O blob SHA `d43e6fb5e66133d2389b5c39b165b76b13cfa868` é **igual** na origem e em `development`. Não há arquivos exclusivos nem deletados na contribuição desse ramo. Este fato também foi confirmado por leitura independente do arquivo em ambas as refs.
- **Não é ancestral da main**; portanto, antes de apagar a branch, preservar DAG com tag `archive/m2d/fix-mobile-menu-scene-stacking-b81308a2 -> b81308a22c2a9d281037306f5ebf9eecb521d15e`. A tag Git protege o histórico; este relatório registra a proveniência legível.
- O gate `tools/development_retirement_batch.py` foi ampliado para prova `equalBlobPath`/`equalBlobSha`. Ele verifica, no momento de executar, que o **conjunto inteiro de caminhos efetivamente alterados é exatamente [`app/styles.css`]** e que os dois blobs têm o mesmo SHA indicado. Um arquivo igual entre muitos diferentes não passa. Aplicação exige também 12 PRs inalteradas, nenhum workflow ativo referenciando o ramo, GitHub branch protection e rulesets, lease e readback.

## Lacunas úteis — não descartar

- **Acessibilidade:** `a11y/image-failure-scalable-placeholder-20261025@6840d8986e44a7860b541e6becb3b5373ef48c09` modifica cinco caminhos e introduz tratamento em `app/how-it-works/how-it-works.js` de `error`/`naturalWidth===0`, fallback acessível, status e alt. A development não contém esse trecho; é candidata a integração isolada, com ensaio local em navegador e prova de equivalência da página gerada.
- **CI antigo:** `ci/ci-baseline-01-config-readiness-20261022@dcfec5b7666b8e16d984be2d0d8c838b96b41b42` acrescenta dois caminhos de diagnóstico não presentes no destino. O teste aponta para produção/PR #231 e não comprova Auth real; requer avaliação de obsolescência e retenção histórica antes de poda.
- **Arquivos de design:** `docs/ds05a-theme-lab-20261017@6120a294e0de4b018b18b1b50f20411ce44cce09` acrescenta 20 arquivos de laboratório/auditoria, incluindo PNGs e HTML histórico. Não apagar apenas por parecer documentação; preservação de imagens de evidência é essencial.
- **Viewer/Admin:** `feature/viewer-base-prices-global-off-20261021@82e4d09a842d830d80b0b5f19bd5370fe146d57c` tem 8 blobs iguais, 8 divergentes e 1 caminho histórico ausente no destino. A publicação de preço base OFF por padrão já está implementada, mas diferenças testáveis merecem auditoria; não sobrescrever o DTO 0.1/0.2 atual.
- **Navegação:** `fix/viewer-secondary-header-nav005-20261021@10445ad8c20ac1a415f4ba463345eda83bd7e9a6` diverge em três arquivos, ainda que o header atual posicione Ambientes no lado das ações; preservar contrato homologado, sem regressão de layout.
- **Acesso/Auth/PR:** manter os 12 HEADs/bases de PR abertas e `security/oidc-ci-preview235-v0-20261023` em HOLD até evidência independente. O scanner não legitima uso de fixture como teste de identidade real.
- **Cena/asset:** `artifacts/ds02-imagens-originais-20261015` é arquivo original imutável com 40 imagens; `feat/exposed-sides-and-glass` tem PR #34/risco de fidelidade visual. Ambos ficam preservados, sem substituição de binários.

## Operação e decisão

**Bloco 09 — equivalência semântica:** a execução read-only foi validada. A única candidata imediata do scan tem prova de igualdade de SHA por caminho e exige archival tag antes da limpeza. Não haverá exclusão das outras **54** branches sem documentação individual de conteúdo, decisão de HOLD ou gates de equivalência apropriados.

Ao aplicar novos lotes, o manifesto explícito `ops/development-retirement-batch.json` deve carregar os cinco `retired[]` de `ops/development-retirement-history.json`; remover uma linha antiga provoca erro de roster, não novo método de bypass. Após qualquer execução, acrescentar recibos, contagem e SHA no ledger e no handover. **Nenhum deploy Netlify é necessário para este trabalho.**
