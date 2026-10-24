# P-TOKEN-01B — distribuição versionada DS→produto (não ativada)

**Data:** 2026-10-22. **Estado:** preparado em **branch isolada do produto**, não faz parte da `main` nem da publicação Netlify. **Sem alteração visual.**
**Base do produto:** `EAKerber/MobiliPresenter2D@840a0cda361b3ce215fc934badc26df72dffc6e8`.
**Fonte efetiva:** `EAKerber/MobiliPresenter2D_DesignSystem@70f0eabf609b5b4391459c426d6f7ecaeac070c8` (PR DS [#49](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/49) MERGED), `VIS-002.approvedPalette`.
**Branch:** `architecture/p-token-01b-reference-pin-20261022` (não unificar com `architecture/p-comp-01-public-menu-20261021`).

## Escopo

- Artefatos gerados pela fonte DS, copiados **byte a byte** para `design-system/pins/vis-002/v0.1.0/`: CSS de referência, manifesto e `PIN.json` contendo commits, versão, caminhos e hashes Git blob de origem.
- `scripts/verify-design-system-reference-pin.mjs`: confere SHA do blob de CSS/manifesto, identidade/versão/escopo VIS-002, 16 entradas `--ds-reference-*` e **ausência de links ou uso desses aliases nas oito rotas HTML e folhas CSS**.
- `tests/design-system-reference-pin.test.mjs`: testa integridade e inventário de correspondências; `.github/workflows/p-token-01b-reference-pin-gate.yml` roda exclusivamente nesta branch, em Node 22, **sem navegador nem Deploy Preview**, e reprova diferenças em `app/`, `netlify.toml` ou `package.json`.
- `design-system/audits/p-token-01b-current-css-literal-observations.json`: comparação *lexical* de 14 cores de referência contra oito CSS atuais. **54 ocorrências brutas** em várias folhas, incluindo **0** em `viewer.css`; essas coincidências NÃO são equivalência semântica, nem tokens globais, nem autorização para mudanças.

## Fronteira mais importante

`VIS-002` homologa uma **paleta de referência**, não o mapeamento global de UI; seu campo `implementationAuthorized` permanece `false`. Exemplo real:

| Declaração atual do produto | Valor atual | Cor de referência candidata | Consequência |
|---|---|---|---|
| `--public-bg` claro | `#F7F5F2` | `canvas.light=#E8E3DC` | **Diferente**, aplicar seria redesign |
| `--public-surface` claro | `#FFFFFF` | `surface.light=#F0EDE8` | **Diferente** |
| `--public-text` claro | `#22211F` | `textPrimary.light=#292723` | **Diferente** |
| `--public-bg` escuro | `#111210` | `canvas.dark=#171614` | **Diferente** |
| Foco do controle de tema | `3px/offset2` | `4px/offset3` | Mudança visual intencional; **não** refatorar silenciosamente |

Portanto **não** importar `approved-palette-reference.css` no `app/`, não renomear CSS existente por equivalência aparente, não mapear estados semânticos/contextuais globais, não ampliar paleta cobre sem revisão. A existência do pacote versionado é uma conquista de infraestrutura DS→produto, não prova que a interface adotou a paleta.

## Gate de saída deste incremento

1. Pin do Design System em commit imutável e blobs exatos, com teste em CI.
2. CSS gerado e manifesto idênticos aos da DS, permanecendo fora de `publish="app"`.
3. `app/`, config do Netlify e build npm **sem diferenças** contra a `main`.
4. Mapa lexical registrado como candidato, sem promover nenhum valor visual.
5. Nenhum PR do produto foi aberto nesta etapa para **não gerar Deploy Preview** automaticamente; merge/release continuam HOLD.

## Próximo trabalho (P-TOKEN-02)

Mapear por componente/rota/tema/estado as propriedades CSS efetivas e quais correspondem às cores homologadas, produzir evidência visual de comportamento e contraste, classificar `same-value-safe` vs `approved-but-different` vs `not-approved`, e escolher uma primeira substituição **sem mudança visual**. Patches de correção visual (cores/outline) deverão ser aprovados/inspecionados separadamente.

**Rollback:** descartar a branch (nenhuma alteração publicada) ou reverter apenas os arquivos fora de `app/`. Nenhum dado, preço, autenticação, cena ou publicação foi modificado.
