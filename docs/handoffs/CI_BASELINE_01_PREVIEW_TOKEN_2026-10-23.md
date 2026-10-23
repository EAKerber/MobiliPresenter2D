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
