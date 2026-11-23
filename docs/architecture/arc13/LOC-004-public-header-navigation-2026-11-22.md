# LOC-004 — navegação pública do cabeçalho

**Estado:** integrada em `development` por squash na PR #308 (`4dba382af88a7a8de70aacd187b0787c5fc894ea`).

## Escopo e autoria

Esta primeira família de localização cobre somente o nome acessível da navegação e seus três rótulos visíveis nas páginas públicas `/`, `/about/` e `/how-it-works/`. A fonte única do texto é `app/core/ui-copy.js`; o fragmento compartilhado em `architecture/fragments/primary-header.fragment.html` aponta para chaves semânticas e o compilador ARC-03C insere o texto no HTML durante o build.

Owner editorial registrado: **Product/UX**. Os quatro textos publicados foram preservados exatamente, sem nova decisão editorial ou mudança de pontuação. A marca, o CTA do WhatsApp, os destinos e estados de rota permanecem fora da migração de copy. Os destinos e `aria-current` continuam sob `primary-header.routes.json`. Viewer NAV-005 e cabeçalhos privados ficam fora do recorte.

## Contrato e proveniência

- O compilador usa a mesma exportação de catálogo já carregada pelo runtime. O catálogo continua sincronamente disponível no navegador e exportável ao compilador Node; não foi criada uma segunda cópia editável.
- Chave ausente, vazia ou inválida, schema/locale inesperados e placeholder sem resolução fazem o build falhar.
- A substituição escapa texto para HTML. O HTML publicado contém os textos literais e continua utilizável sem JavaScript.
- O manifesto ARC-03C versão 3 registra caminho e hash do catálogo, além da chave de catálogo e do placeholder de origem para cada trecho emitido. O scanner ARC-13 valida esse vínculo antes de atribuir autoria aos candidatos.
- As páginas geradas ficaram byte a byte idênticas ao head anterior de `development`; assim, a comparação do HTML também confirma que texto, atributos, links e estrutura DOM não mudaram. Não foi necessário repetir um teste visual para uma mudança sem pixels ou geometria diferentes.

## Validação

`tests/arc03c-source-authority.test.mjs`: 5/5; `tests/ui-theme-contract.cjs`: passou; `scripts/compile-primary-pages.mjs --check`: passou. O scanner completo ARC-13 passou com zero erros de parse e zero ocorrências de autoria não resolvidas nas três páginas compiladas. Duas execuções consecutivas produziram inventário idêntico (SHA-256 `0EA2E0043C038A8C3BDB4CD6B560A8DA5BD653B62733FEA4DCCEF48B3DE8BC4E`).

O recibo `architecture/arc13/loc-004-public-header-navigation.json` associa os 12 candidatos exatos desta família ao inventário. Esse registro não pretende classificar todo o inventário ARC-13 nem implica que todas as suas ocorrências estejam revisadas.

## Próximo passo

Submeter este lote como uma unidade à revisão independente e aos gates de `development`. A integração em `main` continua sendo promoção seletiva posterior; este pacote não publica para produção.
