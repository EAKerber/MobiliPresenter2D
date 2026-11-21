# ARC-13 — inventário renovado no buffer de desenvolvimento

Snapshot de entrada: Product `development@4850149342d013314635f4fa12b0599562d432b9`, após ARC-13 e NAV-005. A regeneração usa os 66 arquivos-fonte inventariados nesta árvore, as ferramentas ARC-13 fixadas em Acorn 8.19.0 e o compilador de páginas com mapa de proveniência incorporado.

## Resultado técnico

- Inventário: `architecture/arc13/ui-text-candidates.json`, SHA-256 `15d3cfd9d4d9c56aa85fd0cc8c13c405318735310137db5ace96b7dea4055368`.
- Manifesto ARC-03C: schema v2; compilador `scripts/compile-primary-pages.mjs`, Git blob `f417285ae4b69828f2995cdd5fe4a1cc32c93615`.
- `pages:check` passou nas três páginas principais. As saídas compiladas coincidem com as três páginas já versionadas no snapshot-base.
- Duas execuções idênticas produziram o mesmo SHA-256 do inventário.
- As fontes HTML e JavaScript são analisadas com quebras de linha LF canônicas; isso mantém offsets ARC-03C e valores extraídos alinhados quando o checkout usa CRLF.
- A análise encontrou 600 ocorrências HTML e 412 pontos de escrita JavaScript: 1.012 ocorrências candidatas, todas ainda `candidate-unreviewed`.
- Não houve erros de parsing nem fontes ignoradas. As 411 ocorrências das três páginas principais têm proveniência autoral validada; nenhuma ficou sem mapeamento. As demais ocorrências HTML fora dessas páginas permanecem no escopo normal do scanner.
- A atribuição técnica de rota e o mapeamento de fontes não definem owner editorial, texto aprovado, chave de catálogo ou autorização para extração.

## Julgamento funcional mantido em aberto

Controles visualmente parecidos não foram agrupados só pela aparência. As caixas de seleção observadas no Admin correspondem a decisões diferentes, incluindo visibilidade inicial de entidade, seleção inicial de serviço, visibilidade no Viewer e disponibilidade de etapa ou para clientes. O inventário deve preservar esses grupos até que o contrato de cada campo confirme a função.

A diferença de tratamento visual entre esses controles continua sendo uma decisão local de interface. Ela não cria, por si só, tokens globais. O texto alternativo da ilustração do hero também precisa de revisão após a troca da arte.

## Próxima revisão

Reconciliar recibos antigos por caminho, hash da fonte, expressão e consumidor. IDs posicionais e totais do snapshot anterior não bastam para transferir decisões. Em seguida, revisar quais relatórios grandes são canônicos ou derivados e completar a classificação assistiva e editorial. Nenhum candidato foi extraído, traduzido, renomeado ou aprovado semanticamente neste lote.
