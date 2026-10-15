# DS-01 — Integração da identidade homologada e tema (plano / mapa de dependências)

Status: planejamento autorizado, branch isolada. Base observada: `main@d3ab7736eafb667427d28e08c0ccb31ae0265030` (2026-10-14). Sem autorização de merge/publicação.

## Fontes homologadas

- Logos: pacote `MobiliPresenter2D_DS01_Logo_Escalas_Splash_HOM_v1.zip` na Library do projeto (homologado pelo usuário); duas matrizes RGBA geométrica/alfa iguais, derivados determinísticos; `#22211F` para light, `#F9F2E9` para dark, dourado `#AE5B09`; threshold alpha >= 10; preservar baixo alfa sem reconstrução.
- Favicon: `MobiliPresenter2D_HOM01_favicon_CM_escalas_deterministicas_v1.zip` na Library (ícone CM dentro da placa branca com sombra, 1004×1004); PNGs em múltiplos tamanhos e ICO, nunca substituir pela marca horizontal.
- Uma única marca horizontal no header, rodapé e splash; splash usa `.intro-splash .intro-mark img`, animações e textos `.intro-words` são CSS/HTML separados.
- Tokens/temas homologados em HOM-01..HOM-10: Auto→Claro→Escuro (3 estados), controle círculo/legenda responsiva, preferência explícita persistida, variação com prefers-color-scheme; 16px leitura, 14px informação funcional, 12px só metadado dispensável; foco adaptativo, marcadores secundários devem preservar hierarquia com dourado.

## Acoplamentos do código atual e limites

| Local | Autoridade presente | Acoplamento / risco | Ação mínima |
|---|---|---|---|
| `app/index.html`, `app/about/index.html`, `app/how-it-works/index.html` | `app/public-theme.css`, `app/landing/landing.css` | `.brand`, `.site-header`, `.header-cta`, nav; links relativos em subrotas; menu About sem comportamento | Logo dual-state, favicon global e menu About acessível sem alterar destinos comerciais |
| `app/index.html` splash | `#introSplash`, `.intro-mark img`, `.intro-words` | Animations e reduced-motion; largura 430px padrão / 774px paisagem | Apenas trocar imagem/seleção cromática, não tocar no timing nem no texto |
| `app/viewer/index.html`, `viewer.css` | `.viewer-brand .brand-mark` é 'C', viewer render depende da API pública v5 | Header compacto; desenhos `.technical-view` e fundos técnicos não seguem automaticamente paleta | Marca oficial no header; dark do shell sem inversão automática de desenhos |
| `app/config/index.html`, `app/styles.css` | `.brand__mark` = ▱, `html[data-layout-profile]`, `#restoreButton` | Base `/`, script bootstrap auth, cenas, posições e responsive; tema atual dark hardcoded | Marca oficial sem mexer no fluxo/autorização; tokens semânticos de tema após gate |
| `app/admin.html`, `app/admin/admin.css` | `.brand>span:first-child` = ▱, `#loginForm`, `#logoutButton` | JS compilado admin.bundle, Netlify Identity; seletores de '.brand' colidem em regra genérica | Marca sem modificar IDs, forms, autenticação ou bundle |
| `app/access/manage.html` | CSS inline e cabeçalho textual | Página protegida com formulário e JS compilado; não mexer em fluxo | Favicon compartilhado; futura adaptação do header/tema por gate próprio |
| `app/how-it-works/index.html` | favicon antigo local `assets/favicon-casa-modulos.png` | Único favicon explícito | Trocar referência com caminho absoluto único, sem apagar asset antigo por impulso |
| `netlify.toml` | `publish = "app"`; redirects e gates de autenticação | Regras de acesso podem ser afetadas por caminho novo | Assets estáticos públicos sob `app/branding/`; sem alterar redirects, tokens ou functions |
| `tests/public-cutover-contract.cjs`, `tests/public-pages-smoke.cjs`, `tests/keyboard-browser.cjs` | Gates de rotas, viewer/data, acessibilidade | Alguns exigem preview com dados reais; não usar produção como ambiente de teste | Testes de contratos locais + inspeção de browser isolado; não semear dados falsos |

## Implementação faseada

1. **DS-01A artefatos**: publicar no branch só binários necessários (não todo o ZIP), hash verificável, atributos de dimensão; logo responsive apenas versões homologadas, favicon `favicon.ico` / 32/48/192/180 para contextos apropriados.
2. **DS-01B HTML**: substituir logos provisórios em Viewer/Config/Admin, manter composição/contextual actions; `<picture>` ou CSS quando a seleção por tema estiver operacional; favicon global nos sete HTMLs.
3. **DS-01C tema**: controlador autocontido `app/core/ui-theme.js` carregado antes de CSS para definir atributo no `<html>`, validação de stored mode, `matchMedia` + change, persistência apenas explícita e cross-tab, sem acesso a APIs do produto; foco de teclado correto; CTAs unchanged.
4. **DS-01D CSS**: tokens semânticos públicos e internos com mudanças limitadas; exceções de imagem, desenhos técnicos, surfaces visuais aprovadas; regra específica > CSS global.
5. **DS-01E acessibilidade e mobile**: consertar menu About com `aria-expanded`, fechar com Escape/click outside; validação de DOM/CSS/contraste/responsive 320/390/768/1366, 200% zoom, teclado e iPad/Safari quando disponível; animações reduced-motion.
6. **DS-01F regressão/release gate**: hashes & alfa das matrizes, `node tests/public-cutover-contract.cjs`, testes Playwright locais pertinentes; revisão de diffs; preview só se aprovado e sem fixture/Blob; sem merge automático.

## Critérios de parada

- Qualquer indício de mudança em auth/DTO/Netlify Edge/gate comercial/catálogo → pausar e isolar.
- Asset com mudança geométrica/alpha/cores fora das matrizes HOM → reverter.
- Quebra estrutural/visual de header ou splash → reverter a parte afetada, manter código não publicado.
- Não editar `main`, não iniciar PR, deploy nem merge sem aceite posterior.
