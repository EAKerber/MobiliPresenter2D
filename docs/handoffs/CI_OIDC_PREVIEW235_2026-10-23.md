# CI-BASELINE-01 — GitHub OIDC → sessão temporária do Configurador (#235)

**Status:** gate estático [#40034055182](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40034055182) **5/5 PASS**. O endpoint foi integrado somente ao preview experimental #235 no commit `b30668d02c0c6c61a04563a300691c23741d1fb6`, [deploy `6adbe0371b10ece423bb013c`](https://app.netlify.com/projects/mobilipresenter2d/deploys/6adbe0371b10ece423bb013c) READY; sem alteração na main. O próximo run marcado explicitamente comprovará (ou recusará) a troca OIDC e a matriz real.

## Objetivo

Substituir o ciclo manual de convite descartável por identidade federada de GitHub Actions, **sem senha, supertoken estático, secret persistente nem nova conta de e-mail**. O GitHub assina um JWT de curta validade em cada execução autorizada (job com id-token: write), e o Netlify o troca **uma vez** por uma sessão comum de escopo config válida no máximo 55 minutos, gravada com hash no mesmo banco Postgres de convites. Cookies HttpOnly/Secure e revogação por logout seguem o contrato já existente.

## Limites de confiança (não ampliar sem revisão)

- Somente Netlify **Deploy Preview #235**, com context.deploy.context = deploy-preview, deploy.published = false, origem/hostname fixos. Não disponível na main/produção nem em outros previews.
- OIDC: emissor HTTPS do GitHub, assinatura RS256 validada com JWK obtida por URL fixa de GitHub, kid e algoritmo exatos; validações estritas de issuer, audience personalizada, repository + repository_id, owner_id, ref, workflow_ref, environment, sub, event e validade curta (iat/exp/nbf). Não aceitar token arbitrário, sem assinatura, de outro workflow/branch/repositório.
- Workflow autorizado SOMENTE: security/oidc-ci-preview235-v0-20261023 / .github/workflows/ci-preview-oidc.yml, no GitHub Environment ci-auth-preview. **A proteção dessa branch e Environment é parte da fronteira de segurança.** Qualquer alteração de autorização exige revisão.
- O mesmo JWT não pode abrir duas sessões: hash determinístico de uso único no token_hash com UNIQUE do banco; grant resgatado imediatamente, sessão aleatória independente; replays falham com 409.
- A sessão temporária só permite Configurador, jamais Admin ou gerenciamento de acessos. O runner exige 401/403 da API Admin e comprova logout e bloqueio de replay da sessão.
- Nenhuma publicação de dados comerciais; PR #235 conserva fixture V5 sintética apenas no getDeployStore do preview.

## Risco residual e comparação

GitHub Actions que tenha permissão de gravar/modificar a **branch exata** do workflow pode potencialmente executar código autorizado e solicitar JWT. Proteger a branch e o Environment de CI tem importância semelhante à proteção de secrets de runner. A prova de servidor ainda depende de disponibilidade do JWKS público de GitHub e do banco Postgres; em indisponibilidade falha fechada. OIDC não autoriza operações administrativas nem substitui teste separado da autenticação Netlify Identity para Admin.

## Execução sem segredo

1. Gates Node isolados na branch de preparação (sem Netlify Preview).
2. Após gate PASS, portar somente o verificador e endpoint ao preview experimental #235, produzindo **um deploy controlado** (não na main). O endpoint só responde 400 a requests vazias POST após publicação; antes disso responde 404 e nenhum JWT é pedido.
3. Disparar execução da branch de preparação com commit explícito "[oidc-preview-run]" após deploy READY, preservando a condição no workflow. Sem inputs secretos. O job pede JWT ao GitHub e troca por sessão; roda Mobile, Keyboard, Flow, Summary e Stone.
4. Exigir buyer API 200, sessão válida, cinco suites PASS, Admin negado, logout e replay negado. Persistir apenas relatório sanitizado. Ainda não tratar gates antigos de browser sem sessão como PASS; sua adaptação geral deve seguir gate independente.
5. Para desativar: retirar endpoint de futuros previews ou desabilitar o workflow/Environment. Sessões existentes expiram em 55 min e podem ser revogadas na base, se necessário.

**Ação humana prevista:** nenhuma credencial. Se o GitHub bloquear id-token: write, revisar configuração Actions/Environment pelo workflow informado; não colar JWT, cookies ou senha em chat, código, logs ou issue.
