# DS-01G — Pós-preview #204: correções focalizadas e auditoria pendente

Base de alteração: PR #204 em `work/ds01-homologated-identity-theme-20261014`; revisão visual solicitada pelo usuário. Não fazer merge sem gate renderizado.

## Correções nesta rodada
1. **Seletor de tema**: retirá-lo da grade dos headers públicos e do viewer; renderizar o controle discreto logo abaixo, alinhado à esquerda, preservando a legenda completa salvo em espaços muito restritos. `.header-actions` volta a manter apenas CTA e menu. Os toolbars do configurador/admin permanecem contextuais para não deslocar o workspace.
2. **Navegação**: uma única regra em `landing.css` para `a[aria-current="page"]`; landing marca Ambientes como sua rota, about/como-funciona já marcam a rota apropriada. O hover mantém função distinta da rota selecionada.
3. **Viewer**: `.detail-row` de Componentes/Requisitos usa superfície, texto e borda semânticos no tema escuro; `.technical-view` continua sobre folha técnica branca, não sendo invertido por CSS global.
4. **Gates**: atualizar verificação estática do contrato de UI, sem alterar autenticação, dados, previews de produção ou catálogo.

## Diagnóstico de assets — não alterar nesta rodada
- Cozinha ampliada da landing: `app/landing/assets/icons/large/cozinha.webp` (190.028 bytes no repositório); compacta: `app/landing/assets/icons/small/cozinha.webp` (24.244 bytes). A screenshot contém textura cinzenta fora da moldura. A imagem exibida hoje é **WebP**, não PNG. A causa precisa ser isolada entre pixels opacos, canal alfa, origem da arte e composição do navegador antes de aplicar antialiasing/recolor. CSS `.feature-art img` aplica `object-fit: contain` e `filter: drop-shadow(...)`, que pode afetar a aparência, mas não explica sozinho o conteúdo cinza visível. **Nenhum pixel modificado.**
- Viewer: SVGs gerados por `app/core/technical-drawings.js` com classes `.module-detail__view-shape` / `.module-detail__dimension-line`; os rótulos são SVG `text` herdando `currentColor` de `viewer.css`. A folha técnica clara é uma exceção visual aprovada; medir escala/contraste dos rótulos e dos traços reais antes de mudar cores.
- Ícones dos detalhes do viewer referem `app/viewer/assets/icon-placeholder.svg`, não PNG, e permanecem arte. Se a leitura cromática da arte falhar, auditá-la separadamente.

## Validação pendente
- Em 1366×768, 390×844 e 320 px, light/dark/auto, confirmar que CTA não quebra linha, que submenu/hover/current são distinguíveis, que controle não cobre conteúdo e que as duas seções de detalhes se adaptam.
- Conferir navegação teclado, preferências persistidas, menu About e splash/reduced-motion. Comparar com baseline da main; alguns testes CI são preexistentes ou dependem de auth/preview.
- Apenas um novo evento de PR deploy para a rodada; limpeza de deploys e política Netlify requerem ações na UI Netlify não expostas no conector.
