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

## Diagnóstico causal e resultado positivo (28/10/2026)

- Primeira execução [#40739429629](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40739429629) **FAIL** na comparação byte-a-byte do `displaySettings.stages[2].items`: a V3 padrão ordena `move-stone, tempered-glass, lighting-08`, enquanto a V5 agrupada ordena `lighting-08, move-stone, tempered-glass`. Composição de três itens idêntica; a hierarquia V5 declara Iluminação primeiro. A exigência foi corrigida para comparar membros e tratar a ordem V5 como autoridade — sem reordenar o runtime da main.
- Segunda execução [#40739634894](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40739634894) **FAIL** pela diferença de **representação** em 16 propriedades de oito seções: V3 `presentation` legada versus `component` V5 explícito. O teste passou a preservar todas as demais propriedades e exigir que cada `component` V5 seja exatamente `presentation-contract.resolveSectionComponent()` da fonte V3; não ignora diferenças arbitrárias.
- [Gate consolidado da auxiliar #40739854622](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40739854622) **PASS**. O job Node comprovou os quatro testes de DTO/segurança mais quatro testes de proveniência; o navegador confirmou o teste existente de buyer V3/V5 + erro 422/fail-closed e **8/8 perfis** de hit-target: Chromium/WebKit × 1050/1366 × light/dark, com **20 snapshots** (estágio, detalhe, scroll 1050px, transição por clique). Sem regressão geométrica, hit target ocluído ou overflow nessas observações.
- A equivalência é de **semântica pública após conversão**, não igualdade byte-a-byte de DTO, nem sessão Netlify, grant, DB ou testes de todas as larguras/dispositivos. `main` e a intenção de design corrente prevalecem.

A fonte original `ci/ci-baseline-01-v5-local-diagnostics-20261023@5ce7327a9e4c8c11483163507d29af4bb8b1312a` continua HOLD por integrar scripts sensíveis de autorização/preview que não são cobertos pelo gate local. Recomenda-se integrar apenas o novo teste e proveniência, manter a fonte antiga e remover a auxiliar **depois** do FF, dos gates de destino e do manifesto SHA-leased de aposentadoria.
