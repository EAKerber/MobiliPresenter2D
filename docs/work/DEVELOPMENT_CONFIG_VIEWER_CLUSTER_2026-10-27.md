# Bloco 06 — reconciliação Configurador, preços e Viewer (27/10/2026)

## Base, método e decisão

Base exata: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, `development@9b41f8595d69ec1441bd51794d66d6edd1e1fad4`. Foram comparadas as nove branches `06-config-viewer` do inventário original contra `development`, com proveniência por SHA. Todas **divergem** do destino; isso não significa que suas funcionalidades estejam ausentes. Não transplantar HEADs antigos, schemas V3/V4 nem substituir V5. Nenhum deploy, alteração de aplicação ou escrita na main neste recorte.

## Classificação das nove fontes

| Origem exata do inventário | Comparação com development | Decisão seletiva |
|---|---|---|
| `experiment/viewer-overview-editorial-20261021@8ad1405f176e5c2263689450c361c3ae617a94db` | 7 ahead / 239 behind; viewer e teste originais diferentes | `CURRENT_EVOLVED`: Viewer atual já tem resumo/destaques/preço. Não substituir UI nem copiar teste visual antigo. |
| `feat/cp-sd-06a1-server-v5-read-migration-support@ee4ffe153ffa732ae5775089ba6876a707088498` | 16 ahead / 537 behind; endpoint `configuration.mjs` muito anterior | `RETIRED_MIGRATION`: migração one-time já encerrada na aplicação atual, teste e preflight legado não são autoridade. |
| `feat/cp-ux-04-hierarchy-layout@5d8347edb6ea247307b6fc27b424117553542f78` | 53 ahead / 753 behind; flows/layout ainda evoluíram | `CURRENT_V5_HIERARCHY`: lógica hierárquica data-driven atual é posterior, não reintroduzir estágios fixos. |
| `feat/cp-ux-05a-publication-prep@de0358134963f5ce72bdee98437922a3520ee24a` | 12 ahead / 749 behind; arquivo de publicação histórico distinto | `RETIRED_PUBLICATION_PREP`: não reativar migração v4 nem endpoint de publicação paralelo. |
| `feat/cp-ux-05a-publication-prep-v2@1872ca2a79585449df370910f18500ad5351451a` | 1 ahead / 747 behind; só documentação antiga | `DOC_HISTORY`: não substituir roadmap atual. |
| `feat/cp-ux-05a-v4-publication-prep@ba22963ad304bddb6b77d59d7340b9e085f4d9b7` | 7 ahead / 751 behind; altera admin/config V4 antigo | `RETIRED_V4`: não ressuscitar adaptação V4. |
| `feature/viewer-base-prices-global-off-20261021@82e4d09a842d830d80b0b5f19bd5370fe146d57c` | 7 ahead / 222 behind; **blobs idênticos** da projeção, normalizador V5, Viewer render, loader 0.2, teste browser e teste de save | `ALREADY_PRESENT`: usar código atual; só acrescentar testes de fronteira de rede no novo destino. |
| `fix/auth-first-login-session-reconciliation-20261021@70ed9ce49694db770c58f1e6953ab21da4593aa3` | 7 ahead / 239 behind; `admin-bootstrap-retry.mjs` e teste correspondem por blob | `ALREADY_PRESENT`: não trocar bootstrap ou papéis de Identity. |
| `fix/viewer-secondary-header-nav005-20261021@10445ad8c20ac1a415f4ba463345eda83bd7e9a6` | 9 ahead / 239 behind; HTML do Viewer e teste da branch antiga divergentes | `CURRENT_NAV005_TESTED`: estado NAV-005 já certificado no bloco 05 com 48 cenários Chromium/WebKit. Não duplicar controller ou usar HTML antigo. |

O resultado é **classificação de conteúdo/contratos**, não fechamento automático das nove refs históricas. Algumas divergências menores podem exigir auditoria posterior de assets/UX antes da poda; a retenção DAG e proveniência continuam obrigatórias. Nenhuma PR dessas nove origens foi aberta no inventário, mas isso não é autorização de exclusão.

