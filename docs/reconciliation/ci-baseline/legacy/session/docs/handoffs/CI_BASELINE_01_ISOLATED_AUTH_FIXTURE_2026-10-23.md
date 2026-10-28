# CI-BASELINE-01 — fixture de acesso isolada (preparação)

**Data:** 23/10/2026. **Estado:** preparo em branch separada, NÃO CONCLUÍDO até a execução autenticada no staging. [Issue #232](https://github.com/EAKerber/MobiliPresenter2D/issues/232). Não modificar `main`, a configuração do site Netlify de produção, os dados originais nem o fluxo de autenticação.

## Diagnóstico confirmado

Os testes de Mobile, Keyboard, Flow, Summary e Stone pedem `/config/` sem sessão e terminam na rota `/access/`, corretamente protegida. O bootstrap do Configurador nunca ocorre. A ausência de `CASA_EM_MODULOS_DEBUG` não comprova regressão de layout. O gate de leitura anônima e o de comportamento real autenticado são responsabilidades distintas.

## Infraestrutura provisionada e proteção

- Site **Netlify Free dedicado, vazio e sem deploy**: [m2d-auth-ci-isolated](https://app.netlify.com/projects/m2d-auth-ci-isolated), id `d92799b1-9afc-4b52-9eee-22824bba7925`. **Não** usar o site `mobilipresenter2d`, seus previews nem seus segredos.
- Projeto Supabase isolado: **ainda não criado**. A organização conectada `Casa em Módulos` contém atualmente um projeto ativo, id `jaedzligsqazyjelpweu`, conhecido como banco atual e **explicitamente bloqueado pelo código de teste**. O plano Supabase Free permite até dois projetos ativos; selecionar a organização antes de provisionar o segundo. Não usar Branching (requer plano pago).
- Os ambientes de Netlify produção e Deploy Preview do site existente ainda têm `DATABASE_URL` e `ACCESS_GATE_SECRET` iguais; `ACCESS_PUBLIC_ORIGIN` no Preview aponta historicamente para #198. **NÃO alterar essas variáveis do site existente** para passar a issue.

## Dois gates distintos

1. `tests/ci/config-auth-anonymous-browser.mjs` — teste negativo contra o domínio original, somente leitura: pede `/config/`, exige `/access/`, verifica HTTP e ausência de workspace/debug privado; registra caminho sem query, títulos, hash SHA-256 de scripts públicos e classes de erros JS. Não lê tokens/cookies.
2. `tests/ci/config-auth-isolated-browser.mjs` — teste positivo **exclusivamente no site m2d-auth-ci-isolated**, e **somente** se variáveis, hostname, project ref diferente de `jaedz...`, usuário limitado `access_ci_fixture` e TLS estiverem corretos. Abre conexão com o DB **separado**, cria uma concessão com duração de 5 minutos para `ci-config@fixture.example` (endereço reservado, sem e-mail), usa `POST /api/access/redeem` real, conserva o cookie `__Host-config_access` HttpOnly no navegador, exige bootstrap do Configurador e negação de `/api/admin-bootstrap`, revoga sessão e grant **inclusive em finally** e confirma que a sessão revogada volta a `/access/`. Relatório de saída nunca escreve segredo, URL de banco, email pessoal ou cookies.

O teste positivo prova o fluxo real do Configurador no staging, não que a automação foi executada na produção. A suíte antiga Mobile/Keyboard/Flow/Summary/Stone **permanece com cobertura funcional pendente**; executar suas ações sob sessão autorizada, sem remover assertions nem simular login para marcar PASS. Atualizar o issue e a matriz após resultado real.

## Configuração necessária — SOMENTE ambiente isolado

1. Criar **um segundo Supabase Free** na organização confirmada, mesma região `sa-east-1` para conveniência, sem link com o projeto atual. Aplicar a migration original `netlify/access/migrations/20261012202813_temporary_access_v1.sql` **somente nesse projeto**. Verificar RLS/roles/grants.
2. Provisionar duas credenciais de login exclusivamente nesse DB: `access_service` (membro de `access_runtime`, uso do runtime Netlify) e `access_ci_fixture` (papel de testes, membro de `access_runtime`, privilégios mínimos de INSERT/SELECT/UPDATE sobre grants e sessões; sem superuser, sem schema público, sem privilégios admin). Os segredos devem ser gerados e guardados em gerenciador de credenciais, nunca no commit ou chat. Não reutilizar credenciais de produção.
3. Publicar no **novo site Netlify** somente a branch autorizada `ci/ci-baseline-01-isolated-session-fixture-20261023` (pode exigir conectar o repositório via painel; o conector atual cria projeto vazio, mas não publica seus arquivos). Variáveis do **site isolado**, não da produção: `DATABASE_URL` do papel `access_service`, `ACCESS_GATE_SECRET` aleatório próprio, `ACCESS_PUBLIC_ORIGIN=https://m2d-auth-ci-isolated.netlify.app`; escopos Functions/Runtime conforme exigido pelo gate Edge. Não é necessário Gmail para o teste: a fixture cria grants diretamente no DB isolado. A segurança de produção permanece intacta.
4. No GitHub, criar ambiente protegido `ci-auth-isolated`. Em **secrets do ambiente**, definir `CI_STAGING_DATABASE_URL` com connection URI do usuário `access_ci_fixture` do projeto **isolado**. Em **vars do ambiente**, `CI_STAGING_SUPABASE_REF` deve apontar ao novo project ref. O workflow fixa `CI_STAGING_ORIGIN` e `CI_STAGING_ISOLATION_TAG`, nunca recebe URL de produção como parâmetro.
5. Executar manualmente `CI-BASELINE-01 isolated authenticated Config` na branch isolada, **uma vez**, após conferir o destino. Testes positivos só são aceitos se `AUTHENTICATED_FIXTURE_PASS`, rotas privadas restritas, bootstrap e revogação passarem. Sem fixture, o gate termina com `BLOCKED_AUTH_FIXTURE` e CI FAIL (não há falso sucesso).

### Segurança e plano

- Supabase Free atualmente concede **dois projetos ativos**, 500 MB por projeto; não contratar upgrade, add-ons ou Branching. O segundo projeto não foi criado, logo nenhum custo adicional foi autorizado/incorrido no Supabase.
- Netlify site isolado está vazio. Nenhum Deploy Preview, release ou merge foi gerado. Publicação/CI de staging e escolha da organização para novo Supabase precisam ser confirmadas.
- Ações dos scripts são permitidas somente no banco novo. Nunca migrar/limpar/revogar grant de produção para satisfazer CI.
- O relatório JSON ignora dados pessoais, segredo do gate, concessão e cookie. Se o runner falhar após emitir grant, ele tenta revogar em `finally`; grant de cinco minutos expira mesmo no pior caso. Se a revogação falhar, reportar explicitamente `FAILED_MANUAL_REVOCATION_REQUIRED`.

## Gates pendentes para fechar a issue #232

- [ ] CI anônimo PASS, sem dados privados.
- [ ] Supabase segundo projeto Free confirmado e com papéis isolados.
- [ ] Site de staging com deploy, Functions, Edge gate, sessão e banco isolados.
- [ ] Teste positivo `AUTHENTICATED_FIXTURE_PASS` com revogação confirmada.
- [ ] Cinco fluxos Mobile/Keyboard/Flow/Summary/Stone reexecutados em ambiente autorizado, sem remover assertions.
- [ ] Revisão das PRs #231 e #234 e da branch consolidada, sem alterar `main` prematuramente.

**Não fechar a issue #232 antes dos gates positivos e da validação dos cinco fluxos.**
