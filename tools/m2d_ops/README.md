# M2D Operations — draft local 0.1

Protótipo executável, exclusivamente de leitura. Uma CLI, Python 3.10+ e Git, sem dependências instaláveis, servidor, banco de dados, workers ou novos workflows. Experimental e opt-in: não é uma ferramenta de produção nem uma nova autoridade operacional. Esta proposta de integração não ativa workflows ou substitui os mecanismos vigentes.

## Uso

O exemplo usa repositórios **já disponíveis localmente** e refs locais de rastreamento remoto, previamente atualizadas por um operador autorizado. A CLI não executa fetch, checkout, merge, push, delete, testes de produto ou deploy; também não lê arquivos não commitados. Não execute em cópias em que não confia. Guarde as saídas fora do working tree.

```sh
python tools/m2d_ops/ops.py snapshot \
  --repo /isolado/MobiliPresenter2D \
  --main refs/remotes/origin/main \
  --development refs/remotes/origin/development \
  --ds-repo /isolado/MobiliPresenter2D_DesignSystem \
  --ds-ref refs/remotes/origin/main > /tmp/m2d-observation.json

python tools/m2d_ops/ops.py validate /tmp/m2d-observation.json
python tools/m2d_ops/ops.py status /tmp/m2d-observation.json
python tools/m2d_ops/ops.py context /tmp/m2d-observation.json DOM-010
python tools/m2d_ops/ops.py candidates /tmp/m2d-observation.json --objective
python tools/m2d_ops/ops.py reconcile /tmp/m2d-observation.json --bundle public-navigation
python tools/m2d_ops/ops.py handover /tmp/m2d-observation.json
```

Também aceita SHAs completos como refs. O `snapshot` fixa os commits, lê blobs por identidade, compara árvores, registra a base de merge quando única e relê as refs solicitadas no fim. Em caso de mudança observada, falha sem emitir um snapshot parcial. Não é uma transação entre os repositórios, nem comprova frescor remoto; SHA fixado não é sinônimo de HEAD atual. A observação é autocontida e seu hash detecta alterações acidentais, não prova autenticidade.

`status`, `context`, `candidates`, `reconcile`, `handover` e `validate` aceitam `--notes <arquivo.json>` opcional. As notas são proposições explícitas do agente, não fatos descobertos. Não há comando que grave notas, estado ou um recibo no Git. `examples/notes.json` é inteiramente ilustrativo; adapte a partir de uma observação real, nunca copie uma prova fictícia como válida.

## Demonstração sem acesso ao GitHub

```sh
python -m unittest discover -s tools/m2d_ops/tests -v
python tools/m2d_ops/demo.py /tmp/m2d-demo
python tools/m2d_ops/ops.py status /tmp/m2d-demo/observation.json
python tools/m2d_ops/ops.py context /tmp/m2d-demo/observation.json DOM-010
```

`demo.py` cria dois repositórios descartáveis dentro de uma pasta nova, com três IDs sintéticos e divergência bidirecional. Não usa nenhum repositório real. O handover ilustrativo está em `examples/demo-handover.md`; os outros resultados são gerados pelo demo.

## O que está implementado

| Comando | Função | Limite |
|---|---|---|
| snapshot | Leitura imutável de refs, árvores, registro, plano e mapa de impacto | Sem transporte remoto, CI ou deploy |
| status | Contagem de afirmações registradas por dimensão, diferenças exatas, recibos históricos | Não é estimativa de progresso real |
| context | Registro, trecho/posição do plano, relações, artefatos, candidatos e evidências | Extração textual incompleta; decisão humana/agente |
| candidates | Reconciliação de IDs abertos, diferenças, sugestões de grupos e propostas de bites | Não decide ordem, coesão ou aprovação |
| reconcile | Classificação de mudança por lado, modo/tipo/blob e possíveis bundles | Sem análise semântica autônoma |
| handover | Markdown conciso ou JSON integral gerado sob demanda | Não altera documento canônico |
| validate | Integridade da observação, correspondência do anexo, pin do plano, relações inválidas e ciclos | Não certifica DoD, testes nem semântica |

## Contratos de entrada existentes

- Produto: `docs/architecture/plan-v0.9-execution-register.json` (`PlanV09OperationalRegister/1`).
- Design System: `docs/architecture/MOBILIPRESENTER2D_PLANO_DIRETOR_CONSOLIDADO_v0.9.md`.
- Produto, opcional: `tools/ci/test-impact-bundles.json` (`M2DTestImpactMap/1`).
- Notas: recibos históricos `MergedPrHeadCleanupReceipt 0.1` podem ser fornecidos sem copiar ou reexecutar a rotina de higiene. A CLI os exibe como recibos fornecidos, não como inventário atual autenticado.

A análise de impacto é sugestiva: `fnmatch` não replica integralmente a semântica de filtros do GitHub Actions. A ausência de correspondência **não** autoriza pular gates. O mapa de impacto continua pertencendo à ferramenta existente.

## Documentação

Preserve o plano, decisões, contratos e recibos históricos. Não crie uma segunda tabela dos 125 IDs. O snapshot contém as afirmações do registro por conveniência de leitura, derivadas a cada consulta, sem se tornar autoridade paralela. A diferença entre implementação existente e encerramento formal é preservada.

Uma evidência de escopo declarado é comparada com as entradas exatas (modo, tipo, OID) da árvore do destino. `declared_scope_unchanged` significa somente que o escopo fornecido não mudou; não garante abrangência, validade semântica, sucesso de teste ou publicação. Um recibo pode sobreviver a alterações não relacionadas.

O contexto identifica tanto títulos Markdown quanto itens do plano apresentados em negrito, com intervalos de linhas e critérios de conclusão quando reconhecidos. Esses trechos são pistas para leitura da fonte, não avaliação automática de cumprimento; formatos não reconhecidos podem continuar sem extração.

Para disposições de divergência, a reutilização entre observações exige fingerprint da diferença, pin do plano e escopos declarados em ambos os destinos. Sem esses escopos, vale apenas para a observação original. A decisão continua identificada como `agent_asserted_*`, nunca como prova independente.

## Segurança e adoção

Sem instalação de dependências, ativação de CI, serviços ou mudanças no objetivo do Codex. Revisar em modo sombra antes de adotar. Veja [DESIGN.md](DESIGN.md) para a estratégia de concorrência e de integração eventual. `SOURCE-READBACK.md` separa as fontes remotas consultadas das provas sintéticas. Não publique os snapshots integrais sem revisão: podem conter metadados operacionais ou caminhos internos.
