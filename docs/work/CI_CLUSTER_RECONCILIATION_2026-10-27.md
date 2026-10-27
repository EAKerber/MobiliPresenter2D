# CI/autenticação — ledger de reconciliação por proveniência

Data: 27/10/2026. Escopo: 15 branches originais do grupo `01-ci-auth` no inventário pinado a `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`. Não é autorização para fechar PRs, apagar branches ou implantar login.

## Resultados efetivos na development

- `Migration Inspector`: dois blobs de código/testes extraídos fielmente do HEAD `tooling/migration-inspector-v0-20261023`, workflow local PASS no destino; o restante da branch não foi incorporado.
- `Nav R9`: teste data-driven V5 já existente foi ampliado para 900/1200 e transições 1050↔1051; fonte histórica fixa de quatro etapas **não** foi copiada. A auxiliar passou 32/32 ([#40524950791](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40524950791)). Após runner em container Playwright 1.62.1, auxiliar [#40529695931](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40529695931) e **development [#40530168178](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40530168178)** passaram 32/32. O run anterior no destino [#40525526467](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40525526467) foi CANCELLED na instalação de navegadores, sem testar cenários; não confundir com falha do UI.
- `Preview identity`: derivação seletiva das asserções do HEAD da PR #238, 9/9 testes sintéticos em auxiliar [#40528928050](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40528928050) e destino [#40529157447](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40529157447) PASS. Não contém concessão de acesso nem valida login real.
- `Public projection test`: `tests/public-module-projection.test.cjs` da branch histórica e a versão em `development` têm blob **idêntico** `6a8faec2f00e0d7cd26084a1927fb6a5d9c660c3`. O arquivo está presente, portanto não criar cópia. Não implica absorção de todos os commits históricos.
- `ci-auth-base-20261025` e `fix/config-stage-nav-grid-track-20261025` são ancestrais da branch da PR #238: respectivamente `behind=0/ahead=22` e `behind=0/ahead=4` em comparação com PR #238. A PR **não foi integrada** à development, logo esse vínculo não justifica apagar tais branches.

## PR #238 e autenticação real

A PR continua aberta e precisa de preview reconstruído ou validado contra seu HEAD exato antes do gate real. O Netlify deploy #238 já publicado é do commit `41dcc1424bdeea5782d977d2b0509c88f76fe156`, enquanto a PR aponta `3ccce161235df925c5b708bf6feefbe6f4b10103`. O gate autenticado [#40257905366](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40257905366) rejeitou corretamente a identidade, sem chegar à autenticação. Não relaxar a política de commit/grant/site, não reutilizar #235 nem abrir builds Netlify sem uma necessidade expressa.

## Status de cada origem (exclusão ainda bloqueada)

| Origem SHA | Disposição | Observação |
|---|---|---|
| `ci-auth-base-20261025@fd61a37a11dd` | `COMMIT_ANCESTOR_OF_PR238` | GitHub compare directly to PR #238 confirms behind=0; NOT in main/development |
| `ci/ci-baseline-01-auth235-only-20261023@17dac20ecef8` | `HOLD_CROSS_BLOCK_RECONCILIATION` | merged UI/tokens/pages/auth history; do not merge whole branch |
| `ci/ci-baseline-01-config-readiness-20261022@dcfec5b7666b` | `HISTORICAL_REMOTE_DIAGNOSTIC` | target URLs and commit baked in; no replacement for current authenticated/anonymous policy |
| `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235d` | `OPEN_PR_PARTIAL_TEST_EXTRACTION_ONLY` | PR #238 old deploy marker SHA ≠ HEAD, only pure unit checks integrated |
| `ci/ci-baseline-01-isolated-session-fixture-20261023@cb0ae8b1e05b` | `HOLD_CROSS_BLOCK_RECONCILIATION` | merged UI/tokens/pages/auth history; do not merge whole branch |
| `ci/ci-baseline-01-nav-sequence-probe-20261023@b9be8bfdac10` | `SEMANTIC_ADAPTATION_R9` | fixed-four-stage legacy test replaced by data-driven V5 32/32 Chromium/WebKit local check |
| `ci/ci-baseline-01-public-projection-test-20261022@387da6a57c41` | `EXACT_BLOB_ALREADY_PRESENT` | tests/public-module-projection.test.cjs SHA 6a8faec2f00e0d7cd26084a1927fb6a5d9c660c3 equals development |
| `ci/ci-baseline-01-published-preview-fixture-20261023@60773a62cd6d` | `HOLD_CROSS_BLOCK_RECONCILIATION` | merged UI/tokens/pages/auth history; do not merge whole branch |
| `ci/ci-baseline-01-shared-db-preview-20261023@1e164dc55cc1` | `HOLD_CROSS_BLOCK_RECONCILIATION` | merged UI/tokens/pages/auth history; do not merge whole branch |
| `ci/ci-baseline-01-v5-local-diagnostics-20261023@5ce7327a9e4c` | `HOLD_CROSS_BLOCK_RECONCILIATION` | merged UI/tokens/pages/auth history; do not merge whole branch |
| `ci/ci-global-auth-boundary-repair-20261023@cacd0e916043` | `HOLD_CROSS_BLOCK_RECONCILIATION` | merged UI/tokens/pages/auth history; do not merge whole branch |
| `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e88` | `SEMANTIC_LABEL500_EXTRACTED_PARTIAL` | 136/136 measured named CSS container checks in Chromium/WebKit, including true 500px inner-width crossing; source HEAD remains divergent and retained |
| `fix/config-stage-nav-grid-track-20261025@dbfbd9a7bca0` | `COMMIT_ANCESTOR_OF_PR238` | GitHub compare directly to PR #238 confirms behind=0; NOT in main/development |
| `security/oidc-ci-preview235-v0-20261023@833f36a52456` | `HOLD_SECURITY_POLICY_REVIEW` | old preview #235 and credentials must never be treated as current authority |
| `tooling/migration-inspector-v0-20261023@2b00351acc1d` | `PARTIAL_EXACT_BLOB_IN_DEVELOPMENT` | 2 source blobs imported, no merge of historical HEAD |

## Próximas decisões técnicas

1. O bloco CI básico de leitura local pode ser considerado **integrado à development**; não é autenticação real aprovada.
2. Priorizar a análise dos testes diferenciais de CSS e do limiar de rótulos (~500 px) antes de decidir se há novo código útil; executar isoladamente, sem transplante de estilos legados.
3. Somente depois de reconstruir o deploy isolado da PR #238 no SHA atual e testar negativas de Admin/grants/revogação considerar incorporar código auth, com revisão de segurança e licença temporal da fixture.
4. Poda das branches deve ocorrer só após registro de proveniência, confirmação de ausência de PR e proteção de DAGs divergentes; cinco auxiliares atuais são ancestrais da development, mas também exigem lease e readback.

**Nenhuma das 15 origens é declarada integralmente absorvida pela simples classificação.** A `main` fica intacta. A fonte viva desta auditoria é `development` e os SHA pinned acima.

## R10 — resolução de contêiner real e limiar CSS comprovados (27/10/2026)

A fonte `tests/ci/nav-label-width-boundary.mjs` (blob `7d15daeac6a88ecd295b5393a1878d610a809d57`) comparava visualmente CSS baseline/candidato e amostrava `.controls` em 496–522px. A `main` e a `development` atuais compartilhavam o mesmo blob CSS `d43e6fb5e66133d2389b5c39b165b76b13cfa868`; comparar duas entradas idênticas não prova a regra de container.

Recorte extraído: `tests/ci/nav-label500-invariant.cjs` e [evidência](CI_BASELINE_NAV_LABEL500_2026-10-27.md) na `development`, sem alteração de CSS. A primeira janela não cruzava o threshold real e falhou conscientemente ([#40537787907](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40537787907)). Estendida a 17 larguras, produziu 136/136 PASS na [auxiliar #40539023485](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40539023485) e na [development #40539657812](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40539657812), 2 motores × 2 temas × 2 estados.

**Ponto real:** Chromium .controls 529px→conteúdo nav 500px compacto, 530→501px completo; WebKit .controls 514px→conteúdo nav 500px compacto, 515→501px completo. Assim, a regra CSS de 500px é interna ao contêiner nomeado e se comporta corretamente mesmo quando a geometria externa varia entre motores. **Não transplantar o CSS legado** e não tratar a branch inteira como absorvida; nenhum merge de seus HEADs foi feito.
