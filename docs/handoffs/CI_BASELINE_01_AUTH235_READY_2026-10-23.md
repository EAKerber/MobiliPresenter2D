# CI-BASELINE-01 — Runner seguro para Deploy Preview #235

**Data:** 23/10/2026. **Status:** preparado; segundo convite NÃO
solicitado nem consumido. Branch independente
`ci/ci-baseline-01-auth235-only-20261023`, sem PR e sem deploy.

A PR experimental [#235](https://github.com/EAKerber/MobiliPresenter2D/pull/235)
produziu o preview **READY**
`https://deploy-preview-235--mobilipresenter2d.netlify.app`,
deploy `6adb746eeea43034a85bb3b7`, sem erro reportado.
O Build Plugin em branch experimental cria um V5 explícito somente no
deploy store `configurator-settings/published`, com leitura de volta.
O estado READY não prova por si só que o endpoint autenticado devolve 200.

## Workflow sem desperdício de token

O script `tests/ci/config-auth-preview-runner.mjs` fixa a origem na
PR #235, e exige antes das cinco suítes:
- redirecionamento anônimo correto e resgate de convite pela Function;
- cookie seguro HttpOnly e escopo de sessão;
- GET autenticado `/api/buyer-configuration` com status **200**;
- configuração publicada com status `validated`, workspace visível
  e não inerte, em vez da mera existência do DOM;
- negado o acesso ao endpoint administrativo;
- logout e bloqueio de replay, inclusive se houver falha funcional.

O workflow `.github/workflows/ci-baseline-01-preview-token.yml` da
branch dispara no push para executar só o **preflight**, que verifica
`/access/` e exige 401/403 do buyer endpoint **sem sessão**.
Seu job autenticado só é executado por um commit explicitamente marcado
`[auth-fixture-run]`, após um segundo convite válido ter sido
cadastrado pelo usuário no secret `ci-auth-preview.CI_CONFIG_TEST_TOKEN`.
Não há `workflow_dispatch` para evitar clique acidental e consumo
prematuro do token. Nunca enviar token/cookie a logs, artefatos ou chat.

## Diagnóstico funcional independente

[Local V5 #39972527537](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39972527537)
teve **0/5 funcional PASS**, mesmo após validação do payload V5:
Mobile: console assertion linha 141; Keyboard: Ctrl+ArrowRight timeout
linha 165; Flow: etapa de módulos timeout linha 391; Summary: console
assertion linha 146; Stone: console assertion linha 251.
Amostra local sem Edge e auth: não provar equivalência com preview.
Documentar erros separados e não remover assertions.

## Delimitações

A main segue inalterada; PRs #231/#234 estão DRAFT e a PR #235 não
deve receber merge. O segundo convite deve ser criado apenas após o
preflight sem sessão PASS e confirmação de dados publicados no deploy;
o primeiro convite está consumido/revogado.
