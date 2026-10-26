# R6 — Equivalência material e destinação por conteúdo (26/10/2026)

**Tipo:** auditoria de conteúdo e contratos. **Sem autorização de exclusão de branches divergentes.**  
**Heads observadas:** produto `main@7f4ec1c836f58751577f48d12c3f7b1301feda20`; Design System `main@6b5bc4c889cf441e71305b4dfe76692fe9d66ba1`.  
**Continuidade:** [R5](r5-divergent-branch-reconciliation.md). Este documento adiciona prova por árvore/blob e casos de teste que R5 não cobria. Não substitui o manifesto operacional de lote limitado.

## Critério de prova

1. **Ancestralidade Git:** somente se `compare BASE...HEAD` tiver `behind=0`; só prova inclusão de commits na HEAD comparada, não publicação na main.
2. **Identidade de blob:** SHA Git igual no caminho comparado prova conteúdo byte a byte idêntico naquele arquivo.
3. **Cobertura por caminho:** caminho antigo inexistente na versão nova indica trabalho a auditar, **não** funcionalidade ausente; renomeações e substituições requerem provas adicionais.
4. **Subset documental:** todas as linhas não vazias antigas presentes na nova versão é indício de documentação cumulativa; não resolve alterações semânticas, duplicações ou contexto.
5. **Compatibilidade operacional:** exige testes/inspeção de contratos (DTO, falha, segurança, pixel) antes da aposentadoria de código divergente. Uma PR que diz "supersedida" não substitui este gate.

## A. CI-BASELINE-01 — auditoria por árvores de commit

