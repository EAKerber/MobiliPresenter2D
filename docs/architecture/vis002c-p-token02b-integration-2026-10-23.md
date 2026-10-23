# VIS-002C × P-TOKEN-02B — reconciliação pinada v0.2.0

**Data:** 23/10/2026. **Estado inicial:** branch isolada, não mergeada, sem PR nem Netlify Preview.
**Base:** PR #231 `afb80965336083209eac93e2729de77170524ee5`, que não será reescrita.
**Documentos do Design System:** `VIS-002.approvedPalette` continua responsável pelo valor e `docs/VIS002C_CONTEXTUAL_MAPPING_V0_2_0.json` versiona a lista de consumidores, autorizado pela decisão VIS-002C.

## Objetivo

Evitar a duplicação entre cinco declarações CSS de cor literal inseridas no
VIS-002C e o token `--ds-vis002-approved-support-text-light` gerado na PR
#231. A distribuição v0.1 deve permanecer imutável (3 consumidores existentes).
A distribuição v0.2 usa o **mesmo token**, agora resolvido apenas para oito
seletores autorizados nas três páginas públicas, sem globalizar a paleta.

## Arquitetura da distribuição

- **Valor:** `#705C4B`, extraído da referência `VIS-002.approvedPalette.colors.textSecondary.light`,
  verificada contra o manifesto da paleta P-TOKEN-01B (hash original de
  `decisions.json` `63b60f8...`, sem alterar `decisions.json`).
- **Contextos:** cópia byte-identical do arquivo DS
  `docs/VIS002C_CONTEXTUAL_MAPPING_V0_2_0.json`, validada por SHA de Git blob,
  com os 3 seletores anteriores mais 5 VIS-002C, incluindo fundo e autorização.
- **Pin:** `design-system/pins/vis-002/context-v0.2.0/PIN.json` com os hashes
  do mapeamento, CSS gerado e manifesto. V0.1 fica intocada, mas suas importações
  HTML são substituídas por uma única importação v0.2 em cada rota.
- **CSS:** `app/design-system/approved-contextual-support-text-v2.css`
  define apenas o custom property sob seletores de tema claro; não define
  diretamente `color`. Os componentes continuam donos do uso
  `color: var(--ds-vis002-approved-support-text-light)`, inclusive nos cinco
  casos novos. Nenhum valor novo/duplicado e nenhuma atribuição `:root`.
- **Integridade:** `scripts/verify-vis002-contextual-token-v2.mjs` projeta
  deterministicamente o CSS a partir do mapa e valida o valor da paleta, as
  associações, os SHA e exclusões do Viewer/Config/Admin/Access. O script original
  passa a chamar o verificador v0.2, mantendo o nome da CLI.

## Gates (isolados, sem Netlify Preview)
1. JS syntax, pin v0.1 preservado, hashes v0.2, escopo de roteamento e CSS,
   teste Node para contrato e integridade, escopo de arquivos do diff.
2. 48 comparações **v0.1 versus v0.2 no mesmo DOM** para os três consumidores antigos, com alternância de stylesheet, CSS computado integral, raster byte a byte e round-trip idênticos. O gate original P-TOKEN-02B contra `main` continua documentado no seu próprio run; não repetir capturas de páginas independentes com animação de intro não sincronizada.
3. VIS-002C, 36 cenários de contraste Chromium/WebKit, temas claro/escuro,
   três larguras; assert dos pares e das assinaturas/estados preservados.
4. 12 pares full-page Chromium/WebKit 390/1366 em light; mudanças de pixel
   limitadas às caixas dos cinco textos autorizados.
5. A comparação com PR #234 e a normalização dos gates privados da issue #232
   continuam independentes. PR #231 não é alterada. Sem merge/release.

**Rollback:** reverter a nova importação, restabelecendo a versão v0.1 e
removendo cinco consumidores adicionados; os arquivos v0.1 continuam disponíveis
e não precisam de rebuild. Não remover PINs históricos.

## Diagnóstico de primeira integração

[Run #39893006948](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39893006948) parou em dois testes herdados que eram inadequados para um incremento autorizado: `design-system-reference-pin.test.mjs` comparava inventário lexical histórico (54 ocorrências sobre `main@840a0cd`) com o CSS atual, que já contém consumidores gerados; o teste passou a ler arquivos do commit de origem `audit.sourceCommit` via `git show`, sem alterar o inventário. Já o teste P-TOKEN original capturava duas cargas independentes de Landing e falhou por animação de entrada num raster do hero em viewport 1366, mesmo com CSS computado idêntico. Para a integração foi adicionado um teste mais direto e rigoroso: alternar v0.1 e v0.2 na **mesma** página, exigindo 48/48 casos byte-idênticos e CSS computado idêntico, preservando as provas já obtidas de P-TOKEN-02B sobre a main na sua branch anterior. A correção não remove verificação de cores nem permite diferenças de raster.

## Gate full-page — iframe de YouTube estabilizado apenas no teste

O primeiro run combinado [#39893771170](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39893771170) confirmou **48/48 comparações byte-idênticas** dos três consumidores v0.1/v0.2 e **36/36 cenários de contraste** (424 aprovadas, 0 abaixo, 32 não verificadas). O gate fullPage falhou em `/how-it-works/` a 1366 px porque a miniatura do iframe `www.youtube-nocookie.com/embed/...` carregou depois da captura baseline: uma imagem mostrava o vídeo preto, a outra a miniatura carregada. Havia 147.913 pixels de mudança **dentro do iframe**, fora dos textos autorizados. Evidência visual dos PNGs, não mudança de estilo do produto.

Reprodução ajustada: o teste intercepta **somente** `https://www.youtube-nocookie.com/embed/**` e entrega um HTML remoto determinístico com fundo preto **somente no navegador CI**, preservando o `iframe` original no DOM, dimensões e fluxo. Nenhum HTML, JS ou player publicado é alterado; nenhuma alteração fora do alvo vira tolerável. O gate continuará exigindo ZERO diferenças fora das caixas dos cinco textos. Isso valida contraste e escopo; teste funcional do vídeo permanece responsabilidade de outro gate.
