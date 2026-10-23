# Consolidação isolada — ARC-03C + P-TOKEN-02B v0.2 + VIS-002C

**Data:** 23/10/2026. **Branch única de integração:**
`integration/consolidated-arc03c-vis002c-token-20261023`. Não é a main;
não criar PR ou Deploy Preview sem necessidade explícita. O objetivo deste
checkpoint é consolidar e validar, **não publicar**.

## Proveniência dos incrementos

| Incremento | Referência de origem | Contrato preservado |
|---|---|---|
| ARC-03C | PR produto #234 @ `8ab231761e8e0e3d9fe4b6e6eabec2e565cc27e7` | `architecture/pages` como única fonte dos três HTML públicos, header NAV-004 compartilhado, build Netlify fail-closed e Viewer NAV-005 separado |
| P-TOKEN-01B/02B | PR produto #231 @ `afb80965336083209eac93e2729de77170524ee5` | Pin imutável VIS-002 (paleta), pin contextual histórico v0.1, token CSS contextual somente nas páginas públicas |
| VIS-002C + token v0.2 | `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9850dc194f68b16fa097c6691c06b` | Oito consumidores homologados, sem cor literal concorrente nem alias global; estado funcional e assinaturas excluídos |
| Design System | `EAKerber/MobiliPresenter2D_DesignSystem@ae1be563d298ae4a6d384936cbb2d9d05ee449ae` | Valor `#705C4B` em VIS-002, mapa JSON `docs/VIS002C_CONTEXTUAL_MAPPING_V0_2_0.json` v0.2.0 com SHA e autorização separados |

## Resolução da intersecção: fonte autoral versus CSS contextual

A PR #231 modifica `app/index.html`, `app/about/index.html` e
`app/how-it-works/index.html` para importar CSS contextual; ARC-03C considera
esses HTML **artefatos derivados**, não arquivos autorais. Portanto:

1. A branch consolidada **parte da PR #234**, preservando o contrato original
   ARC-03C e o compilador estático.
2. Copia as demais mudanças da integração P-TOKEN/VIS-002C como blobs idênticos,
   sem reimplementar comportamentos ou mexer em Viewer, Admin, Config, Access.
3. Aplica a importação do CSS v0.2 **nas três fontes**
   `architecture/pages/*.page.html` e depois projeta novamente para
   `app/{index,about,how-it-works}/index.html`, usando o mesmo fragmento
   de header NAV-004 e rota atual.
4. Recalcula `architecture/generated/primary-pages.manifest.json` com
   os SHA Git blob exatos da fonte e HTML projetado, sem editar o compilador.
   Os HTML antigos da ARC-03C foram reproduzidos bit a bit antes da alteração,
   comprovando a correspondência do método de geração.
5. Mantém o `--ds-vis002-approved-support-text-light` definido somente nos
   oito seletores explícitos em `app/design-system/approved-contextual-support-text-v2.css`.
   As três folhas CSS dos componentes fazem consumo por `var()`, e a versão
   contextual v0.1 permanece disponível como registro imutável, sem importação
   ativa. A paleta de referência P-TOKEN-01B segue não ativada.

## Gate de consolidação

Workflow isolado
`.github/workflows/consolidated-arc03c-vis002c-token-gate.yml`:
- Source/build: `npm run pages:check`, mutações de arquivo/manifesto
  proibidas, build real `npm run build`, pins DS, P-TOKEN-02B e boundary de
  Viewer/Admin/Config/Access/Netlify;
- Context/browser: 48 equivalências v0.1→v0.2 nos três consumidores
  antigos, 36 cenários de contraste dos cinco novos, 12 pares full-page com
  diferenças raster somente no texto visado; iframe do YouTube é estabilizado
  **apenas no CI**, sem modificar produção;
- ARC-03C header: 60 casos do NAV-004 usando baseline imutável, Chromium/WebKit,
  verificação DOM, semântica, teclado e screenshot.
Falha em qualquer job é **HOLD de integração**, sem bypass.

## Restrições e próxima decisão

As PRs #231 e #234 continuam DRAFT na sua origem e não são substituídas
automaticamente; a consolidação evita merge paralelo desordenado. Issue
[#232](https://github.com/EAKerber/MobiliPresenter2D/issues/232) de fixture
autenticada do Configurador continua pendente, sem alteração na camada auth.
Não concluir que CI público equivale a sucesso de operações privadas.
Não ligar `--public-muted` à paleta inteira, não mudar preços, tokens globais,
Reader/Viewer NAV-005, animações ou conteúdo.
A ordem de integração, atualização de PRs e eventual Deploy Preview **devem**
ser deliberadas após todos os gates, preferencialmente um único preview para
validação final do stack consolidado.
