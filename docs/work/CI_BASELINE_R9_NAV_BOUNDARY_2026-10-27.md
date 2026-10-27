# CI-BASELINE R9: navegação V5 dinâmica por limiar e histórico #238

Checkpoint de 27/10/2026. Bloco isolado `integration/01-ci-nav-boundary-20261027`; este recorte será integrado apenas à `development` após gate local. Não altera o produto publicado, a configuração de login, o banco ou o deploy.

## Reconciliação com a origem histórica

- A branch `ci/ci-baseline-01-nav-sequence-probe-20261023` possuía `tests/ci/nav-flow-profile-crossbrowser.mjs`, testando 390, 701, 900, 1050, 1051, 1200 e 1366 pixels em Chromium/WebKit. Porém pressupunha quatro IDs fixos de etapas e não serve para incorporação integral no comprador V5.
- A versão atual em `development` já contém `tests/ci/nav-flow-responsive-crossbrowser.cjs` com etapas derivadas do modelo e cobertura Chromium/WebKit para 390, 700, 701, **1050, 1051** e 1366, além de teclado em 1050/1051. O texto do handover R8 que sugeria ausência dessa cobertura estava desatualizado. **Não copiar código obsoleto.**
- Esta alteração apenas amplia a matriz para 900 e 1200 px e adiciona transição **1050↔1051 na mesma página inicializada**, verificando ID da etapa publicado, seleção pelo teclado, geometria, ausência de overflow e preservação do estado. O fluxo continua data-driven; nenhum nome ou quantidade fixa de etapas foi introduzido.
- O workflow `.github/workflows/development-ci-nav-boundary.yml` verifica tudo exclusivamente em fixture V5 **loopback** com ambos os engines. 8 larguras × 2 temas × 2 engines = **32 cenários**; apenas dois perfis-limiar executam a transição adjacente. Não realiza login real ou Netlify Preview.

## PR #238: gate ainda bloqueado

- PR [#238](https://github.com/EAKerber/MobiliPresenter2D/pull/238) segue aberta em head `3ccce161235df925c5b708bf6feefbe6f4b10103`. No último lote de checks desse head, os contratos, build e múltiplos browser gates estão PASS, mas [Actions #40257905366](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40257905366) teve gate autenticado **FAIL**.
- Log do job `121363626669`: `BLOCKED_AUTH_FIXTURE stage=preview-fixture-preflight errorClass=BLOCKED_AUTH_FIXTURE: Deploy Preview was built from a different commit`. Trata-se de **mismatch de identidade de deploy**, ocorrido antes das suítes autenticadas, não de uma falha de segurança demonstrada nem de sucesso do runtime autenticado.
- A validação correta é reconciliar `CI_STAGING_EXPECTED_COMMIT` com o commit do preview correto sob allowlist e confirmar novamente grants mínimos, negação de Admin, revogação, status de rotas e suites. **Não relaxar** preflight, não reusar preview antigo, não acionar deploy desnecessário, não integrar PR #238 enquanto gate estiver vermelho.

## Condição de aceitação

Somente `node --check` + build local validado + Playwright Chromium/WebKit + 32/32 testes PASS + SHA exato permitem fast-forward para `development`. Esta evidência é **de layout local**, não autenticação real nem release. Sem PR, branch deletion ou deploy.
