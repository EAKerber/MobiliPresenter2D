# CI-BASELINE-01 — teste de convite no Deploy Preview existente

**Estado:** adaptação autorizada em 23/10/2026, com banco Supabase atual e preview da PR #234 já pronto. Não há novo deploy, nem merge na main. Não declarar PASS até o teste autenticado ser executado.

## Autorização e origem

- O usuário informou que cadastrou CI_CONFIG_TEST_TOKEN no Environment do GitHub ci-auth-preview. O valor não está disponível nem deve constar neste repositório, issue ou logs.
- A PR #234 já tem Netlify preview READY no deploy 6adab05d4044efc65ed6660b, origem https://deploy-preview-234--mobilipresenter2d.netlify.app. Todas as requisições do teste positivo são restritas a essa origem literal.
- A concessão de uso único foi emitida pelo fluxo administrativo já existente e pode ser resgatada no mesmo projeto Supabase de desenvolvimento. A fixture usa somente o token temporário: não recebe DATABASE_URL, credenciais de administração ou permissões de alteração do banco.

## Gate técnico

1. Workflow .github/workflows/ci-baseline-01-preview-token.yml: preflight verifica sintaxe dos cinco testes e disponibilidade da tela /access/ no preview sem ler o segredo.
2. O job autenticado exige o Environment ci-auth-preview e dispatch manual ou um push explicitamente marcado [auth-fixture-run]; não executa a cada commit comum.
3. tests/ci/config-auth-preview-runner.mjs valida acesso anônimo restrito, resgata o token real via POST /api/access/redeem, verifica cookie HttpOnly + Secure, abre /config/ e exige bootstrap. Confere que o endpoint de Admin nega acesso.
4. A sessão é armazenada somente em arquivo temporário privado no runner e disponibilizada aos cinco testes existentes via Playwright storageState; não se removem suas asserções.
5. Ao término, inclusive diante de falha, o runner chama POST /api/access/session/logout e confirma que /config/ voltou a /access/. Os arquivos de sessão são destruídos e só um relatório sem segredo é publicado como artefato.
6. Os cinco testes são executados com URL /config/ do preview e a mesma sessão: Mobile, Keyboard, Flow, Summary, Stone. Relatam PASS/FAIL individualmente; as falhas não são mascaradas por skips.

## Custos, limites e condições

- Nenhum novo Netlify Preview precisa ser gerado: utilizar o da PR #234, já pronto. Os testes de navegador ainda consomem algum bandwidth ao baixar os recursos públicos do preview; executar uma única rodada com esse token.
- O convite expira em três horas e só pode ser resgatado uma vez. Evitar repetir o job autenticado no mesmo segredo após consumo. Em caso de token expirado, requer convite novo, sem enviar o token em chat.
- A autenticação de usuário temporário não autoriza Admin e não prova o envio de e-mail (o convite foi emitido separadamente).
- Mesmo com testes de preview verdes, as PRs #231 e #234 continuam DRAFT e o merge/publicação da branch consolidada continuam HOLD até validação dos gates globais pertinentes.

## Disparo controlado — 23/10/2026

[Preflight #39964154219](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39964154219) concluiu SUCCESS; o job autenticado foi SKIPPED por falta proposital do marcador one-shot. O commit seguinte é explicitamente autorizado para consumir CI_CONFIG_TEST_TOKEN **uma única vez** no preview #234; não reexecutar o job autenticado automaticamente após consumo. Registro sem valor de segredo.


## Conclusão do primeiro convite autenticado — 23/10/2026

- [Actions #39964154219](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39964154219): preflight PASS, job autenticado propositalmente SKIPPED.
- [Actions #39964244149](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39964244149): convite CI_CONFIG_TEST_TOKEN de uso único foi resgatado com sucesso; cookie HttpOnly+Secure, autorização de /config/, privação de /api/admin-bootstrap, logout e bloqueio de replay **PASS**. O script da primeira rodada marcou DOM bootstrap por presença de window.CASA_EM_MODULOS_DEBUG e .workspace; isso NÃO assegura workspace visível. Os cinco testes completos Mobile/Keyboard/Flow/Summary/Stone falharam. Run total FAIL, sem afirmar conformidade funcional.
- Netlify Observability registrou cinco respostas HTTP **503** de `/api/buyer-configuration` no Deploy Preview #234 durante os cinco testes (13:49–13:51 UTC). A Function autentica a sessão, mas obtém a configuração publicada em `getDeployStore({name:'configurator-settings'})`; se ausente/inválida/inacessível, retorna 503. `app/app.js` implementa fail-closed explícito: `data-published-configuration-status='invalid'`, `.workspace.hidden=true`, `.workspace.inert=true`, `display:none`. As respostas registradas comprovam a falha do endpoint, não isolam ainda se o blob está ausente, inválido ou indisponível.
- [Actions #39965348022](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39965348022): suíte no localhost sem Function terminou 0/5; nesta configuração o próprio fail-closed oculta a workspace, logo os erros dos cinco testes **não comprovam regressões independentes**.
- [Actions #39966694037](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39966694037): inspeção de DOM confirmou `.workspace` com `display:none` e `hidden=true` nos perfis stacked e side-rail; descendentes de navegação medem 0x0.
- [Actions #39967772548](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39967772548): diagnóstico com servidor **exclusivamente local** projetando dados a partir de `createDefaultAdministration` do próprio repositório, sem publicar nada, avançou as cinco suítes para asserções posteriores (Mobile linha 141, Keyboard 165, Flow 391, Summary 146, Stone 251). Ainda 0/5 PASS: há outras incompatibilidades de console/navegação/expectativas que requerem investigação por tipo, sem suavizar os asserts. Esta fixture não substitui dado publicado no Netlify.
- O runner foi atualizado para exigir, **antes de iniciar as cinco suítes**, HTTP 200 de `/api/buyer-configuration`, status de publicação `validated` e `.workspace` realmente visível/interativa. Se falhar, aborta as suítes e revoga o acesso no finally; não confunde mero DOM bootstrap com UI funcional.

### Estado e próximo gate

**CI-BASELINE-01 AUTH PASS / BUYER PUBLISHED CONFIG BLOCKED / FUNCTIONAL SUITES HOLD.** Para testar as páginas no preview será necessário preparar **configuração publicada válida no Blob Store desse deploy**, com proveniência aprovada e sem converter fallback em publicação silenciosa. Alternativamente, decidir testar o baseline no domínio atual que já possua publicação válida (não equivale a homologar o stack consolidado). Não contornar o fail-closed. O convite foi consumido e a sessão revogada; **não repetir o workflow autenticado com o mesmo token**. Preparar a configuração/target antes de solicitar um novo convite.
