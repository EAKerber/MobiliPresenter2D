# CI-BASELINE-01 — GitHub OIDC → sessão temporária do Configurador (#235)

> **GATE INTEGRAL OIDC — 23/10/2026:** [GitHub Actions #40038071520](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40038071520) **PASS COMPLETO**, `FIVE_FLOWS_PASS`: Mobile/PiP, Keyboard, Flow, Summary/Preços, Stone **5/5 no preview real**; bootstrap V5 autenticado, `POST /api/access/session` HTTP 200, Admin 401/403, logout e bloqueio do replay **PASS**. O gate integral não usou `CI_TARGET_ONLY`. Houve falhas intermitentes nas execuções anteriores e 2/2 de diagnóstico [#40037900550](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40037900550); por isso **não converter PASS isolado em homologação geral de estabilidade** até repetição independente. Este commit documental aciona segunda execução integral sem redeploy Netlify (`[skip netlify]`). Preview #235 permanece DRAFT/HOLD, `main` intacta.


> **Gate direcionado de intermitência — 23/10/2026:** [Actions #40037900550](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40037900550) **PASS**: Summary/Preços e Stone (2/2), autenticação OIDC, Admin negado, readback de sessão e revogação comprovados. O modo `CI_TARGET_ONLY=summary,stone` tem saída explícita `TARGETED_TWO_FLOWS_PASS`, **não promove** para o gate geral. A execução anterior [#40036686930](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40036686930) teve 3/5, com inconsistências intermitentes na restauração do total e estado visual; preservamos as assertions e instrumentamos apenas diagnósticos sanitizados. Próximo gate obrigatório: **5/5 em uma execução integral**, sem `CI_TARGET_ONLY`, mantendo preview #235 em DRAFT/HOLD.


> **Roteamento e readback — 23/10/2026:** CI [#40035431301](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40035431301) provou autenticação, Buyer V5, Admin negado e logout, mas as suítes apontaram console sujo. O browser autenticado recebeu `POST /api/access/session → HTTP 404`, sem Function invocada (evidência de Netlify observability), enquanto o endpoint `access-session-status.mjs` é uma rota direta `config.path`. O `netlify.toml` continha redirecionamento forçado legado para a URL de Function que conflita com a rota moderna. Removido **somente esse rewrite** no preview #235 commit `d8056470c7d54389a8270efcb2876a9b5b0e6ccd`, [deploy `6adbe41502c0df0db387eb51`](https://app.netlify.com/projects/mobilipresenter2d/deploys/6adbe41502c0df0db387eb51) READY. [Gate isolado #40035794555](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40035794555) PASS; nova asserção exige POST session 200/authenticated true antes da matriz. O próximo run comprova o comportamento ao vivo.


> **Readback OIDC — 23/10/2026:** o primeiro teste real [#40034256795](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40034256795) confirmou o preflight (rota 400 sem JWT e buyer anônimo 401/403), mas retornou exchange 401. Diagnóstico exclusivamente booleano em [#40034577344](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40034577344): 14 verificações específicas da identidade coincidiram; somente a formatação de `sub` era diferente do valor presumido. Como o `sub` é customizável no GitHub, a autorização agora usa os identificadores assinados e os claims explícitos de workflow/ref/environment/repo; `sub` permanece obrigatório e delimitado, mas sem exigir template arbitrário. [Gate estático #40034763369](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40034763369) PASS; [preview deploy `6adbe1acd4d1a00283a91a3f`](https://app.netlify.com/projects/mobilipresenter2d/deploys/6adbe1acd4d1a00283a91a3f) READY. Próximo ciclo executa JWT real com verificação de assinatura e sessão.


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
