# Gate para largura efetiva de rótulos — CSS flow-steps 500px

**Origem histórica:** `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e883443696ce1c58c912ac4794ff75e`, arquivo `tests/ci/nav-label-width-boundary.mjs` blob `7d15daeac6a88ecd295b5393a1878d610a809d57`. O antigo teste força `.controls` às larguras 496/500/502/505/509/512/514/515/518/522 e compara raster/geom de `main` x candidata. Outro artefato legado `tests/ci/nav-css-visual-differential.mjs` blob `1b436bf6dfa5482190c570d1689a2af84ff580a1` compara CSS amplo.

**Problema metodológico encontrado:** `app/styles.css` tem blob idêntico `d43e6fb5e66133d2389b5c39b165b76b13cfa868` em `main` e `development`. Comparar os dois CSS atuais (ou screenshots gerados da mesma entrada) passaria tautologicamente. Não usar igualdade de raster como prova de funcionamento. Não importar o CSS da branch legada ou a lógica de viewport antiga.

**Extração semântica:** novo teste com os 10 valores do recorte histórico **mais sete valores de controle** 526/528/529/530/532/536/540, Chromium/WebKit e tema claro/escuro, detalhe aberto/fechado (136 observações). Mede o conteúdo real do container `.flow-nav` nomeado `flow-steps` e garante:
- `@container flow-steps (max-width: 500px)` é ativado quando a **largura efetiva** do conteúdo é <= 500px, não quando o viewport ou `.controls` arbitrariamente medem 500px.
- `.flow-step__label` reduz font-size para 0 e expõe `::after` com `data-compact-label` quando compacto; fora disso preserva rótulo principal com font-size positivo.
- Ordem e IDs de etapas são derivados de V5; geometria positiva, navegação sem overflow; 1 travessia monotônica do limiar por engine/tema/estado.
- Fixture local validada, nenhuma chamada à produção ou Netlify; testes negativos de autorização não substituídos. A igualdade main/development não é gate.

**Gates antes de absorção:** auxiliar `integration/01-ci-label500-invariant-20261027` tem apenas teste, workflow e esta proveniência. Executar no container Playwright v1.62.1-noble e repetir após fast-forward na `development`. No caso de falha, distinguir estabilização/medição do defeito efetivo; jamais mudar threshold CSS só para satisfazer a prova. Nenhum deploy, merge na main, fechamento de PR ou deleção.

## Descoberta mensurada e gates

- Tentativa inicial [Actions #40537787907](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40537787907) falhou por ausência de casos com rótulo completo: `.controls` 496–522px produzia conteúdo de `.flow-nav` entre 467–493px no Chromium, sempre abaixo do limite de 500px. **É lacuna de teste**, não defeito de CSS.
- Amostra ampliada com as sete larguras extras: [Actions #40538094294](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40538094294) **PASS 136/136**. Em Chromium, a transição ocorreu entre `.controls` 529px (conteúdo 500px, compacto) e 530px (conteúdo 501px, completo); no WebKit, entre `.controls` 514px (conteúdo 500px, compacto) e 515px (conteúdo 501px, completo). Em ambos os casos a regra usa o limite exato do **conteúdo interno**, comprovado em 2 temas × 2 estados.
- O limiar do **painel externo** não é universal entre engines. Portanto, um teste rígido em `.controls=500px` daria falsa confiança e um threshold fixo para cada navegador seria uma implementação indevida. Preservar somente a semântica interna do `@container flow-steps`.
- O workflow só altera a descrição do passo para 136; script e CSS permanecem idênticos ao PASS acima. Novo teste em auxiliar e teste após fast-forward na `development` continuam obrigatórios antes do fechamento.
