# Bloco 03 — reconciliação das páginas públicas e fronteira DTO (27/10/2026)

**Escopo:** reconciliar somente as seis branches do cluster `03-public-pages` do inventário original, aplicar D01–D04 e preservar o DAG divergente. O produto utiliza JS/CSS/HTML puro e ConfiguratorAdministration2D V5. Origem Git no início: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, `development@b2577f2aa4a6c7daa52122eda2464f7b0212f443`. Não escrever na main, publicar Netlify, reutilizar fixtures de produção ou modificar autorização.

## Destino de cada origem

| Origem histórica exata | Situação observada | Reconciliação |
|---|---|---|
| `experiment/public-landing-commercial-viewer@0e28f7ec8ac0298a82d00e12cd8c0aa6c7bf3371` | Protótipo de landing/viewer anterior, divergente e 478 commits atrás do snapshot do inventário; 42 caminhos relacionados a assets, composição, landing e viewer. | `HOLD_OLD_UI_PROTOTYPE`: não importar renderer, CSS, dados de catálogo nem assets em massa. O visual aprovado prevalece. |
| `work/cp-public-01-donor-staging-20261008@c81d357df3aa78c3e8f804b6334b2da35b3a75c8` | PR #175 aberta (draft), doador de páginas/ativos e teste de navegador; forte sobreposição com páginas geradas por ARC-03C. | `HOLD_PR_DONOR`: reconciliar assets exclusivos individualmente, nunca substituir a landing ou o Viewer correntes. |
| `work/cp-public-02a-public-module-projection-20261008@f0c792397036836105dcb53a45f89780e10b6348` | PR #178 draft, projetor puro `public-module-projection.js` blob `5cea0fcb2eb2ed24cc5c93026984047ab70bae4b` e testes. | `CURRENT_CONTRACT_EXTENDED`: projetor atual blob `fff325e9699f806f0e4d599b05374aa7c3d2c43f`, admite v5, estado de viewer distinto e publicação opt-in de preço. Testes 14/14 atuais; NÃO fazer merge integral de DTO 0.1 antigo. |
| `work/cp-public-02b-public-read-endpoint-20261008@44b1d6a94c06a17b73405755e03c787780e7a455` | PR #179 draft, endpoint anterior blob `3d76dabec6aeda124934e78b0d240c5390c362ff`. A versão inicial retornava 503 quando faltava Blob da própria preview. | `SEMANTIC_DELTA`: endpoint atual blob `62e80a0dee12b5b306c1ef33a4337e5d6822fe4c` (pré-correção) aceita fallback **somente da API pública** da origem principal; não acessa Blob privado da produção. A evolução requer gate de DTO e campos extras. |
| `work/cp-public-02c-integrated-preview-20261008@82d85674595280a7c878848d0d5f09df29492e92` | PR #180 draft, fixture de preview Netlify #180 e gate dependente de host antigo; 62 arquivos divergentes. | `HOLD_OBSOLETE_PREVIEW_FIXTURE`: não reativar preview/seed nem comparar output atual contra sentinel antigo; extrair apenas invariantes de projeção/consumo quando houver lacuna comprovada. |
| `work/cp-public-04a-main-flow-test-fixture-20261008@9503ad1caff406d3e3422c9d4aec25bac081132e` | Um commit sobre `tests/flow-layout-browser.cjs` blob `7fe6f086f7f747861c520f51c3cafc6ef79446c2`, base atual `840f600bbb79534bf2ddeefc882d3ea060841042`. | `HOLD_OUTDATED_FIXTURE`: o teste V5 atual é substancialmente posterior; comparar assertions em gate dedicado, não copiar a fixture anterior. |

A continuidade do bloco de navegação `05` já protege `/`, `/about/`, `/how-it-works/`, `/viewer/` com 48/48 comportamentos. O leitor de buyer V5 e a projeção de módulo estão presentes; neste recorte **não se reimplementa o schema**.

## Lacuna real confirmada por teste negativo

O endpoint `netlify/functions/public-modules.mjs` permite que uma Deploy Preview sem snapshot próprio obtenha `GET /api/public-modules` da origem principal por rede, **somente o payload público**. A função auxiliar `isPublicProjection` checava tipos básicos e a allowlist do módulo, mas não rejeitava campos extras no objeto **raiz**, `publicState` nem nos **acabamentos**. Também aceitava um DTO `PublicModulePresentation2D 0.2` retornado inesperadamente pelo upstream sem vincular essa versão à negociação do cliente.

