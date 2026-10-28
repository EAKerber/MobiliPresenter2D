# Bloco 17 — auditoria pública VIS-002, sem alterar CSS (27/10/2026)

## Proveniência e precedência

A fonte histórica audit/public-text-contrast-coverage-20261022@ace851004713f92b4425e5832c6c892825814f0a continha tests/public-text-contrast-coverage.mjs, blob 67f5e3556afde97f4ba7396443a583688e1d3a31. Seu teste de 22/10 presumiu #705C4B em três contextos. Isso é superado pela intenção de 24/10: texto corrido próximo do preto e mapeamento específico VIS-002C v0.3, blob e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d, com dez contextos claros #292723. O status do produto permanece SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED, não globalmente aprovado.

## Extração semântica

- tests/ci/public-text-contrast-semantic.mjs recupera a classificação de texto contrastado e fundo CSS sólido da auditoria original, em 36 cenários (3 rotas, 3 viewports, 2 temas, Chromium/WebKit).
- Preserva as amostras antigas e torna disponibilidade e assinaturas controles separados, não candidatos automáticos para recoloração.
- Lê os pares autorizados do mapa atual em vez de congelar a cor do teste antigo. Protege foreground e custom property light-only; exige fundo aprovado se houver superfície sólida confiável.
- Os demais pares são pass, candidate ou unverified, calculados com a luminância WCAG e registrados em JSON; candidatos não são falhas de CI nem aprovação para editar CSS. Gradientes, imagens e alpha não são certificados.
- O teste atual de dez contextos VIS002C continua independente. Sem mudança em app/, runtime, dark, Netlify, main ou Design System externo.

## Gates

Executar na auxiliar, inspecionar artifact e passar por fast-forward SHA-pinned para development somente após CI PASS. Repetir CI no destino. Aposentadoria da branch fonte NÃO está autorizada apenas por este resultado: ela contém também CSS experimental e documentação histórica. Exigir levantamento integral, tag de arquivo antes de exclusão, ledger das 14 ondas anteriores, 12 PRs, proteção de originais DS02 e PR #34, e gates de não regressão antes de propor poda.

## Gate observado na auxiliar e no destino

- Auxiliar: [Actions #40620317995](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40620317995), PASS; artifact 12786638891.
- Development: [Actions #40620489920](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40620489920), PASS; artifact 12787101684.
- Resultado idêntico: 36/36 cenários, 47 verificações de cores aprovadas, 423 amostras calculáveis acima do limiar, 0 candidatos abaixo, 33 não verificáveis, 0 seletores ausentes, 3/3 testes de pin e páginas estáticas válidas.
- Commit de conteúdo testado e integrado por fast-forward com lease: `f3b97ca164654dd2c1f2038a5af442324498ecf1`.
- A auxiliar 17 permanece temporariamente ativa até higiene com lease. Nenhuma das 46 históricas ou 12 PRs foi tocada. Nenhum deploy Netlify, alteração visual, auth/DB ou escrita na main.
