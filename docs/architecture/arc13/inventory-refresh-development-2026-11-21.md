# ARC-13 — inventário renovado no buffer de desenvolvimento

Snapshot de entrada: Product `development@44c7cb6495540e4038717b26fb2b1e96b02571f4`, após ARC-13 e NAV-005. Este candidato aplica às fontes autorais os ajustes já aprovados do hero/vídeo e dos cards de comparação; o compilador de desenvolvimento continua preservado. A regeneração usa os 66 arquivos-fonte inventariados, Acorn 8.19.0 fixado e o compilador de páginas com mapa de proveniência.

## Resultado técnico

- Inventário: `architecture/arc13/ui-text-candidates.json`, SHA-256 `83e5148ae2dea4da1a0db4d23646f4083a9ad9b16323068cc2d4ffb6d28d4468`.
- Manifesto ARC-03C: schema v2; compilador `scripts/compile-primary-pages.mjs`, Git blob `f417285ae4b69828f2995cdd5fe4a1cc32c93615`.
- `pages:check` passou nas três páginas principais. As saídas compiladas coincidem com as três páginas já versionadas no snapshot-base.
- Duas execuções idênticas produziram o mesmo SHA-256 do inventário.
- As fontes HTML/JavaScript e o texto validado do mapa ARC-03C são normalizados para LF antes da análise e do hash textual; o checkout CRLF conserva a mesma proveniência e o mesmo recibo.
- A análise encontrou 609 ocorrências HTML e 417 pontos de escrita JavaScript: 1.026 ocorrências candidatas, todas ainda `candidate-unreviewed`.
- Não houve erros de parsing nem fontes ignoradas. As 420 ocorrências das três páginas principais têm proveniência autoral validada; nenhuma ficou sem mapeamento. As demais ocorrências HTML fora dessas páginas permanecem no escopo normal do scanner.
- A atribuição técnica de rota e o mapeamento de fontes não definem owner editorial, texto aprovado, chave de catálogo ou autorização para extração.

## Julgamento funcional mantido em aberto

Controles visualmente parecidos não foram agrupados só pela aparência. As caixas de seleção observadas no Admin correspondem a decisões diferentes, incluindo visibilidade inicial de entidade, seleção inicial de serviço, visibilidade no Viewer e disponibilidade de etapa ou para clientes. O inventário deve preservar esses grupos até que o contrato de cada campo confirme a função.

A diferença de tratamento visual entre esses controles continua sendo uma decisão local de interface. Ela não cria, por si só, tokens globais. O texto alternativo da ilustração do hero também precisa de revisão após a troca da arte.

## Próxima revisão

Reconciliar recibos antigos por caminho, hash da fonte, expressão e consumidor. IDs posicionais e totais do snapshot anterior não bastam para transferir decisões. Em seguida, revisar quais relatórios grandes são canônicos ou derivados e completar a classificação assistiva e editorial. Nenhum candidato foi extraído, traduzido, renomeado ou aprovado semanticamente neste lote.
