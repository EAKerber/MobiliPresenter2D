# Bloco 32 — compatibilidade real do servidor V3/V5 local e hit targets

**Escopo:** reconstruir contratos semânticos a partir de `ci/ci-baseline-01-v5-local-diagnostics-20261023@5ce7327a9e4c8c11483163507d29af4bb8b1312a`, sem executar workflows originais nem modificar o runtime.

**Autoridade:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`. Base da auxiliar: `development@5ede0670694c4b6cf5ff71da47606602997e108d`.

## Lacunas específicas encontradas

1. O arquivo histórico `tests/ci/local-buyer-config-server.mjs@678a1fc2ea9a0d50f32cb17860cc1b20f02b4adb` faz upgrade V3→V5 **antes** de inspecionar/publicar a projeção Buyer. A main atual (`1b75eb62cf41112041b1dbce753753aa415d36c8`) inspeciona a V3 original, e `published-buyer-projection.project()` suporta os dois esquemas. O teste browser existente `tests/buyer-v5-browser.cjs` compara V3 convertido em V5 e V5 nos dois caminhos, portanto **não prova sozinho** que o endpoint atual de V3 direto produz o mesmo DTO.
2. A sonda exploratória `tests/ci/config-local-visibility-probe.mjs@9aca354f3ed9641fcb268d3a515df73365135588` mediu alvo clicável, ancestors, scroll do sentinel e tempos de estabilização em 1050/1366px. Esta fonte antiga está agora preservada, byte-a-byte, em `docs/reconciliation/ci-v5local/legacy/tests/ci/config-local-visibility-probe.mjs`; o script legado **nunca é executado** pelo workflow novo. A suíte R9 vigente já garante tamanho mínimo da nav, mas não declara explicitamente cobertura de hit-test de centro e scroll da sonda antiga.

## Gate construtivo

- `tests/ci/legacy-v5local-dto-parity.test.cjs` compara `published-configuration.inspectPublishedRaw(v3)` versus `inspectPublishedRaw(upgrade(v3))`, ambos projetados como BuyerPayload. Exige identidade de stage/flow, campos públicos de display, pricing, presentation policy, e protege contra schema inválido ou metadados privados. Comparação redige apenas *caminhos* de divergência, não valores nem segredos. Caso haja diferença legítima, classificar e corrigir o **teste/contrato**, nunca forçar o código histórico sobre a main.
- `tests/ci/v5-local-hit-target-semantic.cjs` executa 8 casos de 1050/1366 × Chromium/WebKit × dois temas, seleção de módulo, estado de detalhe, scroll do sentinel quando presente, click na próxima etapa derivada dos dados, hit-test dos botões em viewport, geometria e falta de overflow. Mede snapshots sanitizados. É localhost, não autenticação.
- Manter browser já homologado `tests/buyer-v5-browser.cjs` na mesma rodada para assegurar hierarquia, preço, policy e fail-closed em V5 de publicação.
- [Workflow](../../.github/workflows/development-ci-v5local-semantic.yml) passa primeiro pelo gate Node/pins e depois pelo navegador em contêiner Playwright 1.62.1.

## Decisão até nova evidência

A branch original **permanece HOLD**. Seus componentes `config-auth-isolation.mjs` e workflows de preview envolvem host, role, grant e banco específicos, não homologados por este gate local. O teste novo não autoriza apagar a origem ou afirmar sessão autenticada real. `main`, DS02 e as 12 PRs não devem ser modificados por este bloco. Nenhum deploy Netlify, grant, chamada de DB ou edição de app é necessário.

**Próximo:** revalidar gates na auxiliar, fast-forward com lease, repetir no destino, reconciliar diferenças reveladas; se os dois testes tiverem PASS e a hipótese de origem auth continuar pendente, retirar somente auxiliar ancestral mediante gate e readback.