## Autoridades atuais verificadas

1. `app/admin/admin.js`: aba `Preços`, seletor `data-viewer-base-price-publication`; alterar checkbox muda apenas o rascunho, publicar exige PUT autenticado e confirmação.
2. `app/core/administration-v5.js`: `viewerPricePublication` opcional e `enabled === true` explícito. Ausente/OFF não concede preços. Validação rejeita formas extras/erradas. `publicationSignature` distingue ON de OFF.
3. `app/core/public-module-projection.js`: 0.1 sem preço ou 0.2 com preço base por módulo **somente ON**, valor inteiro seguro positivo e módulo visível; omite regras completas, preço de serviços, ETag e draft. `forLegacyViewer` garante resposta 0.1 sem preços.
4. `netlify/functions/public-modules.mjs`: versão solicitada pelo header, não por query, sem transformar requisição do cliente em autorização. Sem read de Blob privado de production quando preview está sem publicação; fallback da preview é apenas DTO **público** 0.1 de origem primária, validado estritamente.
5. `app/viewer/public-data.js`: cliente declara versão 0.2 e pode receber 0.1; preço em 0.1 e escalares de preço inválidos em 0.2 são recusados. `scene-adapters.js` propaga exclusivamente preço base válido e `viewer.js` o formata BRL, mantendo medidas.
6. `tests/viewer-base-price-publication.test.cjs` / `tests/viewer-price-v5-save.test.cjs`: regras ON/OFF, preço de módulos, validação v5, escrita condicional e readback. `tests/viewer-base-price-browser-gate.mjs`: 16 casos Chromium/WebKit × 390/1366 × claro/escuro × ON/OFF.

**Proveniência literal, entre outras:** `public-module-projection.js@fff325e9699f806f0e4d599b05374aa7c3d2c43f`, `administration-v5.js@fce8319c7ed56d6e0e7e525742275aa2f0e25a32`, `viewer.js@17c8cca26aecfd70d154a71c6bb1ee176e2527bd`, `public-data.js@68b78120ba4be4798ff367eaa6ba840278abe6eb`, `viewer-base-price-browser-gate.mjs@770180912770ea588360884e2f1e9b780755f57e` correspondem na origem preços e no destino development. Não fazer copy/merge por mera divergência de branch.

## Teste extraído e gates

`tests/ci/viewer-price-wire-contract.test.cjs` adiciona um harness offline executando o **parser real** `app/viewer/public-data.js`, sob VM isolada e fetch em memória. Casos: OFF 0.1, ON 0.2 positivo, 0.1 forjado com preço, zero/negativo/float/string/nulo/overflow, membership/finish/visibilidade/dimensões inválidos, falha HTTP/rede e schema desconhecido. Sem fallback para catálogo static, sem credentials e sem Netlify.

`.github/workflows/development-viewer-price-gate.yml` restringe o gate à auxiliar e development, testa suites Node/projetor/endpoint offline e repete os 16 cenários browser em localhost. Usa container Playwright `v1.62.1-noble`, sem instalar browsers por download nem enviar tráfego à produção. Falha inicial do teste VM foi identificada como `instanceof Error` cruzando realms Node; a correção exige a mensagem de contrato mantendo todas as negações. Nenhum CSS/runtime foi modificado. **Somente declarar gates PASS após readback das execuções definitivas.**

## Limites e próximos gates

- Sem evidência de nova regressão no comportamento de preços no código atual, nem de necessidade de merger do histórico. Teste de contrato não comprova tráfego real autenticado, transição visual em dispositivos físicos ou publicação Netlify.
- A camada de preços e medidas está no Viewer atual. Diferenças de projeto visual remanescentes dependem de novas evidências, não de reintroduzir versões anteriores.
- Próximo cluster recomendado: `07-scene-assets`, incluindo fidelidade de vidro/laterais da PR #34 e pacote de imagens grande, com revisão de tamanho e preservação de DAG antes de qualquer poda; alternativamente gates reais do bloco 01 continuam HOLD até preview com commit correto.
