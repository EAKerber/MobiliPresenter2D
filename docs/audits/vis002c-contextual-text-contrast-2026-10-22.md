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
