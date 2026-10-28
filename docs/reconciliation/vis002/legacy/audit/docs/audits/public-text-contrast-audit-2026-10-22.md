# AUDIT-PUBLIC-TEXT-01 — contraste textual e cobertura contextual

**Data:** 22/10/2026, America/Sao_Paulo.
**Estado:** auditoria isolada, sem alterações visuais, sem PR, sem Netlify Preview nem merge.
**Fonte inicial:** produto main@15e1cfb; visual VIS-002 no Design System.

## Hipótese inicial
A seção final /about/ contém os parágrafos "Trouxemos para o mobiliário residencial..."
e "Porque acreditamos..." no seletor `.about-closing > p:not(.eyebrow):not(.about-closing__signature)`.
A declaração CSS vigente herda `--public-muted: #706C66` sobre
`--public-surface-soft: #F0EDE8`: aproximadamente 4,47:1, ligeiramente abaixo do alvo
de contraste 4,5:1 para texto normal.

O par `#705C4B` sobre `#F0EDE8` (5,41:1) já foi aprovado e publicado APENAS
para `.hero-description`, `.how-hero-note`, `.about-scale p:not(.eyebrow)`.
O par `#70522F` sobre `#E8E3DC` foi aprovado para `.study-band .eyebrow`.
A extensão visual para a seção final não foi homologada nem implementada.

## Reprodutibilidade e fronteiras
- Matriz: 3 páginas públicas × 3 larguras (390, 768, 1366) × light/dark × Chromium/WebKit = 36 cenários.
- Coleta seletiva de texto de leitura com `getComputedStyle` para foreground,
  ancestral mais próximo de fundo CSS sólido, tamanho/peso e contraste WCAG.
- Os casos com gradiente, imagem, alpha/translucidez, ausência de superfície sólida,
  cor não interpretada ou elemento não visível são rotulados `unverified`, não inventados.
- O gate falha apenas se não encontrar um seletor exigido, se a rota/tema for inválido
  ou se um dos quatro pares contextuais aprovados sofrer alteração.
- Novas violações de contraste geram `contrast-candidate`, **não reprovam o gate**:
  exigem decisão contextual antes de aplicação visual.
- Salva `artifacts/public-contrast-audit/report.json` como artefato do Actions.
  O produto em `app/` e o build Netlify não são modificados.
- Não cobre imagens, overlays complexos, Viewer, Admin, Configurador, estados
  interativos completos, ou todos os textos públicos. Não é certificado WCAG.

## Critério para correção
Confirmar `route + selector + tema + fundo computado + tamanho + contraste`,
revisar o par candidato contra VIS-002 e homologar explicitamente a ampliação
de escopo antes de alterar CSS. Separar correção visual de refatoração estrita.
Preservar independência das PRs de tokens #231, cabeçalho #234 e CI autenticado #232.
