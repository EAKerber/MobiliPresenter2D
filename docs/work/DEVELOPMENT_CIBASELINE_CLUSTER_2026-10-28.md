# Bloco 21 — seis branches CI-BASELINE numa família de diagnóstico (28/10/2026)

## Fonte, sem ativação de fixtures

Seis refs (SHAs fixados no manifesto):
- `ci/ci-baseline-01-config-readiness-20261022` — teste browser **não autenticado** de produção/PR-231, read-only, mas contém hosts históricos e não deve rodar como gate corrente.
- `ci/ci-baseline-01-public-projection-test-20261022` — contém 2 arquivos, e seu teste `tests/public-module-projection.test.cjs` tem blob Git **idêntico** ao atual de development; cobre allowlist, dados privados, memberships, validação negativa e materiais.
- `ci/ci-baseline-01-nav-sequence-probe-20261023` — causalidade/layout/visualização de Flow e testes de navegador com baseline congelado.
- `ci/ci-baseline-01-v5-local-diagnostics-20261023` — observabilidade local, sem credenciais mas vulnerável a divergência de fixtures.
- `ci/ci-baseline-01-isolated-session-fixture-20261023` — material antigo de autenticação; não migrar nem executar testes/staging antigos.
- `fix/ci-baseline-v5-nav-flow-clean-20261023` — patch histórico de CSS/navegação e evidência de geometria; não reaplicar no runtime.

`docs/reconciliation/ci-baseline/manifest.json` fixa os 6 SHAs e 15 blobs históricos de documentação, workflows e testes preservados sem reescrita dos bytes em `docs/reconciliation/ci-baseline/legacy/`. Não se executam os scripts históricos, workflows antigos, requisições externas ou acesso de sessão. As seis branches permanecem protegidas até a auditoria individual de aposentadoria.

## Autoridade vigente

A implementação e intenção mais recentes prevalecem. A projeção pública atual usa uma allowlist em `app/core/public-module-projection.js` e teste atualmente **byte a byte igual** ao ramo de 22/10. O arquivo `netlify/functions/buyer-configuration.mjs` e a política de identidade atuais são fixados por blob no manifesto, para bloquear a reintrodução inadvertida de antigos endpoints, testes que usam sessão real e segredos. As branches PR #238, `ci-auth-base-20261025` e OIDC ficam **fora** desta família e protegidas separadamente; não há alteração no banco.

## Cobertura ativa e decisões

O gate único de família executa quatro verificações Python de SHA, versão autoritativa, não ativação e isolamento; depois o contrato atual de projeção pública (todos os testes), endpoint público, adapters do Viewer e `pages:check`. `app/`, `netlify/`, `netlify.toml`, `package.json` e `main` não recebem diff.

Apenas `readiness` e `projection` são candidatas ao próximo lote de higiene com tags `archive/m2d/`; ambas possuem exatamente dois caminhos exclusivos na comparação com development. `nav`, `v5local`, `session`, `navfix` ficam HOLD até equivalência dos testes, guardas de autorização e mudança geométrica. A auxiliar deve ser ancestral de development antes de remover a própria ref; lote limitado a no máximo 3 alvos.
