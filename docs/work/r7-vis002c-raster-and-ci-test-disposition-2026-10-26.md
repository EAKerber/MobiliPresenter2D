# R7 — VIS-002C v0.3 raster e triagem de testes antigos de CI

Data: 2026-10-26. Documento de reconciliação complementar a R5 e R6. Nao autoriza exclusao de branches.

## VIS-002C: teste adaptado e validado

- Branch: a11y/vis002-measured-copy-contrast-20261024; PR #241: https://github.com/EAKerber/MobiliPresenter2D/pull/241
- Head verificado: df658e20f00b95cc27328923dde08503f180da37.
- Teste novo: tests/vis002c-v03-scoped-raster.mjs, adaptado de integration/vis002c-contextual-support-v02-20261024:tests/vis002c-full-page-visual.mjs.
- Job adicionado ao workflow ja existente .github/workflows/vis002c-v03-product-pin.yml. Servidor Python local de paginas geradas; Chromium/WebKit na imagem Playwright 1.56. Nenhum Deploy Preview.
- Seletores extraidos do mapeamento versionado v0.3; 3 rotas, 2 browsers, larguras 390 e 1366 px: 12 comparacoes full-page e 40 verificacoes de seletores. Assertions de visibilidade, cor aprovada #292723, ausencia de overflow, geometria preservada e pixels modificados exclusivamente dentro das areas mapeadas.
- Metodo: modifica temporariamente a cor dos dez seletores no **mesmo DOM**, com referencia sintetica #705C4B; restaura a folha e compara capturas raster. Nao equivale a screenshot de producao historica, nao confirma estetica, nem valida os placeholders de falha de imagem.
- Gate executado: https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40356364245
- verify-pinned-consumers PASS; scoped-raster PASS; 12/12 comparacoes, 40 verificacoes, 0 pixels alterados fora das regioes autorizadas; artefato vis002c-v03-scoped-raster-40356364245.
- PR #241 continua Draft, sem merge; DS #52 permanece sem merge. Revisao visual humana e verificacao ampliada dos frames de fallback seguem pendentes.
- A equivalencia de artefatos entre DS #52 e #241 ja foi provada na R6 por SHA igual para CSS, mapping e manifest. Sem alteracao de tokens globais, dark theme ou decisions.json.

## Triagem conservadora de testes CI

**Autoridade ativa:** PR #238, ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103, ainda fora da main. Os experimentos legados abaixo nao sao aprovados para incorporacao automatica.

| Fonte antiga | Valor ainda existente | Disposicao R7 e gate |
| --- | --- | --- |
| ci/ci-baseline-01-nav-sequence-probe-20261023:tests/ci/v5-container-causality.mjs | Diagnostico causal de geometria por pequenas intervencoes CSS independentes e reversiveis; sem backend | EVIDENCIA REUTILIZAVEL. Extrair invariantes antes de promover teste. |
| ci/ci-baseline-01-nav-sequence-probe-20261023:tests/ci/nav-flow-profile-crossbrowser.mjs | Chromium/WebKit, sete larguras (390,701,900,1050,1051,1200,1366) e temas, usando V5 local sintetico | CANDIDATO A REGRESSAO. Atualizar fixture/sessao, comparar cobertura com #238 e medir custo. |
| security/oidc-ci-preview235-v0-20261023:tests/ci-preview-oidc.test.mjs | Testes de assinatura RS256 real e negacao de issuer/audience/repository/workflow/environment/event inconsistentes | EVIDENCIA HISTORICA DE AMEACAS. Nao reutilizar endpoints ou autoridade sem design OIDC explicitamente aprovado. |
| security/oidc-ci-preview235-v0-20261023:.github/workflows/ci-preview-oidc.yml | Vinculos a workflow, preview #235 e audiencia historicos | NAO REATIVAR. Guardar prova e intencao, nao a conexao operacional obsoleta. |
| ci/ci-baseline-01-published-preview-fixture-20261023 | Experimento de fixture, funcao de sessao e fronteira de preview anteriores ao #238 | HOLD SEGURANCA. Validar escopo, grant, revogacao e efeitos antes de qualquer extracao. |
| ci-auth-base-20261025 e fix/config-stage-nav-grid-track-20261025 | Commits diretamente ancestrais da PR #238, 0 caminhos presentes apenas na origem | INCORPORADAS EM PR, NAO MAIN. Esperar destino da #238. |

**Escopo da evidencia:** leitura de arvores, workflows e arquivos, sem reexecutar testes de navegacao ou OIDC legados. Divergencia historica e similaridade textual nao provam equivalencia de comportamento.

## Gates restantes / R8

1. Adaptar um subconjunto da matriz de navegacao antiga somente se identificar assertion ausente no gate atual da #238. Nao ativar infraestrutura experimental OIDC de preview antigo.
2. Revalidar visualmente comportamento e layout dos 19 frames informativos de fallback da #241 em tema escuro e larguras representativas; distinguir automacao de avaliacao humana.
3. Para CP-PUBLIC, validar contrato campo/erro/autorizador das alternativas antigas versus app/core/published-buyer-projection.js, app/access/access.js, netlify/functions/access-redeem.mjs e netlify/functions/public-modules.mjs atuais.
4. Nenhuma exclusao divergente sem prova por branch e gate explicito. A antiga ARC-03C segue em HOLD por referencia de workflow.

Nenhuma branch excluida; nenhum merge de codigo funcional; nenhum Deploy Preview criado nesta R7.
