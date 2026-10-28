# Bloco 35 — reconciliação da tríade VIS-002C / ARC-03C (28/10/2026)

**Controle inicial:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` é autoridade estável; `development@b0d6f676f0cc0189b4a0430922ec00c5bda4f7c6` é o destino da documentação e dos gates. Há 30 branches remotas, 12 PRs abertas. Todos os arquivos de runtime estão intocados nesta rodada. **Não executar scripts v0.2 obsoletos contra a aplicação atual.**

## Três fontes originais, examinadas juntas, sem merge bruto

| Fonte | SHA exato | Exclusividade | Veredito |
|---|---|---|---|
| `integration/vis002c-p-token-02b-v2-20261023` | `34a305c1ddb9850dc194f68b16fa097c6691c06b` | **5 commits próprios após a PR #231**, 19 paths relativos à PR: CSS contextual, 8 consumidores, pins, testes de equivalência/contraste | **v0.2 substituída no produto**, manter história completa via tag; jamais tratar como ancestral de PR |
| `integration/consolidated-arc03c-vis002c-token-20261023` | `c239012c126c9b3e2c477778ea4b2d37b74c963f` | 5 commits próprios após `8ab231761e`; mistura ARC-03C (fontes/manifest/output), CSS/pins v0.2 e testes históricos | arquivar DAG completa após gate, sem mesclar HTML anterior à correção de imagem/menu |
| `integration/vis002c-contextual-support-v02-20261024` | `a285a2dc6f543f33f45615ba653a296236f8b3ac` | 2 commits próprios após `main@5ccb2a8dde6dd16e136f03387dc833aab828c5cf`; ARC-03C sincronizado, v0.2 e verificadores/testes | arquivar DAG completa após gate, sem promover CSS/markup antigo |

A fonte do token diverge das outras duas; as duas fontes ARC-03C divergem entre si. **Nenhuma é ancestral redundante de PR aberta, nem ancestral da main atual.** A aposentadoria proposta é por **arquivo integral da DAG e equivalência de intenção delimitada**, não por merge/direção de ancestralidade. Não há PR aberta apontando para essas três heads. Tags propostas: `archive/m2d/vis002c-v02-token-34a305c1`, `archive/m2d/vis002c-arc03c-c239012c`, `archive/m2d/vis002c-support-a285a2dc`. Tags devem apontar ao SHA original — não tags anotadas intermediárias sem readback.

## Resultado da comparação de consumidores de cor

As três sources compartilham **exatamente** o CSS v0.2 `app/design-system/approved-contextual-support-text-v2.css@39591876eb0a563553214dcd64062258c7eb35c0` e a distribuição v0.2 `contextual-mapping.json@717b400da8d5590a03118e4ce58f07fcbababc48`; também o `PIN.json@b157e15fed3eb097eb147784bc31cc275c27d49a`.

O mapeamento v0.2 contém **8 pares exatos (rota, seletor, fundo)**, papel `textSecondary.light`, `#705C4B`, e apenas tema claro. O v0.3 na main e development contém os mesmos **8 pares mais 2 contextos novos**, papel `textPrimary.light`, `#292723`, light-only, autorizações 24/10 e restrição a fundo sólido. Tokens são diferentes intencionalmente. A cor antiga não é fallback nem deve reaparecer em runtime só para reduzir divergências. A diferença é **mudança de intenção posterior homologada**, não equivalência pixel a pixel e nem um juízo sobre liberar produção.

### ARC-03C: fonte autoral, manifestos e HTML gerado

- Tanto consolidated quanto support contêm `architecture/pages/{root,about,how-it-works}.page.html`, `architecture/generated/primary-pages.manifest.json` e os respectivos outputs `app/index.html`, `app/about/index.html`, `app/how-it-works/index.html`. O compilador é o **mesmo blob** da main: `scripts/compile-primary-pages.mjs@0ce09d056e8c59a8703c12ed6b1e2ca6e1eb8023`. As duas branches têm os **mesmos blobs de fragmento e rotas de header** da main. A terceira source (token) é anterior à adoção da árvore ARC-03C, de propósito.
- Os três manifests de ARC-03C históricos declaram **os três pares SHA reais fonte/output** em seus próprios commits, com mesmo esquema `M2DARC03CPublishedPages/1`. O teste novo valida cada SHA e a substituição literal do único slot do cabeçalho, a partir da rota correta; se falhar, a fonte fica HOLD.
- Os templates antigos vinculam uma folha CSS v0.2 separada no HTML; os atuais não. Agora a distribuição v0.3 entra por `app/landing/landing.css`, compartilhado nas três páginas. Substituir os templates mais novos pelos antigos poderia remover imagem fallback, `tabindex=-1` de `about` e script/arranjo de menu. O HTML principal atual contém invólucros `data-image-fallback` e carrega `/core/image-fallback.js?v=public-image-fallback-v1`; os HTML de 23/10 não. Isso **não** é mudança autorizada por VIS-002C e fica preservado.
- A main é a autoridade de markup, copy, navegação, fallback e acessibilidade: nenhum HTML antigo deve ser transplantado. O gate `node scripts/compile-primary-pages.mjs --check` exige fonte/output/manifest byte-identical na development, e `node scripts/verify-vis002c-product-pin-v03.mjs` exige os dez contextos e bloqueio de `:root`.

