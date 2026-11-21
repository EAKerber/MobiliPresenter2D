# ARC-13 — inventário renovado sobre a main

**Baseline analisada:** Produto `main@5b29934150a8f939057fbd3ae14fd1c1511afd03` (21/11/2026). O inventário foi regenerado sobre as fontes e páginas autorais dessa árvore. Este documento não altera a decisão de manter `development` como buffer: o ARC-13 já foi integrado e validado nele antes da promoção seletiva.

## Resultado do inventário

- Arquivo: `architecture/arc13/ui-text-candidates.json`.
- SHA-256: `beb8f9e9554fca6bdf0f8f884982406a34c99d442768d4374212603ab484667e`.
- Escopo: 609 ocorrências HTML e 417 pontos de escrita JavaScript, totalizando 1.026 candidatas `unreviewed`.
- Fontes: 360 registros de texto JavaScript, 57 arquivos JavaScript e 8 arquivos HTML.
- Integridade: 0 erros de parsing, 0 fontes JavaScript ignoradas, 0 owners técnicos sem atribuição e 0 rotas técnicas sem atribuição.
- Proveniência ARC-03C: 420 ocorrências nas três páginas principais mapeadas à autoria; 0 sem proveniência. As páginas públicas geradas mantiveram os mesmos blobs da baseline `main`.
- A geração usa Acorn `8.19.0`, fixado no lockfile. Uma segunda execução local produziu o mesmo SHA-256.

O snapshot anterior de `development@4850149342d013314635f4fa12b0599562d432b9` registrou 1.012 candidatas. A diferença vem das árvores e fontes públicas distintas; os totais e IDs de uma baseline não são transferidos para a outra.

## Proveniência entre compilador e scanner

O compilador ARC-03C emite o manifesto `M2DARC03CPublishedPages/2` com mapas por ponto de código Unicode. A validação local foi feita num checkout Windows com CRLF. Esse caso revelou diferenças de sistema operacional: offsets do parser contavam CRLF, hashes variavam pela quebra de linha e expressões extraídas preservavam CRLF. O scanner agora normaliza as fontes HTML/JS e hashes para LF antes da análise. As 420 ocorrências são atribuídas corretamente, e textos/IDs permanecem determinísticos nos dois sistemas.

## Evidência local do candidato

- `node scripts/compile-primary-pages.mjs --check`: passou.
- `node --test tests/arc03c-source-authority.test.mjs`: 4/4 passaram.
- `node --test tests/buyer-configuration-endpoint.test.mjs`: 1/1 passou contra a implementação existente na main.
- `npm run inventory --prefix tools/arc13`: duas execuções com o mesmo SHA-256; o scanner preserva todas as 1.026 candidatas como `unreviewed`.
- Ambiente local: Node `v24.20.0`, Python `3.14.6`, Acorn `8.19.0`. Os workflows do repositório continuam sendo a prova do ambiente CI (Node `22`, Python `3.12`) e do head remoto final.

## Limites semânticos

A classificação continua candidata. Este relatório não aprova conteúdo, owners editoriais, chaves de catálogo, extração ou localização. Controles visualmente semelhantes permanecem separados quando seu estado e consumidor diferem. A revisão assistiva e as decisões LOC-002 continuam pendentes; LOC-003…008 não foram implementadas por este pacote.