A suíte adversarial incorporada em `app/tools/test-public-modules-endpoint.js` forjou quatro respostas da **API pública simulada**, com: campo administrativo na raiz, metadado privado em `publicState`, propriedade indevida num acabamento e corpo 0.2 precificado entregue como fallback. Nenhum segredo real ou Netlify foi consultado. [Actions #40562417734](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40562417734) **FAIL esperado:** o primeiro corpo adulterado retornou `200` em vez de `503`. Essa prova **não indica vazamento observado em produção**, somente uma validação insuficiente no caminho de confiança quando a origem devolve dados não conformes.

## Correção isolada e compatibilidade

`integration/03-public-dto-fallback-gate-20261027` foi aberta a partir da development, com diffs delimitados a:
- `app/tools/test-public-modules-endpoint.js`: quatro provas negativas no mock, sem acesso real.
- `netlify/functions/public-modules.mjs`: para fallback **somente**, valida objetos raiz, módulos, `publicState`, acabamentos e visibilidade por chave permitida; rejeita `0.2` inesperado e campos adicionais, não transforma DTO e não lê o Blob privado da produção.
- `.github/workflows/development-public-dto-fallback.yml`: gate de Node, sem deploy, com teste de projeção/price opt-in e endpoint mockado.

O caminho de produção com publicação V5 validada permanece inalterado e conserva a autorização de preço **OFF por padrão**. As versões de resposta continuam `0.1`/ `0.2` conforme permissão persistida e negociação do cliente. O fallback aceita `0.1` da origem principal (incluindo os nomes históricos de visibilidade `entities` ou `viewerEntities`, mas apenas um), sem preços. Snapshot inválido segue 503 sem fallback, PUT segue 405, query segue 400, versão inválida segue 406; não devolver erros internos.

[Actions #40562698057](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40562698057) **PASS** após correção: 14/14 testes de projeção/opt-in, mais suíte isolada de endpoint incluindo quatro tentativas adversariais. Escopo desse gate é **fixture Node local**, não execução live do Netlify nem autenticação real.

## Limites e próximos gates

- **D01:** absorver o recorte na `development` apenas após gate PASS no HEAD exato da auxiliar e repetição do gate no destino. Não aplicar diretamente à `main`.
- **D03:** PRs #175/#178/#179/#180 permanecem abertas até extração individual de evidências exclusivas e decisão de substituição; nenhuma PR ou branch divergente pode ser apagada por semelhança textual.
- **D04:** manter os seis HEADs de origem e seus SHAs até eventual preservação DAG e reconciliação final; não reaplicar snapshots de Outubro 8 nem fixtures de deploy obsoletas.
- **Próxima segurança:** cluster `02-access-dto`, checando no isolamento os códigos `401/403/503`, revogação e separação entre a configuração completa e a projeção do comprador. O gate atual não comprova o resultado de autenticação produtivo.

Nenhuma autorização para gerar Netlify Deploy Preview foi dada por este documento; não dispará-lo deliberadamente.



## Recibos e resultado do recorte (27/10/2026)

- Teste adversarial fail-before-fix: [Actions #40562417734](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40562417734) demonstrou que uma propriedade administrativa extra no DTO de origem retornava 200, embora a resposta correta seja 503. Não foi consulta ao site real.
- [Auxiliar #40563093791](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40563093791) **PASS**; [development #40563232051](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40563232051) **PASS**, [recheck #40563726945](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40563726945) **PASS**. Testes existentes de preço/projeção 14/14; quatro negativas de DTO foram acrescentadas ao harness do endpoint.
- A auxiliar `integration/03-public-dto-fallback-gate-20261027@48934bc4bc1dda0c57d1c5e50f6fe07aedd9b835` foi integrada por fast-forward na development e **excluída exclusivamente enquanto ref ancestral** via [higiene #40563727219](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40563727219), audit+apply/readback PASS, 63→62 refs. 60 HEADs históricos e 12 PRs continuam em HOLD. Nada foi implantado na main ou Netlify.
- O executor de limpeza foi desativado e não deve ser chamado novamente. O status deste recorte não permite encerrar as PRs #175/#178/#179/#180 nem reativar as fixtures de preview antigas.