## O que permanece utilizável

Os scripts antigos de contraste, diferencial v0.1/v0.2 e raster (incluindo estabilização do iframe só nos testes) têm valor **de proveniência histórica**, mas foram escritos para versão e CSS anteriores. Guardar em **tags integrais**, sem copiar testes que agora exigiriam falso `#705C4B`. O gate moderno v0.3 tem dez seletores e verifica aplicação por componente; os testes de navegador antigos não substituem revisão em preview, e esta rodada não abre previews por economia de bandwidth.

**Gate de aceitação de aposentadoria:** [`tests/test_development_vis002c_triad.py`](../../tests/test_development_vis002c_triad.py) roda sem dependências externas, faz SHA de blob por `git show`, valida 8⊂10 contextos com fundos, reconstrói o output ARC-03C a partir de source+fragment+routes nos três estados, exige 16+ fallbacks novos e nenhum layout/runtime tocado; o workflow combina isso com os dois comandos oficiais de verificação no HEAD atual. Só após PASS na auxiliar e no destino, executar **duas ondas** de higiene one-shot: AC com duas fontes ARC-03C e auxiliar ancestral (3 alvos), AD com a fonte token v0.2 remanescente (1 alvo). Cada fonte recebe tag SHA-exata; não exceder o limite homologado de 3 alvos por onda. Preservar as 12 PRs, main, DS02 e todas as outras refs.

**Risco residual:** não há garantia universal de que o navegador real de 23/10 era pixel-identical ao atual; isso não é exigido para preservar a história e aposentá-la com tags. Não dizer que as três branches foram fundidas funcionalmente, nem que v0.3 foi lançada em produção. A distinção é **evidência de intenção absorvida e DAG arquivada**.

## Gate de integração na auxiliar

