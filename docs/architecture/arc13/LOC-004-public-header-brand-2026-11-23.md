# LOC-004 — acessibilidade da marca no cabeçalho público

**Estado:** integrada em `development` pela #309 (`2083aac`); a família de navegação foi integrada em #308. `main` permaneceu inalterada.

## Escopo e autoria

Este recorte cobre somente o nome acessível do link da marca que retorna ao início e o texto alternativo do logo no fragmento compartilhado do cabeçalho. O catálogo único `app/core/ui-copy.js` passa a autorar essas duas mensagens; ARC-03C as resolve no build para as rotas `/`, `/about/` e `/how-it-works/`.

Owner registrado: **Product/UX e marca**. Os valores aprovados foram mantidos palavra por palavra, inclusive a vírgula em “Casa em Módulos, início”. A página final continua incluindo os dois atributos estáticos, mesmo antes de qualquer JavaScript. O destino do link continua sob `primary-header.routes.json`; chamadas para ação, títulos, texto visível, Viewer e cabeçalhos privados permanecem fora do escopo.

## Contrato e evidência

- O compilador e o scanner registram e validam as chaves de catálogo e seus hashes, além do placeholder de origem.
- Valores continuam escapados para HTML, não vazios e sob schema/locale validados.
- O teste ARC-03C (6/6) cobre os valores e proveniência das duas mensagens, escaping, rejeições fail-closed e carregamento único do catálogo; o contrato de tema e `pages:check` também passam.
- O scanner completo passa com zero erros de parse e zero ocorrências primárias sem autoria resolvida. Duas execuções geraram o mesmo inventário, SHA-256 `8E7393F891F72F12D57677E8B16F6297740BA8743C7BAC8FE46D4A9D97971F9C`; este snapshot também reflete a alteração de fonte do seletor de tema atualmente em revisão na #310.
- O inventário associa seis ocorrências aos dois ponteiros; o recibo `architecture/arc13/loc-004-public-header-brand.json` mantém a linhagem desse grupo.
- As três páginas geradas permanecem byte a byte idênticas à base de `development`; a semântica DOM e o layout continuam iguais.

## Próximo passo

Continuar a revisão de LOC-002 por função e consumer. A classificação do inventário continua separada da extração e não agrupa rótulos parecidos quando controlam decisões diferentes.