**Referência ativa:** PR produto [#238](https://github.com/EAKerber/MobiliPresenter2D/pull/238), `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103` (aberta, ainda fora de main). Comparadas as árvores Git completas, sem truncamento (PR #238: 869 entradas; `main`: 858).

| Origem | Comparação frente à PR #238 | Destino provisório |
| --- | --- | --- |
| `ci-auth-base-20261025` | Ancestral direto da #238; **0 caminhos presentes só na origem**; 9 blobs diferem da #238 (mudanças posteriores em scripts/workflows/testes) | HOLD como referência, descartar ref somente depois do destino da #238 |
| `fix/config-stage-nav-grid-track-20261025` | Ancestral direto da #238; **0 caminhos presentes só na origem**; 6 blobs divergem devido à evolução posterior | Incorporação na #238 confirmada por commits; depende da #238 |
| `ci/ci-baseline-01-nav-sequence-probe-20261023` | 44 caminhos presentes na origem e ausentes da #238; inclui `tests/ci/v5-container-causality.mjs` e `tests/ci/nav-flow-profile-crossbrowser.mjs` | **EXTRAIR VALOR DOS TESTES** antes de encerrar |
| `ci/ci-baseline-01-published-preview-fixture-20261023` | 46 caminhos de origem ausentes da #238; `netlify/access/github-oidc-ci.mjs`, `netlify/functions/ci-config-session.mjs` e provas de fixture anteriores | **REVISÃO DE SEGURANÇA**, não migrar endpoint experimental automaticamente |
| `ci/ci-global-auth-boundary-repair-20261023` | 47 caminhos de origem ausentes da #238; workflow antigo `ci-global-access-boundary-isolated.yml`, testes e artefatos visuais/tokens históricos | **SEPARAR DOMÍNIOS**, preservar até classificação por arquivo |
| `security/oidc-ci-preview235-v0-20261023` | 50 caminhos de origem ausentes da #238; teste `tests/ci-preview-oidc.test.mjs` cobre verificação RS256/claims, workflow pinado a preview #235 | **EXPERIMENTO OIDC ISOLADO**, avaliar cobertura de segurança sem reaproveitar confiança de preview antigo |
| Outras alternativas CI de 23/10 | 31–46 caminhos exclusivos em comparação ao par `main + #238`, entre eles gates VIS-002/P-TOKEN, fixtures e diagnósticos | Quebrar por responsabilidade, não excluir por família/prefixo |

A #238 usa fixture controlada, grants limitados e testes autenticados do Config. O antigo experimento OIDC, com audiência e preview de 23/10 fixados, **não é o mesmo contrato**. A presença dos testes OIDC exclusivos constitui valor de referência para um futuro contrato OIDC, não motivo para substituir automaticamente a solução ativa.

**Gate CI-R6:** analisar `v5-container-causality.mjs`, `nav-flow-profile-crossbrowser.mjs` e asserções OIDC como *testes* independentes antes de qualquer descarte. Não importar funções experimentais de sessão, workflows amplos ou tokens de visual de modo oportunista. Priorizar decisão da #238/#232 e atualizar a comparação após mudança de head.

## B. VIS-002C — prova de artefato e cobertura visual

**Autoridade DS:** PR [#52](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/52) `2f11ecf8948c779706a0ce0795e088d29633fb7e`.  
**Consumidor produto:** PR [#241](https://github.com/EAKerber/MobiliPresenter2D/pull/241) `d0fa2874468e913bef9bbab0d4d8c29c444154c4`.

| Artefato | SHA idêntico DS #52 ↔ produto #241? | Git blob |
| --- | --- | --- |
| CSS contextual v0.3 (10 seletores) | **SIM** | `9e7f243039a717d02f897d7320a4c383856f8fa0` |
| Mapeamento `VIS002C_CONTEXTUAL_MAPPING_V0_3_0.json` | **SIM** | `e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d` |
| Manifesto `vis002c-long-copy-light-v0.3.0.manifest.json` | **SIM** | `7389f7d4ba87b772c43a53836fc336b61a61acb7` |

Pin de produto: `design-system/pins/vis-002/context-v0.3.0/PIN.json`; seu verificador exige commit, hashes e mapeamento de 10 seletores. A variável é restrita a texto corrido do tema claro, papel `#292723`, sem tornar a cor global nem modificar tema escuro ou `decisions.json`.

**DS histórico:** `architecture/p-token-02b-contextual-copy-20261022` tem todos os blobs de arquivos executáveis presentes **com SHA idêntico à main/PR #52**. Os únicos dois caminhos com blobs distintos do estado atual são `README.md` e `docs/ROADMAP_AND_CURRENT_STAGE_2026-10-21.md`; as linhas não vazias da origem estão contidas nas versões de main, que receberam complementos posteriores. `architecture/p-token-01-executable-palette-20261022` também não possui alteração exclusiva de código: difere em três documentos (README, roadmap e documento P_TOKEN_01), com linhas antigas contidas nas versões da main. **Forte candidatura a aposentadoria após gate explícito de equivalência de conteúdo**, mas não são ancestrais Git da main; o executor atual deliberadamente só aceita ancestralidade e **não pode apagá-las** sem revisão do contrato de segurança.

**Testes históricos úteis para a #241** (não portar sem adaptação):
- `integration/vis002c-contextual-support-v02-20261024:tests/vis002c-full-page-visual.mjs`: 2 navegadores × 2 larguras × 3 rotas; diferencia pixels dentro/fora das regiões autorizadas e reconstrói cores legadas no mesmo DOM. **Precisa atualizar `#705C4B` → `#292723`, conjuntos de seletores e baselines reais, sem mascarar regressões.**
- `integration/vis002c-contextual-support-v02-20261024:tests/vis002c-public-contrast.mjs`: matriz de contrastes e fundos por Chromium/WebKit, larguras e temas; ancora valores anteriores v0.2. **Retarget necessário.**
- `integration/vis002c-contextual-support-v02-20261024:tests/vis002c-original-three-equivalence.mjs`: 48 cenários de equivalência entre v0.1/v0.2; permanece evidência **histórica**, não gate direto para v0.3.

**Gate VIS-R6:** artefatos DS e produto já têm proveniência idêntica. Falta revalidar visualmente a **head atual da #241**, inclusive fallback de 19 imagens informativas, sem depender apenas de checks de CSS/pin. O preview recente está desabilitado por preferência operacional; pode-se aproveitar os testes diferenciais antigos e/ou o caminho visual homologado, sem fazer deploy desnecessário. Ordem: DS #52 → consumidor #241 → avaliar #231 e ramificações v0.2.

## C. CP-PUBLIC — amostra de equivalência de contrato

Comparação de arquivos históricos da branch `work/cp-public-02b-public-read-endpoint-20261008` com `main`:

| Arquivo | Cobertura de linhas antigas em subsequência ordenada da main | Mudança de contrato detectada |
| --- | --- | --- |
| `app/core/public-module-projection.js` | **111/118 linhas (94,1%)** | `publicState.entities` antigo → `publicState.viewerEntities` no contrato atual; dimensões nominais explícitas; publicação condicional de preços de base |
| `netlify/functions/public-modules.mjs` | **47/52 linhas (90,4%)** | Versões DTO 0.1/0.2, validação de allowlist e fallback **somente para projeção já pública** quando um Deploy Preview não tem snapshot próprio |

As porcentagens são apenas similaridade textual **não** métricas de equivalência funcional. Para o fallback, `app/tools/test-public-modules-endpoint.js` **já testa** que o preview não lê Blob de produção, busca a projeção pública HTTPS e valida comportamentos de versão/preço. Ainda é necessário preservar distinção entre *snapshot ausente* (fallback controlado) e *snapshot inválido* (erro fechado); não tratar essa evolução como regressão demonstrada.

**Arquivos legados com substitutos diferentes, não equivalentes por nome:**

| Legado (branch 08/10) | Implementação presente na main | Prova existente / trabalho restante |
| --- | --- | --- |
| `app/core/authorized-bootstrap.js` (#184) | Fluxo atual de bootstrap e acesso distribuído, sem esse caminho | Exigir confronto 401/403/503, indisponibilidade de UI, fallback e restauração antes de afirmar equivalência |
| `app/core/buyer-configuration-projection.js` (#185) | `app/core/published-buyer-projection.js` e `netlify/functions/buyer-configuration.mjs` | Contrato legado `BuyerConfiguration2D 0.1` vs. atual `BuyerConfiguratorPayload 1.0`; `app/tools/test-published-buyer-projection.js` verifica allowlist, ausência de revisão/pricing internos, schemas e erros; mapear campos específicos ainda não equiparados |
| `app/access/redeem.js` (#186) | `app/access/access.js` + `netlify/functions/access-redeem.mjs` | Mudança de fluxo e fronteira cliente/servidor; verificar grant único, cookie, invalidação, replay e limites antes de aceitar substituição |
| `app/core/public-module-projection.js` (#178/#179/#180) | Mesmo caminho, mas blob evoluído e preços de base sob publicação opt-in | Matriz de campos e compatibilidade consumidor v0.1/v0.2, evitar divulgação de preço sem autorização |

**Gate CP-R6:** comparar *campos, erros e invariantes* contra os testes de V5 atuais; a simples existência de endpoints novos não autoriza descartar DTO, bootstrap, sessão ou segurança antigos. PRs #175, #178–#186 permanecem DRAFT/HOLD e devem ser resolvidas como família de dependências, não em merges isolados.

## Classificação operacional após R6

| Classe | Referências | Próximo gate |
| --- | --- | --- |
| **Preservar ativa** | Produto #238, #241, #231; DS #52 | Decisão e validação de integração; heads podem mudar |
| **Incorporada em PR ativa, não na main** | `ci-auth-base-20261025`, `fix/config-stage-nav-grid-track-20261025`, `fix/focus-ring-about-approved-vis002-20261024` | Reavaliar após merge da PR dependente |
| **Equivalência de artefato comprovada, não de release** | DS #52 ↔ produto #241 (CSS/mapa/manifesto) | Gate visual completo e revisão de integração |
| **Conteúdo histórico provavelmente absorvido, Git divergente** | DS antigas branches P-TOKEN-01 e P-TOKEN-02B | Gate explícito de aposentadoria sem afrouxar regra de ancestralidade |
| **Testes/infraestrutura históricos com arquivos únicos** | CI probes/OIDC, VIS v0.2 raster e contraste | Extrair ou justificar descarte por arquivo |
| **Contratos diferentes, hold de segurança** | CP-PUBLIC #175–#186 | Matriz de campos/erros/autoridades antes de qualquer exclusão |

### R7 — próximo ciclo

1. **VIS:** experimentar o reaproveitamento parametrizado do teste de raster v0.2 para o consumidor #241 em isolamento, sem substituição de token homologado ou deploy indiscriminado.
2. **CI:** classificar os testes causais de navegação e asserções do experimento OIDC em `reutilizável como gate` / `evidência histórica` / `obsoleto`. A #238 permanece autoridade ativa.
3. **CP:** produzir tabela de contratos `campo + erro + autorizador + cenário negativo` por runtime legado e atual; a integração deve preservar os critérios homologados e falhar fechado.
4. **Manutenção de branches:** decisões de encerramento só após o conteúdo ser incorporado ou registrado duravelmente e o lote ser validado; não estabelecer alvo numérico. `architecture/arc03c-static-page-build-20261022` permanece em HOLD devido a gatilho do workflow que não pôde ser alterado.

**Operações R6:** zero exclusões, zero merges de código de produto, zero alterações de tokens globais, zero deploys. O documento adiciona evidência; não muda manifests de exclusão nem pipelines.