[Workflow #40751124977](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40751124977) **PASS** em `58397b6c00d9b5d804dfe98b5fb4ccf89d358d29`: seis testes Python de revisão da DAG, mapeamento 8⊂10, manifestação/autoria ARC-03C e preservação de headings, IDs, imagens e controles comerciais, escopo do diff sem auth/DB; `ARC03C_PAGE_GATE_PASS` para 3 páginas e `VIS002C_PRODUCT_PIN_V03_PASS contexts=10 dark-theme-preserved` (Node oficial). Este é um **gate offline de reconciliação**, não validação em Netlify nem equivalência de raster entre versões. O workflow na auxiliar foi posteriormente limitado a trigger de development; os commits de configuração devem ser integrados por FF SHA-exato, revalidados no destino e só então permitem o lote AC.

## Verificação no destino

Após fast-forward SHA-exato `integration/35-vis002c-arc03c-triad-20261028@9d454f91975d75e8d776cffd2c4492c447c9be1d` desde `development@b0d6f676f0cc0189b4a0430922ec00c5bda4f7c6`, o [gate no destino #40751285149](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40751285149) concluiu **PASS** nos seis testes Python e nos verificadores oficiais de ARC-03C e VIS-002C v0.3. Diff da auxiliar: apenas três arquivos `docs/work/`, `tests/`, `.github/workflows/`; nenhum `app/`, `architecture/`, `design-system/`, `netlify/` ou `scripts/` alterado. A main segue autoridade forte e a PR #231 segue aberta com seu próprio head.

**Higiene AC/AD elegível**, ainda condicional à auditoria do executor: AC arquiva consolidated e support e remove a auxiliar ancestral; AD arquiva a fonte token v0.2 em manifesto posterior, somente após readback e registro de AC. Nenhuma migração silenciosa de V0.2; código de produto fica na v0.3. Esta validação não informa qualquer deploy ou smoke de browser real.

## Restrição de lote: falha segura antes de qualquer exclusão

A primeira tentativa de manifesto `dev-20261028-vis002c-arc03c-triad-archived-ac`, [run #40751498062](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40751498062), recebeu **AUDIT FAIL / APPLY SKIPPED** por `BATCH_SIZE_1_TO_3`: três branches históricas + uma auxiliar = **4 targets**, acima do limite estabelecido do executor. O bloqueio evitou qualquer tag ou exclusão nesse lote. A política de 3 alvos **não será alterada**. Lote corrigido AC terá duas fontes ARC-03C + auxiliar (3 alvos); lote novo AD terá token v0.2 (1 alvo). Manter checks de SHA, PR, main, ruleset e tags independentes nas duas ondas.

## Registros canônicos exatos para executor bounded

A [auditoria AC #40751673606](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40751673606) falhou **antes de APPLY** em `ARCHIVE_PROVENANCE_RECORD_MISSING`. O executor exige o formato literal `branch@SHA` no `snapshotPath`; a tabela anterior continha os valores separados. Este requisito é preservado, não relaxado. Registro de todas as fontes com a correspondência inequívoca à tag integral de restauração:

- `integration/consolidated-arc03c-vis002c-token-20261023@c239012c126c9b3e2c477778ea4b2d37b74c963f` → `archive/m2d/vis002c-arc03c-c239012c`. O SHA da tag deve ser `c239012c126c9b3e2c477778ea4b2d37b74c963f`.
- `integration/vis002c-contextual-support-v02-20261024@a285a2dc6f543f33f45615ba653a296236f8b3ac` → `archive/m2d/vis002c-support-a285a2dc`. O SHA da tag deve ser `a285a2dc6f543f33f45615ba653a296236f8b3ac`.
- `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9850dc194f68b16fa097c6691c06b` → `archive/m2d/vis002c-v02-token-34a305c1`. O SHA da tag deve ser `34a305c1ddb9850dc194f68b16fa097c6691c06b`.

A primeira dupla é alvo de AC (junto à auxiliar), a terceira somente de AD posterior. **Nenhuma tag nem ref foi alterada pelas duas auditorias falhadas**. Todas as três origens possuem histórico integral e testes/proveniência pinados; a decisão é aposentadoria de branch histórica com tag, não absorção de código v0.2 na main.

## Encerramento das ondas AC e AD (readback remoto)

- O primeiro lote AC com **4 alvos** [#40751498062](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40751498062) terminou AUDIT FAIL / APPLY SKIPPED por `BATCH_SIZE_1_TO_3`. A tentativa AC de três alvos com documentação ainda sem registros literais [#40751673606](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40751673606) terminou AUDIT FAIL / APPLY SKIPPED por `ARCHIVE_PROVENANCE_RECORD_MISSING`. Ambos os bloqueios preservaram **todas** as referências e tags.
- O lote AC corrigido `dev-20261028-vis002c-arc03c-two-sources-ac-v2` [#40751897855](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40751897855) passou **AUDIT+APPLY**, com dois tags SHA-exatos: `archive/m2d/vis002c-arc03c-c239012c@c239012c126c9b3e2c477778ea4b2d37b74c963f` e `archive/m2d/vis002c-support-a285a2dc@a285a2dc6f543f33f45615ba653a296236f8b3ac`. Excluídas somente as duas refs originais e a auxiliar ancestral; recibos audit `12843353181`, apply `12842934175`. Readback **31→28** refs (incluindo a auxiliar no início).
- O lote AD `dev-20261028-vis002c-token-v02-archive-ad` [#40752191013](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40752191013) passou **AUDIT+APPLY** com um único alvo, `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9850dc194f68b16fa097c6691c06b`, cuja DAG está íntegra na tag `archive/m2d/vis002c-v02-token-34a305c1@34a305c1ddb9850dc194f68b16fa097c6691c06b`. Recibos audit `12845090917`, apply `12844166758`. Readback **28→27** refs.
- **Estado final:** 27 refs remotas = 25 históricas remanescentes + main + development. **35/60** fontes originais aposentadas, **26 auxiliares** aposentadas, **30 ondas**. Todas as 12 PRs abertas, DS02 e main preservadas. Nenhuma alteração de `app/`, `netlify/`, `architecture/` ou de CSS em runtime; nenhum Netlify preview/build, alteração de grants, banco ou autenticação.
- **Importante:** as três branches divergiam e continham commits únicos. Não foram declaradas ancestrais redundantes, nem mescladas diretamente. O resultado é **reconciliação de intenção + verificação da cadeia autoral + arquivo integral das três DAGs**, com v0.3 preservada como autoridade mais recente. Seus testes e implementações históricas continuam recuperáveis pelas tags; eventual mudança de direção futura precisa nova decisão e novos gates.
- Os manifestos AC/AD estão **CONSUMED**; não reexecutar. Ledger `ops/development-retirement-history.json` registra ambos, inclusive os dois bloqueios seguros anteriores. Próximo recorte: inventariar CP-PUBLIC e outros ramos ainda associados às PRs abertas, sem apagar ou sobrepor suas heads.
