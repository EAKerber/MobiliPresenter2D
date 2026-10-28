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

**Gate de aceitação de aposentadoria:** [`tests/test_development_vis002c_triad.py`](../../tests/test_development_vis002c_triad.py) roda sem dependências externas, faz SHA de blob por `git show`, valida 8⊂10 contextos com fundos, reconstrói o output ARC-03C a partir de source+fragment+routes nos três estados, exige 16+ fallbacks novos e nenhum layout/runtime tocado; o workflow combina isso com os dois comandos oficiais de verificação no HEAD atual. Só após PASS na auxiliar e no destino, criar novo manifesto de higiene one-shot com as três tags e leases; remover auxiliar consumida apenas se for ancestral exata da development. Preservar as 12 PRs, main, DS02 e todas as outras refs.

**Risco residual:** não há garantia universal de que o navegador real de 23/10 era pixel-identical ao atual; isso não é exigido para preservar a história e aposentá-la com tags. Não dizer que as três branches foram fundidas funcionalmente, nem que v0.3 foi lançada em produção. A distinção é **evidência de intenção absorvida e DAG arquivada**.
