# Diagnóstico causal da navegação CI — main versus branch de 23/10

**Estado:** diagnóstico apenas, `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e883443696ce1c58c912ac4794ff75e` ainda HOLD, sem merge ou delete. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` é a autoridade estável. A `development` herda o mesmo blob CSS `d43e6fb5e66133d2389b5c39b165b76b13cfa868`; a branch histórica usa `eb55a9b5cb92d2e76ae70e0e41ac9fdf8b366616`, agora salvo literalmente em `docs/reconciliation/ci-v5-nav-clean/source/app/styles.css`.

A comparação constatou **uma mudança de proprietário da container query**, não apenas um ajuste cosmético. A regra `@container flow-steps (max-width: 500px)` já existia em ambos os estilos, mas no protótipo antigo o container era `.controls`; na main atual é `.flow-nav`. Por isso comparar apenas widths globais ou perfis side-rail/stacked/compact não responde se os rótulos mudaram de limiar quando `.controls` e `.flow-nav` têm larguras diferentes.

Gate criado para:
- executar `main` e CSS histórico, isoladamente, sobre o mesmo V5 publicado no servidor localhost;
- comparar 496/500/502/505/509/512/514/515/518/522 px de largura de `.controls`, em Chromium e WebKit, capturando os **20 pares** de estados, dimensão do container, modo de rótulo e SHA de screenshot da nav;
- exigir que no CSS atual a regra de 500 px siga `.flow-nav` e que a navegação não transborde; coletar, sem reprovar automaticamente, diferenças de raster e compactação entre o protótipo e a main;
- preservar o valor diagnóstico histórico, sem alegar equivalência pixel como condição necessária de aceitação da implementação mais recente.

A branch original continua HOLD até interpretação do resultado empírico; não aplicar o antigo CSS à main ou development, não abrir Netlify Preview nem executar banco/Identity. Isto é medição do V5 local, não prova de sessão externa.

## Correção de hipótese antes do navegador

- [Primeiro gate #40725316011](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40725316011) **FAIL estático, navegador SKIPPED**: o teste supunha, incorretamente, que o CSS histórico também usava `@container flow-steps (max-width: 500px)`. O CSS da branch antiga contém exatamente `@container flow-steps (max-width: 514px)`; a main usa 500 px. O comentário histórico explicita que +14px compensa 6px de padding e 1px de borda por lado da nav. A mudança histórica é **proprietário .controls + limiar 514**, comparada ao estado **proprietário .flow-nav + limiar 500** na main.
- O documento de prova e o teste estático foram corrigidos sem mudar CSS de runtime nem mascarar qualquer diferença visual. Medir as duas políticas lado a lado em V5 local. Até os resultados, a fonte histórica continua HOLD.

## Resultado do limite e ampliação para perfis/temas/estado de detalhe

- [Gate do limite #40725564223](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40725564223) **PASS**: exatos 20 pares em Chromium/WebKit, 496–522 px de controls, CSS antigo 514 px/`.controls` versus CSS moderno 500 px/`.flow-nav`, **0 divergências raster, 0 divergências de compactação**, navegação atual sem overflow. Artefato JSON `12831694922`. Isso é igualdade das capturas da navegação nesse recorte, não equivalência universal.
- Foi preservada a intenção do teste antigo: nova matriz de **56 pares** = 7 larguras (390/701/900/1050/1051/1200/1366) × 2 browsers × 2 temas × 2 estados de detalhe. Exigência de identidade da navegação moderna, sem confundir diferença de raster (se surgir) com regressão automática. O estado da branch histórica segue HOLD até relatório detalhado e gates no destino.

## Primeiro gate de matriz: sincronização da pintura e limites

- [Run #40726174428](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40726174428) estático PASS e matriz maior falhou **antes do término** no caso Chromium 1051px, light, detalhe aberto. `navContentWidth=566`, mas `font-size=0px` nos rótulos; o script lia `getComputedStyle` **antes** de `.screenshot()`. A implementação histórica de teste já observava que Playwright pode liberar invalidação de container query pendente durante a screenshot.
- Corrigido o protocolo: esperar estabilização curta, capturar a navegação e **só depois** medir o estilo e fazer a asserção de container proprietário. Não foi alterado CSS, renderizador, router ou lógica de negócio. Se o erro persistir depois da captura, manter HOLD com resultado empírico de possível bug.

## Resolução visual demonstrada e higiene X (condicional)

- A alteração histórica `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e883443696ce1c58c912ac4794ff75e` usava proprietário da container query `.controls` com **514 px compensados**; a main usa `.flow-nav` com **500 px efetivos**. O CSS antigo de exato blob `eb55a9b5cb92d2e76ae70e0e41ac9fdf8b366616` foi preservado em `docs/reconciliation/ci-v5-nav-clean/source/app/styles.css`, somando-se aos oito artefatos antigos já arquivados. Nenhum código CSS foi importado para a main.
- [Gate auxiliar completo #40726828140](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40726828140) **PASS**: **20 pares** nas transições próximas do limiar 496–522 px e **56 pares** originais (7 larguras ×2 engines ×2 temas ×2 estados de detalhe): **76/76 com hash de screenshot de `.flow-nav` idêntico**, mesma regra de compactação, sem overflow do CSS atual. Artefatos `12832764126` e `12833266629`. A falha inicial de leitura antes da captura foi corrigida com estabilização e aferição pós-pintura; não alterou o CSS. Esse resultado demonstra equivalência visual da **navegação testada**, não de toda a página ou de sessões Netlify.
- **FF SHA lease** da auxiliar `integration/30-ci-nav-css-container-causality-20261028@9e8b947ecfd4a98f3b49f5b9e18383721437b8bc` em development, [gate no destino #40727644236](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40727644236) **PASS** repetindo 20+56 pares; [gate de proveniência #40727644250](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40727644250) **PASS**. A suíte V5 corrente contém 32 casos de navegação dinâmica e é mais recente do que a hipótese fixa antiga. A `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` permanece autoridade forte.
- **Registro exigido pelo executor:** `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e883443696ce1c58c912ac4794ff75e` deve ser preservada integralmente no Git por tag `archive/m2d/legacy-ci-v5-nav-css-62c5521d` **antes de remover** a branch, mantendo todos os assets e commits do ramo; os 9 blobs centrais estão arquivados em `docs/reconciliation/ci-v5-nav-clean/source/`. A auxiliar `integration/30-ci-nav-css-container-causality-20261028@9e8b947ecfd4a98f3b49f5b9e18383721437b8bc` é ancestral da development.
- Lote one-shot `dev-20261028-ci-nav-css-visual-proof-x`: dois alvos exatos (original histórico e auxiliar ancestral), nenhum aberto em PR, ambos sem proteção. **Não declarar exclusão antes de AUDIT+APPLY PASS**. O lote não pode afetar a `main`, DS02, as 12 PRs abertas, banco, deploy ou código de runtime.
