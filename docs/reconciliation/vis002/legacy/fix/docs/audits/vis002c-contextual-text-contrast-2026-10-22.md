# VIS-002C — aplicação contextual de contraste público

**Estado:** patch isolado, sem merge/PR/preview. Base produto `main@15e1cfb`.
**Autoridade:** [VIS-002C no Design System](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/blob/main/docs/VIS002_PUBLIC_TEXT_CONTRAST_APPLICATION_RULE_2026-10-22.md) — autorização do usuário para reutilizar o texto secundário homologado `#705C4B` em cinco contextos delimitados.
**Evidência:** [AUDIT-PUBLIC-TEXT-02 #39888294326](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39888294326), 36/36 Chromium/WebKit, 36 alterações light, 36 dark inalterados, 84 controles preservados; capturas comparativas.

## Patch de baixo risco
- `app/landing/landing.css`: história e descrição de ambiente; **exclui** `.feature-availability`.
- `app/about/about.css`: dois parágrafos finais e legenda da estatística; **exclui** assinatura editorial.
- `app/how-it-works/how-it-works.css`: parágrafo final; **exclui** `.finish-signature`.
- Somente tema claro, `#705C4B`, sem `--public-muted` global, sem `!important`, JS, DOM, V5, auth, preços nem Viewer.

## Proteção preventiva, sem inventar cores
1. `tests/vis002c-css-contract.test.mjs`: confirma limiar sem arredondamento, três CSS exatamente iguais ao baseline mais regras autorizadas e preservação integral das folhas globais.
2. `tests/vis002c-public-contrast.mjs`: mede o **produto real**, não um CSS injetado, nas três rotas, três larguras, claro/escuro, Chromium/WebKit; falha quando pares homologados não correspondem ao fundo, razão está abaixo do limiar, seletores desaparecem ou exceções semânticas mudam.
3. `.github/workflows/vis002c-public-contrast.yml`: gate isolado de contrato e browser, sem Netlify Preview.

O gate não recomenda nem escolhe cores. A decisão sobre papéis e consumidores precede a medição. Uma combinação não medida, composta por imagens/transparência, fica **não verificada**, jamais aprovada por inferência; estados não amostrados não têm conformidade presumida.

## Saída
Exigir CI PASS, inspeção visual das páginas inteiras, avaliação de regressões e reconciliação com PRs #231 (tokens), #234 (HTML) e issue #232 (CI autenticado) antes de permitir integração/produção. Rollback = reversão das três regras CSS e do gate de escopo, sem mexer na paleta do Design System.

## Gate do patch real (23/10)
[Run VIS-002C #39890281124 — SUCCESS](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39890281124): ambos os jobs passaram (contrato CSS e browser). CSS computado do app publicado **localmente** em 36/36 cenários, 72 verificações de pares contextualizados; 456 observações totais: 424 aprovadas por contraste, 0 abaixo do limiar e 32 não verificadas (elementos ocultos e casos excluídos do escopo). Isso não é um laudo WCAG global.

**Manutenção de longo prazo:** após o gate inaugural, a regressão automática deve funcionar em PRs para `main` e em push `main`, por mudança nas CSS ou nos próprios testes. O contrato estático exige as regras aprovadas e verifica as variáveis globais, mas não congela todo o CSS original, para permitir adições independentes; o teste navegador protege as cores computadas e os estados reais. Antes do merge, validar o diff de escopo sobre o baseline fixo.


## Gate de composição completa de página (não apenas parágrafos)

`tests/vis002c-full-page-visual.mjs` compara a rasterização **fullPage** em
Chromium e WebKit, light, 390/1366 px, nas três rotas (12 pares).
Para reconstruir o *antes* sem checkout/deploy alternativo, aplica temporariamente
as **cinco regras de foreground legado** (`#706C66`) sobre a página do patch,
faz um screenshot, remove o estilo temporário e repete no mesmo DOM com
`#705C4B`. As dimensões PNG e as caixas dos textos devem ser idênticas.
O gate exige que diferenças raster acima de 1 nível por canal estejam dentro
das caixas dos textos autorizados (margem de 5 px), com pelo menos uma diferença
real; diferenças fora das caixas implicam FAIL e inspeção de estabilidade,
não autorização para mascarar o problema.

O documento visível será inspecionado pelos 12 pares no artefato
`vis002c-full-page`. **PASS raster não equivale a homologação de todos os
elementos**, pois a matriz se restringe a essas páginas/temas/larguras.
