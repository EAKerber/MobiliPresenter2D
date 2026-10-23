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
2. 48 comparações de browser dos **três consumidores antigos** contra
   `main`, exigindo nenhuma mudança visual/material.
3. VIS-002C, 36 cenários de contraste Chromium/WebKit, temas claro/escuro,
   três larguras; assert dos pares e das assinaturas/estados preservados.
4. 12 pares full-page Chromium/WebKit 390/1366 em light; mudanças de pixel
   limitadas às caixas dos cinco textos autorizados.
5. A comparação com PR #234 e a normalização dos gates privados da issue #232
   continuam independentes. PR #231 não é alterada. Sem merge/release.

**Rollback:** reverter a nova importação, restabelecendo a versão v0.1 e
removendo cinco consumidores adicionados; os arquivos v0.1 continuam disponíveis
e não precisam de rebuild. Não remover PINs históricos.
