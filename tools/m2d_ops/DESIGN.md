# Draft de implementação e adoção

## Tese

Um núcleo de leitura e projeção, não três plataformas. O conhecimento durável (intenção, decisões, relações semânticas, exceções) permanece canônico nos repositórios; o estado observável (refs, árvores, evidências e candidatos) é calculado. As saídas são descartáveis e podem ser geradas novamente. O Branch Hygiene vNext continua sendo a autoridade para preservação/retirada, com seu executor e consumo idempotente separados.

```
Git + CI/recibos + Plano + registro + mapa de impacto
         │
  observação fixada em identidades
         │
  ├── status / contexto / handover
  ├── candidatos / relações / propostas de bites
  └── diferenças / disposições explícitas
         │
 agente interpreta, decide e implementa
         │
 fluxo normal de gates, integração e higiene (fora desta CLI)
```

## Reaproveitamento e limites de módulos

O Produto já possui `branch_hygiene_observe.py` (transporte isolado), `branch_hygiene_plan.py` (planejador puro e JSON canônico), `branch_hygiene_consumption.py` (marcadores de consumo com efeitos externos), `branch_hygiene_merged_pr_cleanup.py` (executor), `ops/development-main-authority-policy.json` (autoridade) e `tools/ci/test-impact-bundles.json` (impacto). O protótipo lê os contratos existentes, mas não importa o executor ou os marcadores. Sua função de Git e canonical JSON são deliberadamente mínimas e independentes durante a exploração; na adoção, deduplicar apenas funções puras compatíveis, sem acoplar leitura a efeitos colaterais. Não introduzir outro sistema de tags/recibos destrutivos.

O Design System permanece fonte de decisões e plano. Não precisa de uma development artificial nem de uma cópia do registro do Produto. O mecanismo de inventário remoto já existente deve fornecer o status das branches e PRs dos dois repositórios no futuro, incluindo o caso de apenas main.

## Concorrência — o Codex pode continuar trabalhando

**Na proposta de integração:** somente arquivos novos em `tools/m2d_ops/`, branch própria e PR draft para development; nenhuma alteração nas refs de controle ou no executor vigente. O draft continua isolado e opt-in. Leitura por SHAs imutáveis, sem interferir com working tree, índices, branch ativa, locks ou arquivos do agente. Nenhuma espera por atualização da meta. O Codex pode implementar o mesmo problema independentemente; não presumimos exclusividade nem reservamos IDs. O draft não será aplicado automaticamente.

**Quando for possível integrar:**

1. Atualizar as observações dos dois repositórios e identificar PRs abertas, arquivos que o Codex estiver usando (quando disponíveis) e eventual implementação sobreposta.
2. Comparar intenção/DoD, consumidores e contratos da versão existente com este draft. Preferir aproveitar implementação já concluída; absorver apenas deltas úteis. Não promover o ZIP cegamente.
3. Validar a ferramenta em modo sombra: executar em clone separado e comparar resultados com o vNext, inventários e leituras diretas, sem substituir processos existentes. Em observação inconsistente, repetir a leitura ou rotular desconhecido.
4. Introduzir somente o primeiro pacote funcional com valor demonstrado, idealmente `snapshot + status/context`. A integração normal segue destino e gates acordados. Preferir arquivos novos e adapter explícito; revalidar as refs imediatamente antes de qualquer PR/merge. Evitar um PR de alteração transversal.
5. Acrescentar reconciliação e candidatos como consultas opcionais, sem introduzir required checks. Reusar as fontes existentes. Não ligar automação de gates, promoção reversa ou exclusão.
6. Após evidência de benefício e autorização, substituir handovers voláteis por entrypoints estáveis. Preservar handovers históricos com data. Somente então descontinuar manutenção redundante; não criar duas fontes de verdade.

Se os agentes estiverem concorrendo no mesmo escopo, não usar reset, force-push, rebase de branch compartilhada, cancelamento de workflow, alteração da meta ou exclusão. Esperar um ponto de integração natural é estratégia de adoção, não uma tarefa em background.

## Candidatos e grafo

Relações extraídas textualmente são pistas com localização no plano, nunca hard gates. Menções abreviadas (`DOM-008/012`), intervalos, dependências narrativas, IDs fora do anexo e seções sem cabeçalho precisam de leitura semântica. O agente declara arestas tipadas com motivo e evidência: `requires`, `consumes`, `validates`, `supersedes`, `derived_from`, `conflicts_with`, `related_to`. Nós `artifact:*` permitem registrar componentes, contratos e implementações históricos sem confundir ancestralidade Git com proveniência técnica. O detector de ciclos olha somente `requires`. Um candidato com dependência pendente significa pendência segundo afirmações registradas, não bloqueio universal de outros candidatos.

O grafo não é uma cópia integral do sistema de código. Persistir só relações que são difíceis de recuperar deterministicamente. A CLI pode propor grupos por bundles compartilhados; coesão de intenção, possibilidade de execução isolada e rollback continuam decisões do agente. O bite proposto registra candidatos, intenção, aceitação, validação, destino e rollback. Não precisa de PR por objetivo nem de limite arbitrário de linhas. Uma proposta que referencia candidato já ausente pede refresh. A completude estrutural de uma proposta não é aprovação.

## Divergência

Diferenças históricas por squash não viram pendência quando as árvores são idênticas. Um path com diferença é classificado por lado em relação à base única; na ausência de base única, a direção é desconhecida. Essa direção é uma pista, não prova que a alteração deva ser integrada reversamente. Excluir arquivos, alterar modos ou submódulos também gera diferença. Não detectar automaticamente renomeações ou equivalência funcional é uma escolha deliberada do MVP. A fronteira real é a semântica de contratos e consumidores, não identidade de commits.

A rotina futura pode rodar depois de merge importante ou sob demanda: identificar diferenças novas/afetadas e sugerir promoção, backport, equivalência, exceção intencional ou conflito. Sem novo executor. Disposições scoped permitem reaproveitar julgamento sem reavaliar todo o histórico a cada mudança de SHA. Escopo incompleto nunca é prova global. Não usar a ferramenta para substituir `main` pela `development`.

## Escopo de validação e critérios de adoção

O protótipo testa comparação de árvores, ausência de efeitos colaterais em Git, leitura concorrente, invalidação por escopo, proveniência, dependências, ciclos, conflitos de disposição, integridade e uso da CLI. Os testes são sintéticos; o clone real não estava acessível via rede do runtime. A inspeção via conector confirma formatos e pontos de reaproveitamento, não valida execução nos repositórios reais.

Antes de adoção, testar em cópia local dos dois repositórios atuais: leitura dos 125 IDs e plano pinado, concordância com diff independente de árvores, custo do snapshot, revisão dos falsos positivos de candidatos, cobertura de referências históricas, SHAs durante concorrência, e compatibilidade com recibos reais. Manter `unknown` para falhas de transporte. Verificar o código e os consumidores antes de fechar DoD. Medir redução de reconstrução de contexto e PRs exclusivamente de atualização volátil, não número de features da ferramenta. Se o mecanismo gerar manutenção maior que a substituída, cortar ou simplificar.

## Fora do MVP

Transporte GitHub/Netlify, verificação de execução CI e artefatos, inventário remoto completo, comparação entre repositórios para releases DS, autenticação de recibos, análise AST/consumidores, descoberta de equivalência por testes e coleta automática de proveniência. O MVP não garante isolamento temporal atômico entre repos nem detecta uma mudança ABA de refs durante captura. A integração do leitor com os adaptadores existentes e testes reais são o próximo gate, não pré-requisito para o Codex continuar.
