# R8 — acessibilidade de imagens e lacunas de CI (2026-10-26)

Checkpoint factual complementar aos relatórios R5–R7. Não autoriza eliminação de branches.

## A. PR #241 — teste de 19 frames

Branch: a11y/vis002-measured-copy-contrast-20261024; head validada 5aebebc33bc90069a85822859692145fabb31c11. PR Draft, fora da main.

- tests/public-image-fallback-browser.mjs usa o job Playwright já existente em .github/workflows/vis002c-v03-product-pin.yml e páginas construídas localmente; sem Deploy Preview.
- São 19 frames: 1 na Landing e 18 em Como funciona. Chromium/WebKit, 390/1366 px, light/dark e duas rotas: 16 contextos, 152 avaliações.
- Verifica status, role e nome acessível, descrição alternativa, contraste >=4.5, geometria, overlay, ausência de overflow horizontal, recuperação de imagem e tab stops.
- Primeiro run https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40358287360 PASS: 152/152, mas 11/18 frames da página Como funciona são scrollable em cada combinação navegador/largura/tema.
- Pequena correção em app/core/image-fallback.js: acrescentar tabindex=0 somente em fallbacks cuja descrição exige rolagem interna; remover após restaurar imagem. Sem 19 tab stops artificiais.
- Segundo run https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40358961528 PASS: 16/16 cenários e 152/152 frames. Também validou capacidade de foco e rolagem nos 11 fallbacks e remoção do tabindex após recuperação.
- O run registrou artefato JSON vis002c-v03-scoped-raster-40358961528. Nenhuma branch foi merged por essa evidência.

Limites: o teste injeta eventos error/load no DOM, não emula todas as falhas de rede; não constitui inspeção estética humana nem homologação visual completa dos 19 frames. As 11 descrições scrollable continuam sendo ponto de atenção em dispositivos reais, mesmo agora acessíveis por teclado.

## B. CI #238 — comparação de cobertura antiga com a atual

- A branch histórica ci/ci-baseline-01-nav-sequence-probe-20261023 possui tests/ci/nav-flow-profile-crossbrowser.mjs: Chromium e WebKit, 390, 701, 900, 1050, 1051, 1200, 1366 px, ambos temas e transições de etapa/teclado.
- tests/flow-layout-browser.cjs na PR #238 já cobre 390, 1050, 1366 px e layout data-driven, mas não demonstra explicitamente o limiar 1050/1051 em WebKit. Essa é a oportunidade específica de teste a reaproveitar.
- O teste histórico pressupõe quatro etapas com IDs fixos; a interface atual tem hierarquia orientada pela publicação. Não copiar a suíte inteira ou reapresentar etapas inexistentes.
- tests/ci/v5-container-causality.mjs (mesma branch histórica) executa observações sobre intervenções CSS 1366→1050, mas imprime estados sem gate de falha para a hipótese causal. Guardar como ferramenta de diagnóstico, não tratá-lo como CI obrigatória já validada.
- A experiência antiga security/oidc-ci-preview235-v0-20261023 possui asserções negativas RS256/claims que permanecem úteis como inventário de ameaças. Não reutilizar workflow/endpoint atrelados ao preview #235 sem design de autoridade novo.
- As branches ci-auth-base-20261025 e fix/config-stage-nav-grid-track-20261025 são ancestrais diretas da PR #238, mas ela ainda não entrou na main.

## C. Próximo gate R9

Identificar os 11 frames scrollable por tipo e altura e investigar apresentação compacta; manter descrição acessível. Validar falha real de rede em amostra controlada. Executar teste concentrado de 1050/1051 no WebKit com a fixture V5 atual antes de declarar branch antiga redundante.

R8 não modifica a PR #238, contratos de login, tokens globais nem Design System. Zero exclusões e zero deploys Netlify.
