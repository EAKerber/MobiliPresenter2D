# Bloco 37 — reconciliação de PRs públicas CP-PUBLIC #175/#178/#179/#180 (28/10/2026)

**Autoridade congelada:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` tem autoridade alta e `development@bea73af76bfd6e5b638497ad000e14de611bb183` preserva trabalho mais recente ainda não estável. Roaster remoto inicial: **26 branches**, 12 PRs abertas. Operação documental/CI **offline**, sem merge de código, sem DB/Identity, sem build Netlify, sem preview novo, sem tocar em main, PRs, configs ou arquivos de runtime.

## Quatro PRs: relações de Git reais, sem falso fast-forward

| PR | Head completo | Contra main | Relação dentro do grupo | Decisão proposta |
|---|---|---|---|---|
| [#175](https://github.com/EAKerber/MobiliPresenter2D/pull/175) — donor landing/viewer | `work/cp-public-01-donor-staging-20261008@c81d357df3aa78c3e8f804b6334b2da35b3a75c8` | 31 commits à frente da base comum e 246 atrás | **diverge** de #180 (não é seu ancestral) | candidato a encerramento *por substituição funcional*, não a merge; imagens e artefatos antigos recuperáveis pela PR |
| [#178](https://github.com/EAKerber/MobiliPresenter2D/pull/178) — projetor v0.1 | `work/cp-public-02a-public-module-projection-20261008@f0c792397036836105dcb53a45f89780e10b6348` | 17 à frente e 238 atrás | **diverge** de #179 (10 commits próprios de #179 e 4 próprios de #178 após fork `f1f3a5e285c6b06fcb951b4fecb10c8917915f2f`) | candidato a encerramento após provas de paridade de campo/negação, não há justificativa para transplante do arquivo antigo |
| [#179](https://github.com/EAKerber/MobiliPresenter2D/pull/179) — endpoint HTTP allowlist | `work/cp-public-02b-public-read-endpoint-20261008@44b1d6a94c06a17b73405755e03c787780e7a455` | 23 à frente e 238 atrás | **ancestral estrito** de #180, com 24 commits posteriores na #180 | candidato a encerramento após provas do endpoint atual e fronteira de dados; não restaurar fallback do preview antigo |
| [#180](https://github.com/EAKerber/MobiliPresenter2D/pull/180) — integração isolada | `work/cp-public-02c-integrated-preview-20261008@82d85674595280a7c878848d0d5f09df29492e92` | 47 à frente e 238 atrás | contém #179, mas é **divergente** de #175 | candidato a encerramento depois de confirmar valor residual do teste de preview; **não reativar build-time seed** |

Nenhuma dessas quatro heads é ancestral da main atual. Não mudar as PRs neste bloco: **candidata a encerramento** não significa encerrada nem mergeada. As outras oito PRs abertas, inclusive #182/#184/#185/#186 de autorização, ficam intocadas. Os merges aprovados de CP-PUBLIC-04a/visual aconteceram por outros PRs; a existência de funcionalidades atuais não prova que commits dessas heads tenham sido mesclados.

## Inventário de absorção de caminhos relevantes (comparação exata de blobs contra main)

Somente caminhos do recorte `app/landing/`, `app/viewer/`, `app/core/{public-module-projection,scene-component}.js`, `netlify/functions/public-modules.mjs`, plugins temporários CP-PUBLIC, testes públicos e scripts de seed, **não o repositório inteiro**:

| Head | Caminhos recortados | Blob igual na main | Ausente da main | Existe, mas blob distinto |
|---|---:|---:|---:|---:|
| #175 | **42** | **16** | **3** | **23** |
| #178 | **2** | **0** | **0** | **2** |
| #179 | **4** | **0** | **0** | **4** |
| #180 | **51** | **17** | **7** | **27** |

Os 16 caminhos idênticos da #175 são assets de marca/ícones e `app/viewer/data.js`; a #180 também conserva exatamente `tests/public-pages-integrated.cjs` (teste de browser legado do preview 180). As dez imagens de ícones de ambientes grande/pequeno mudaram de blob na main, não foram perdidas. Ausências da #175: `app/landing/index.html`, `app/landing/como-funciona/index.html`, `app/landing/quem-somos/index.html`; **substituídas por rotas canônicas** `/`, `/how-it-works/`, `/about/` e redirects 301 declarados na main. Não repor HTML de staging em `app/landing/`.

As sete ausências da #180 são os três HTML antigos acima, mais **quatro artefatos exclusivos de preview #180**: `netlify/plugins/cp-public-02c-preview/index.js`, seu `manifest.yml`, `scripts/seed-public-preview-v5.cjs` e `tests/public-modules-http-smoke.cjs`. O plugin faz **write em getDeployStore no post-build**, somente quando confirma o host/REVIEW_ID de preview #180; apesar de sua guarda histórica, **não importar nem executar**, porque a abordagem atual evita writes/seeds e preview Netlify desnecessário. O teste de browser `tests/public-pages-integrated.cjs@28ac920d9ba6bdc0e92540d5725bd9b279154049` ainda é blob exatamente igual na main, mas **seu contrato usa um título sintético sentinela do preview #180**. A existência desse teste não comprova que a integração real atual esteja coberta/rodada; tratá-lo como legada, não gate de release atual.

## Projeção pública #178 e endpoint #179 — diferença intencional e provas

- #178 `app/core/public-module-projection.js@5cea0fcb2eb2ed24cc5c93026984047ab70bae4b` foi substituído na main e development por `fff325e9699f806f0e4d599b05374aa7c3d2c43f`. Ambos preservam a fonte `ConfiguratorAdministration2D 5.0`, `PublicModulePresentation2D 0.1`, allowlist, módulos na ordem do schema, não vazam dados privados. A versão nova acrescenta `PublicModulePresentation2D 0.2`, controle opt-in de preço, `viewerEntities` e dimensões nominais, que não podem ser regredidos.
- **Os sete nomes de teste do arquivo** `tests/public-module-projection.test.cjs` na #178, #179 e development são os mesmos. O blob de teste não é igual (novo `@6a8faec2f00e0d7cd26084a1927fb6a5d9c660c3`), porque foi adaptado à visibilidade/autoria mais recente. Rodar os testes atuais, não assumir que antigos passam sem modificação.
- #179 endpoint `netlify/functions/public-modules.mjs@3d76dabec6aeda124934e78b0d240c5390c362ff`; main `62e80a0dee12b5b306c1ef33a4337e5d6822fe4c`; development `d89b2654149d27bdb04e57e03f713b60d8a4e3b3`. **Esses dois blobs mais recentes também divergem entre si** e development contém o contrato de negociação 0.1/0.2, que preserva preço **OFF por padrão administrativo**. Não substituir a versionagem atual pelo endpoint de 08/10.
- A API moderna verifica DTO público recebido do site principal em preview com lista explícita de campos em vez de confiar dados brutos, rejeita query administrativa e métodos de escrita, e não acessa Blob produtivo em preview. Executar `node app/tools/test-public-modules-endpoint.js` com harness isolado, em memória; **não realizar GET real na produção** nesta rodada.
- O viewer atual solicita `X-Public-Modules-Version: 0.2` e aceita ambas versões (0.1 sem preço, 0.2 apenas quando policy/admin permitir), preserva fail-closed de dados inválidos. O viewer real usa versões evoluídas do adapter e layout, não blobs de 08/10.

## Evidência e limitação de encerramento

Criado gate `tests/test_development_cp_public_prs_175_180.py` + workflow de GitHub Actions para comparar **árvores completas dos commits pinados**, todos os 51 caminhos de #180, links de rotas e 7 test names, esquema público e inexistência das fixtures antigas. Executar também `node --test tests/public-module-projection.test.cjs`, `node app/tools/test-public-modules-endpoint.js` e `node --test app/viewer/scene-adapters.test.mjs` em CI do próprio repo, em `development`, **sem secrets e sem network**. Nenhum teste dessa rodada substitui Playwright remoto ou verificação de preview autenticado.

**Disposição proposta:** #175/#178/#179/#180 são candidatas a **encerramento por substituição com proveniência**, nunca a merge bruto e nunca a exclusão de branch antes de protocolo específico de fechamento com preservação do DAG. Uma decisão de fechamento precisa reconhecer a política do executor `ops/development-retirement-batch.json` que fixa 12 PRs abertas. Antes de fechar qualquer PR, adaptar e verificar um *gate explícito de transição do roster* sem relaxar regras de SHA, PR protegida, ancoragem em main ou tag original. Não fechar PR em massa nesta fase. Conservar PRs #182/#184/#185/#186 e #238 em HOLD: envolvem segurança/dados/sessões e requerem autenticação real em preview.

**Próximo passo:** após gate auxiliar e destino, persistir relatório e transitar auxiliar sem tocar main; revisar se algum teste comercial/UX das quatro PRs é exclusivo, e elaborar protocolo seguro de fechamento (PR → closed unmerged com razão, sem excluir sua head até inventário de branches atualizar; tags de cada DAG). Nenhuma alteração de produção autorizada por este documento.

## Gate offline e proposta de transição do roster

- [Gate inicial #40757206195](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40757206195) **FAIL** por teste textual de uma palavra inglesa (`archive`) ausente do relatório em português; as outras sete provas Python passaram. Sem mudança de código, a asserção foi corrigida para `proveniência`.
- [Gate corrigido #40757355428](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40757355428) **PASS**: oito testes Python sobre os quatro PRs pinados, matriz de 42/2/4/51 caminhos, DAGs reais, rotas, ausência de plugin/seed e schemas mais recentes. Executados no mesmo job, **todos PASS**: `node --test tests/public-module-projection.test.cjs`, `node app/tools/test-public-modules-endpoint.js` com endpoint/stores simulados e sem acesso externo, e `node --test app/viewer/scene-adapters.test.mjs` com cenas em memória. Os testes não autorizam merge nem certificam experiência de browser em deploy real.
- **Próximo gate antes de fechar as quatro PRs:** (1) todas as heads ainda abertas/exatas; (2) registrar proveniência por PR em tags distintas apontando aos SHAs originais; (3) adaptar controle de roster de PRs (hoje exatamente 12) e cobertura da suíte `tests/test_development_cp_public_lineage.py`, sem abrir exceções amplas; (4) encerrar PRs como *closed/unmerged*, registrando substituição pelos caminhos atuais, preferencialmente em ondas de até 3 para readback; (5) só depois aposentar suas branches através do bounded executor. O fechamento altera o inventário de PRs e **não pertence à presente onda documental**.

## Gate após fast-forward no destino

A auxiliar `integration/37-cppublic-public-prs-20261028@4f5d1193c920a9fa14a67fcab278fe381829aac5` foi integrada por fast-forward SHA-exato desde `development@bea73af76bfd6e5b638497ad000e14de611bb183`. Diff do bloco: **apenas** teste de proveniência, este relatório e novo workflow; nenhuma alteração em `app/`, `netlify/`, `design-system/`, `architecture/` ou `scripts/`. O [gate no destino #40757703942](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40757703942) **PASS** com os quatro passos (8 testes de DAG/árvore, 7 testes de allowlist atuais, harness do endpoint em memória e adapter viewer). `main` permaneceu em `221b54b2...`, sem deploy. A auxiliar agora é um ancestral de `development` e só sua ref pode ser aposentada na onda AF, sem mexer nas 12 PRs abertas.
