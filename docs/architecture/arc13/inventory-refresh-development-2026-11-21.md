# ARC-13 — inventário renovado no buffer de desenvolvimento

Snapshot de entrada: Product `development@95cc0f4f4ed471354cb9aa3d162a025af14303ed`, após a integração seletiva de NAV-005. A regeneração usa os 87 arquivos HTML/JavaScript da árvore desse SHA, as ferramentas ARC-13 fixadas em Acorn 8.19.0 e o compilador de páginas com mapa de proveniência incorporado neste lote.

## Resultado técnico

- Inventário: `architecture/arc13/ui-text-candidates.json`, SHA-256 `b87cc3950cc8da2f4bedcff9533174dbc564e06570fc4fe09cfe73b282385cb8`.
- Manifesto ARC-03C: schema v2; compilador `scripts/compile-primary-pages.mjs`, Git blob `f417285ae4b69828f2995cdd5fe4a1cc32c93615`.
- `pages:check` passou nas três páginas principais. As saídas compiladas coincidem com as três páginas já versionadas no snapshot-base.
- Duas execuções idênticas produziram o mesmo SHA-256 do inventário.
- A análise encontrou 600 ocorrências HTML e 412 pontos de escrita JavaScript: 1.012 ocorrências candidatas, todas ainda `candidate-unreviewed`.
- Não houve erros de parsing nem fontes ignoradas. As 411 ocorrências das três páginas principais têm proveniência autoral validada; nenhuma ficou sem mapeamento. As demais ocorrências HTML fora dessas páginas permanecem no escopo normal do scanner.
- A atribuição técnica de rota e o mapeamento de fontes não definem owner editorial, texto aprovado, chave de catálogo ou autorização para extração.

## Julgamento funcional mantido em aberto

Controles visualmente parecidos não foram agrupados só pela aparência. As caixas de seleção observadas no Admin correspondem a decisões diferentes, incluindo visibilidade inicial de entidade, seleção inicial de serviço, visibilidade no Viewer e disponibilidade de etapa ou para clientes. O inventário deve preservar esses grupos até que o contrato de cada campo confirme a função.

A diferença de tratamento visual entre esses controles continua sendo uma decisão local de interface. Ela não cria, por si só, tokens globais. O texto alternativo da ilustração do hero também precisa de revisão após a troca da arte.

## Próxima revisão

Reconciliar recibos antigos por caminho, hash da fonte, expressão e consumidor. IDs posicionais e totais do snapshot anterior não bastam para transferir decisões. Em seguida, revisar quais relatórios grandes são canônicos ou derivados e completar a classificação assistiva e editorial. Nenhum candidato foi extraído, traduzido, renomeado ou aprovado semanticamente neste lote.
