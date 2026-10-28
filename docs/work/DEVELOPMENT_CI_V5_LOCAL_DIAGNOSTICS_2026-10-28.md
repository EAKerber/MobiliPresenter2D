# Bloco 31 — CI V5 local de 23/10: recorte semântico sob autoridade da main

**Estado:** INVENTORY/PARTIAL; origem histórica em **HOLD** (não aposentada).
**Fonte:** `ci/ci-baseline-01-v5-local-diagnostics-20261023@5ce7327a9e4c8c11483163507d29af4bb8b1312a`.
**Autoridade:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`. `development` descende da main; iniciar este recorte de `development@079a83f476bb002804c2e56ad1b4158c6c6215dc`.
**Limite:** nenhuma autenticação real, DB, Netlify, CSS, app ou funções modificadas; nenhuma PR fechada nem origem deletada.

## Observações de identidade

A origem tem 30 commits à frente e 147 atrás de `main` no compare GitHub, com merge-base `8ab231761e8e0e3d9fe4b6e6eabec2e565cc27e7`; portanto **não** é uma alteração incremental segura para merge integral. A linhagem mistura diagnósticos locais, testes de autenticação isolada, cinco suites de navegador e páginas/tokens. O contrato atual da main ganha precedência.

| Superfície | Blob antigo | Estado atual | Decisão |
| --- | --- | --- | --- |
| `tests/ci/v5-local-navigation-probe.mjs` | `c6f889903e3013dffe5473fad414048975837678` | Snapshot exato preservado em `docs/reconciliation/ci-baseline/legacy/v5local/`. A suíte corrente `nav-flow-responsive-crossbrowser.cjs@8a4e200863f5d631c0799ba1501021451f07e00d` deriva as etapas do V5 e cobre 32 perfis Chromium/WebKit, com transição 1050/1051. | Intenção navegacional **substituída**; não importar passos fixos antigos. |
| `.github/workflows/ci-baseline-01-local-diagnostic.yml` | `1c04f12949b137ea6f4a98b9bdb5063e5611cedd` | Snapshot exato no mesmo arquivo histórico `legacy/v5local`; workflow antigo usa Playwright 1.56 e executa cinco suites localhost. | Preservado como histórico, **não executar** por engano. |
| `tests/ci/config-unlocked-local-diagnostic.mjs` | `0dda59980950186190b45a7a8892f90e884b338d` | Main/development: `74c3eab7ccfa6bd124e7133b04e793b94340edd3`; versão atual suporta seleção explícita por suite e reduz o relatório de falha. | Preservar novo contrato; mensagens/excertos da versão antiga exigem revisão de sanitização antes de importação. |
| `tests/ci/local-buyer-config-server.mjs` | `678a1fc2ea9a0d50f32cb17860cc1b20f02b4adb` | Main/development: `1b75eb62cf41112041b1dbce753753aa415d36c8`; versão antiga força upgrade V3→V5 antes da inspeção, atual inspeciona V3 e projeta. | **Diferença semântica real**: comparar equivalência de DTO, rotas e negativas em gate futuro; não sobrescrever main. |
| `tests/ci/config-local-visibility-probe.mjs` | `9aca354f3ed9641fcb268d3a515df73365135588` | Sonda exploratória de hit-target, scroll, ancestorChain e delays 150/1650ms; sem equivalente literal no runtime moderno. | **HOLD** até decidir se há caso geométrico novo além de R9/R10/UX04. |
| `tests/ci/config-auth-isolation.mjs` | `97c014e91ce57fcac7aa696dbaf9b4a9caa4450d` | Vincula origem, papel, host e projeto de banco de uma fixture histórica. | **HOLD segurança**; não executar/duplicar allowlists ou credenciais hardcoded. |

Os quatro workflows adicionais de autenticação/preview (anonymous, isolated-authenticated, preview-token e visibility-probe) e os browsers/runner auth da fonte exigem avaliação independente. Os dois arquivos da primeira tabela já estavam arquivados literalmente antes deste bloco. O histórico Git original permanece inteiro enquanto a branch não for aposentada.

## Evidência positiva e limites

- R9 teve PASS Chromium/WebKit 32/32 em `development` ([#40530168178](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40530168178)); R10 testou o limiar interno dos rótulos 136/136 ([#40539657812](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40539657812)); o CSS NAV diferencial completou 76/76 pares ([#40727644236](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40727644236)). Essas provas **não** substituem a autenticação Netlify/DB e não cobrem universalmente as sondas exploratórias antigas.
- PR #238 continua aberta; seu teste de identidade bloqueia corretamente quando commit da publicação diverge. D02=B admite testes isolados para integração inicial, mas **não** autoriza tratar o grant, negação de Admin, revogação ou sessão em Deploy Preview como validados pelo localhost.
- Nenhum arquivo `app/`, `netlify/`, `tests/ci/` operacional, `main` ou DS02 é alterado por este bloco. Não há justificativa para disparar novo deploy.

## Gate e continuação

O teste de proveniência associado a este documento deve verificar SHA literal da fonte e dos dois snapshots já arquivados; distinguir do código corrente por blob; impedir execução de workflows legados. Mesmo passando, é um **gate preparatório**, não uma autorização de retire.

**Próximos passos:** (1) isolar negativa/contrato da publicação V3→V5 em fixture localhost sem alterar main; (2) decidir se a sonda geométrica antiga possui hipótese nova em relação às suítes V5 atuais; (3) só após cobertura e tag integral da DAG, preparar eventual aposentadoria em manifesto novo com lease, proteção de PRs e AUDIT+APPLY. Até lá **não deletar** a fonte `5ce7327...`, branches auth relacionadas ou disparar session/grant.
