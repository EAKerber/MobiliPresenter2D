# CI-BASELINE-01 — Runner seguro para Deploy Preview #235

## CHECKPOINT VIGENTE — 23/10/2026

**Issue #232: OPEN / HOLD.** Atualização após duas execuções com convite, correção
da publicação e diagnósticos locais. As seções antigas abaixo são
**históricas**: referências ao segundo convite como não consumido ou à
publicação V5 como não validada já estão superadas.

| Frente | Resultado atual | Evidência |
|---|---|---|
| Acesso anônimo | PASS: /config/ → /access/, buyer API protegida | [Preflight #39985006606](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39985006606) |
| Convites autenticados | PASS: redeem 200, cookie HttpOnly+Secure, Admin negado, logout e bloqueio de replay; **dois convites consumidos e revogados** | [#39964244149](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39964244149), [#39982544942](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39982544942) |
| Buyer API no segundo convite | **FAIL**: 503 antes dos testes funcionais | [#39982544942](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39982544942) |
| Seed V5 no Deploy Preview #235 após correção | **PASS técnico de build e readback**: plugin passou a usar HEAD (branch de origem) em vez de BRANCH (branch base); marcadores públicos não sensíveis com HTTP 200 | [Deploy `6adb87a7fc8cd994e4a86c10`](https://app.netlify.com/projects/mobilipresenter2d/deploys/6adb87a7fc8cd994e4a86c10), [#39984974211](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39984974211), [#39985006606](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39985006606) |
| Buyer API autenticada **após a correção do HEAD** | **UNVERIFIED**: o preflight anônimo não substitui GET autenticado 200 | Requer novo convite somente quando os testes funcionais estiverem prontos |
| Mobile/PiP, Summary/preços, Stone/pedras | **3/5 PASS locais** com projeção V5 e assertions preservadas | [#39987226959](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39987226959) |
| Keyboard e Flow | **2/5 HOLD locais**: timeout após sequência de foco/viewport, Keyboard :165 Ctrl+ArrowRight e Flow :391 clique Módulos | [#39987226959](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39987226959); [sondagem de ações isoladas #39986124888](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39986124888) |

**Estado de branches:** `main@15e1cfb4866886649adbcd00fef9bef5e5843fda`
inalterada; [PR #235 DRAFT](https://github.com/EAKerber/MobiliPresenter2D/pull/235)
é somente fixture experimental com base `main` para habilitar preview,
**não mergear**. PRs #231/#234 continuam DRAFT; arquitetura consolidada
permanece isolada. O workflow desta branch
`ci/ci-baseline-01-auth235-only-20261023` usa Environment
`ci-auth-preview` e só consome token em commit explicitamente marcado
`[auth-fixture-run]`.

**Próxima ação:** caracterizar sequência/foco de Keyboard e Flow, manter
as assertions originais, depois preparar gate completo e **somente então**
solicitar um terceiro convite de uso único para conferir o buyer endpoint
pós-fix e a matriz autenticada. Não reutilizar o token já consumido e
não disparar deploys adicionais para atualizar documentação.

---

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
