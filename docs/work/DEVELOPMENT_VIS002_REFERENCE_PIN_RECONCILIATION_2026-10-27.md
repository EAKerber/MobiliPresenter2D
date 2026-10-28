# Bloco 16 — VIS-002: pin de referência sem ativação visual (27/10/2026)

## Decisão de precedência e fronteiras

Segundo a instrução mais recente do usuário, **preferir a implementação mais recente para uma funcionalidade equivalente, considerando a intenção declarada mais recente**. No recorte visual, isso NÃO autoriza substituir valores de CSS existentes pela paleta apenas por uma igualdade lexical. A decisão VIS-002 homologa a **paleta de referência**, não uma migração global de tokens. A regra posterior VIS-002C aprova somente **cinco novos contextos textuais claros** com `#705C4B`, preservando os três contextos antigos, tema escuro e exclusões; isto **não** autorizou uma publicação automática da branch VIS-002C.

A fonte de governança do Design System foi conferida em `EAKerber/MobiliPresenter2D_DesignSystem@main 79db735d6f05177b0c406e383d35832f3d72fdef`, documento `docs/VIS002_PUBLIC_TEXT_CONTRAST_APPLICATION_RULE_2026-10-22.md` (blob `dfd39a2b3bb2e3794bbc4d3f8a5f96602153242f`). O princípio permanece: correspondência de cor não prova papel semântico; aplicar regras contextuais somente após aferir par de contraste em ambiente real, sem algoritmo que escreva cores automaticamente.

## Fonte antiga e tratamento

Branch histórica `architecture/p-token-01b-reference-pin-20261022@854cc05896523567e503f42af2b8e209c7591b31`, **10 caminhos de contribuição**. Da origem foram copiados byte a byte:

- `design-system/pins/vis-002/v0.1.0/PIN.json`, `approved-palette-reference.css`, `approved-palette-reference.manifest.json`: snapshots pinados a `EAKerber/MobiliPresenter2D_DesignSystem@70f0eabf609b5b4391459c426d6f7ecaeac070c8`; **`REFERENCE_ONLY_NOT_LINKED`**, `activated:false`, `cssImportAllowed:false`, `componentMappingsApproved:[]`. O pin antigo é prova de distribuição imutável daquela versão, não afirma que o DS atual parou de evoluir.
- `design-system/P_TOKEN_01B_PIN_AND_CONSUMER_AUDIT_2026-10-22.md` e `design-system/audits/p-token-01b-current-css-literal-observations.json`: arquivo histórico que registrou **54 coincidências lexicais** em oito CSS em 22/10, sem mapeamento nem autorização.
- `scripts/verify-design-system-reference-pin.mjs`: verificação de 16 valores de referência e ausência de importação ou aliases `--ds-reference-*` nas oito rotas HTML e oito CSS publicados.
- `tests/design-system-computed-style-readonly-audit.mjs`: observação somente leitura, quatro rotas × duas larguras × dois temas × Chromium/WebKit = **32 cenários**.

O teste `tests/design-system-reference-pin.test.mjs` de origem exigia **54 ocorrências no CSS vivo atual**, o que seria incorreto após alterações posteriores no produto. A versão compatível mantém o pin/manifesto/origem e o **54 como fotografia imutável de 22/10**, mas **recalcula** a contagem sobre os CSS da development e relata diferenças sem inventar nova autorização. Não desabilita o gate de importação proibida. Os dois workflows isolados originais são substituídos por `.github/workflows/development-vis002-reference-pin.yml` com provas pinadas e browser local, sem disparo Netlify.

## Matriz dos outros ramos VIS-002 — status HOLD

| Ramo | Distinção | Destinação |
| --- | --- | --- |
| `architecture/p-token-02b-contextual-copy-20261022` | v0.1, regras de contexto e CSS de páginas posteriores | **HOLD**: avaliar último contrato de contextos |
| `fix/vis002c-public-text-contrast-20261022` | cinco textos aprovados, correção CSS restrita e 36 cenários; inspeção visual especial | **HOLD**: aprovação contextual não é licença de importação global |
| `integration/vis002c-p-token-02b-v2-20261023` | pin e mapeamento v0.2, oito contextos, fontes históricas de páginas | **HOLD**: v0.2 ainda não publicado |
| `integration/consolidated-arc03c-vis002c-token-20261023` | gate conjunto PASS em 23/10, mas explicitamente **merge/publicação HOLD** | **HOLD**: pode conter fonte de contexto ainda útil |
| `integration/vis002c-contextual-support-v02-20261024` | iteração de 24/10 após consolidação; intenção e risco atuais a comparar | **HOLD** |
| `audit/public-text-contrast-coverage-20261022` | auditoria read-only da cobertura; 32 cenários não avaliados na antiga proposta | **HOLD** |
| `docs/ds05a-theme-lab-20261017` | laboratório/fixtures/evidências visuais históricas únicas | **HOLD**: não descartar imagens ou homologações históricas |

## Gates antes de aposentar a fonte P-TOKEN-01B

1. `tools/development_vis002_reference_pin_audit.py` deve provar a origem SHA, os dez caminhos, os sete arquivos idênticos, a proibição de uso visual e a distinção entre snapshot 54 e valores atuais.
2. CI executa o verificador pinado, testes Node compatíveis, observação CSS real em 32 cenários no navegador, e garante ausência de aliases CSS introduzidos no produto.
3. Gate PASS na auxiliar, depois em `development` via fast-forward com lease.
4. Higiene fail-closed com SHA imutável, 12 PRs, assets visuais, main protegida e tag **criada antes da exclusão**: `archive/m2d/vis002-reference-pin-854cc058 -> 854cc05896523567e503f42af2b8e209c7591b31`; a auxiliar poderá ser retirada por ancestralidade.
5. O pin fica **não ativado**. Qualquer conexão futura à UI exige análise de consumidores/contextos e gates VIS-002C com última intenção homologada. Não efetuar deploy nem mudança em `app/`.

**Estado inicial:** arquivos e testes preparados na auxiliar, sujeita a resultados observados. Nenhuma exclusão ou aplicação visual é autorizada por este documento.


## Primeiro gate final na auxiliar

[Actions #40618136839](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40618136839) **PASS**, artifact `vis002-reference-not-activated-40618136839` ID `12785518105`. Verificador confirmou os SHA Git dos sete arquivos preservados, status de paleta `REFERENCE_ONLY_NOT_LINKED`, 16 valores, nenhum alias CSS carregado no produto e nenhuma atribuição de papéis aos componentes.

O reprocessamento da observação lexical retornou **`historicLiteralMatches:54`, `currentLiteralMatches:55`, `changedFiles:1`**, sem congelar CSS do produto de 22/10. A varredura real de estilo computado concluiu os **32 cenários** de quatro rotas, duas larguras, dois temas e Chromium/WebKit, reportando cores, tema e contornos sem aplicar o pin. Tais dados não constituem prova de conformidade universal ou licença de ativação.

A auditoria mudou de *snapshot errado como contrato* para *snapshot imutável + medição atual*, alinhando a implementação à última intenção declarada. A CI deve ser reexecutada em development antes de eventual aposentadoria histórica.
