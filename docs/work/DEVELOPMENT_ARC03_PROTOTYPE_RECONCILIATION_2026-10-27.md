# Bloco 15 — ARC-03/03B protótipo não publicado × ARC-03C publicador autorizado (27/10/2026)

## Intenção declarada mais recente e cronologia

A decisão geral do usuário é **preferir a implementação mais recente para a mesma função, considerando também a intenção declarada mais recente**. Para as páginas públicas `/`, `/about/`, `/how-it-works/`, o contrato vigente é ARC-03C: `architecture/pages/*` e `architecture/fragments/primary-header.fragment.html` são a fonte autoral; `scripts/compile-primary-pages.mjs` gera as três saídas `app/`, atualiza o manifesto de proveniência e **falha na compilação se o HTML ou manifesto estiverem desviados**. O Viewer usa cabeçalho NAV-005 próprio, fora do escopo ARC-03C.

**Fonte histórica examinada:** `architecture/arc03-primary-header-fragment-prototype-20261022@e459b9bd85c4e9c8bb96813ae6758789de75dc13`, **12 caminhos de contribuição**. O protótipo original `scripts/compile-primary-header-prototype.mjs` era isolado e não publicava páginas. A variante ARC-03B em `scripts/compile-primary-pages.mjs` foi criada em `ee277d634a314c481064390246f07518c981dfc5` às **22:44:28 UTC de 22/10/2026** e emitia apenas `artifacts/arc03b/pages`, com `status=EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED`.

A implementação **posterior** ARC-03C em `development` foi introduzida em `ff5c55c24ef42eb106e6dda6aa7698b00355270a` às **23:25:50 UTC de 22/10**, fazendo o publicador de fato gerar `app/`, mas somente após checagem estrita de source/manifest/output. Em `architecture/fragments/primary-header.routes.json`, `status=BUILD_AUTHORITATIVE_ARC03C`; o Viewer está explicitamente excluído. **O fragmento HTML em si é byte-idêntico** entre as duas versões (blob `25712fa6f2423372f076d041f9a7253ced088040`), mas rotas/fontes e as páginas mudaram; não restaurar páginas antigas.

## Matriz de decisões

| Camada | Fonte antiga | Atual | Destinação |
| --- | --- | --- | --- |
| Fragmento público HTML | Identidade de blob `25712fa6...` | Mesmo blob | **KEEP_CURRENT** |
| Compilador de fragmento isolado | `scripts/compile-primary-header-prototype.mjs`, não escreve em publicação | renderização de fragmento integrada a `scripts/compile-primary-pages.mjs` | **SUPERSEDE**: não manter duas autoridades |
| Compilador ARC-03B | Escreve somente artefatos de prova, sem integrar Netlify | ARC-03C valida drift e publica saída gerada controlada | **KEEP_NEWER**, mudança de intenção publicada |
| Teste de paridade visual antigo | Captura diferencial old app × output de staging ARC03B | ARC03C gera HTML **byte a byte idêntico** à saída `app/` revisada, e gate atual 48 cenários valida as páginas efetivamente publicadas | **KEEP_NEWER**, não comparar conteúdo antigo historicamente diferente |
| Testes negativos antigos | Header repetido, link injection, nav ativo e variantes WhatsApp, exclusão do Viewer | Compilador implementa as mesmas proteções; parte dos testes não estava explícita | **EXTRACT_GUARDS** em testes de fixture isolada sem mutar a aplicação |

## Extração seletiva e gates

Os testes `tests/arc03c-historical-prototype-guards.test.mjs` verificam o header atual, uma marcação ativa por rota, variantes ARIA, Viewer NAV-005 separado e **rejeitam em uma cópia temporária da fonte e do compilador**: injeção de href `javascript:`, duplicação de slot, inclusão de header `site-header` copiado, inclusão do header do Viewer e status de build antigo. São testes negativos *executados pelo compilador atual*; não recuperam o gerador antigo, nem modificam `app/`, schema, banco ou produção.

`tools/development_arc03_prototype_semantic_audit.py` fixa o SHA antigo e **todos os 12 caminhos**, verifica o fragmento idêntico e a mudança explícita de autoridade no arquivo de rotas; recusa candidatos fora do escopo. O workflow `.github/workflows/development-arc03-prototype-semantic.yml` executa este auditor, os testes negativos, os testes já existentes de drift da fonte, `npm run pages:check` e **48 testes de navegador** em Chromium/WebKit usando somente servidor local. A equivalência provada será a de contratos e da intenção recente; não alegar paridade visual entre versões antigas de *conteúdo*.

**Disposição inicialmente condicionada:** `SEMANTIC_SUPERSEDED_CANDIDATE`. Após gate PASS na auxiliar e development, arquivar DAG completa na tag `archive/m2d/arc03-prototype-e459b9bd -> e459b9bd85c4e9c8bb96813ae6758789de75dc13` **antes** de excluir a ref. A auxiliar `integration/15-arc03-prototype-reconcile-20261027` só pode ser removida após FF com lease e prova de ancestralidade. Manter 12 PRs, `main`, assets DS-02 e PR #34; nenhum deploy Netlify.

**Status inicial deste documento:** nova camada de testes e auditor preparada. Não afirmar gates nem remoção antes de leitura dos recibos e verificações.


## Evidência de gate na auxiliar

[Actions #40616793829](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40616793829) **PASS** no SHA de origem do workflow `7e336aef40c90377045e7de8fbeac2fb92faf1d6`, artifact `arc03-prototype-semantic-40616793829` ID `12784874943`. O auditor confirmou o escopo histórico de 12 caminhos e a precedência temporal/status do ARC-03C. Os novos testes negativos de proteção do compilador passaram em fixtures temporárias; `npm run pages:check`, testes de source authority e cutover passaram; **48 cenários de navegador Chromium/WebKit** sobre o runtime vigente também passaram. O compilador histórico não precisou ser recuperado, e os arquivos de aplicação permaneceram intactos.

Falta o gate repetido sobre `development` depois do fast-forward. A tag de recuperação e exclusão seguem condicionadas à auditoria de higiene.
