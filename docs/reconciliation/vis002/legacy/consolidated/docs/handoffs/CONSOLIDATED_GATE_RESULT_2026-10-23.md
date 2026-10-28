# Resultado final — gate de consolidação ARC-03C + P-TOKEN-02B + VIS-002C

**Data:** 23/10/2026, America/Sao_Paulo. **Estado:** validação técnica do stack
consolidado **PASS**; merge/publicação **HOLD**. **Uma única branch de produto:**
[`integration/consolidated-arc03c-vis002c-token-20261023`](https://github.com/EAKerber/MobiliPresenter2D/tree/integration/consolidated-arc03c-vis002c-token-20261023).

## Estado verificável de testes

[GitHub Actions #39949036571 — SUCCESS](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39949036571),
revisão de código `ad978cd51bb3c7a548cdfbdc06c07b407b7f2199`:

| Job | Resultado | Evidência |
|---|---|---|
| `source-and-build` | **SUCCESS** | ARC-03C `--check`, `--build`, `--check` 3/3 páginas, build real Netlify, pins antigos/v0.2, `CONSOLIDATED_SOURCE_SCOPE_PASS` |
| `arc03c-header-parity` | **SUCCESS** | `ARC03C_BROWSER_PASS` 60 cenários Chromium/WebKit, `rasterCases:0`, header NAV-004, semântica e teclado |
| `context-and-raster` | **SUCCESS** | 48/48 equivalências exatas v0.1↔v0.2 nos 3 consumidores originais; 36/36 cenários VIS-002C, 72 pares; 456 observações: **424 com contraste adequado, 0 abaixo, 32 UNVERIFIED**; 12/12 pares full-page, **90.315 pixels alterados, nenhum fora das caixas dos cinco textos aprovados**; checkout íntegro após browser |

**Evidências:** [capturas NAV-004](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39949036571/artifacts/12499562432)
(SHA-256 `92a34c1a9f5ae237f520daee97dbd5cf4130f92c0b0d0c4ffbe3fa587292bf93`);
[comparações contextual e full-page](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39949036571/artifacts/12499078046)
(SHA-256 `18134c13f62a9c07974f7f2bc543ba14a2ee767a285c059ccda9ec32d7da62e2`).

O primeiro [run #39948489072](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39948489072)
falhou apenas na verificação `git diff` em contêiner sem `safe.directory`, após
os testes do navegador já aprovados. Isso foi corrigido sem alteração funcional:
`git config --global --add safe.directory "$GITHUB_WORKSPACE"` antes da
verificação de checkout. **O rerun completo (#39949036571) é o resultado conclusivo.**

## O que está efetivamente consolidado

- PR #234 ARC-03C serviu de base, mantendo `architecture/pages` como fonte
  dos 3 documentos publicados e o compilador de fragmento NAV-004.
- A distribuição da PR #231 P-TOKEN-01B/02B foi incorporada; o token v0.2
  usa `#705C4B` do DS e 8 consumidores aprovados de mapa JSON independente,
  versionado e pinado por SHA. A versão v0.1 segue imutável.
- A importação v0.2 foi introduzida nas **fontes autorais** e emitida nos HTML
  derivados; o manifesto de hash do ARC-03C confirma todos os pares.
- CSS de componente, exceções semânticas, tema escuro, Reader/Viewer NAV-005,
  auth, Config e preços estão fora de mudanças não autorizadas. Nenhum CSS global.
- Nenhuma PR nova, Deploy Preview, merge ou publicação ocorreu neste turno.

## Hold de integração

As PRs [#231](https://github.com/EAKerber/MobiliPresenter2D/pull/231) e
[#234](https://github.com/EAKerber/MobiliPresenter2D/pull/234) continuam
**DRAFT** e não tiveram seus heads reescritos. A
[issue #232](https://github.com/EAKerber/MobiliPresenter2D/issues/232) de
CI privado/autenticação permanece aberta; não desabilitar autorização nem
rotular a suíte privada como verde. O gate não mede todo o produto, dispositivos
físicos ou funcionalidade do vídeo externo.

**Próximo passo:** tratar a fixture autenticada da #232 em trabalho isolado,
reconciliar/revisar as PRs históricas antes de qualquer integração na main,
validar ambiente real somente quando for necessário um único Deploy Preview
e conservar este checkpoint como ponto de retorno seguro.
