# CP-POSTV5-00 — Fronteira de trabalho após o schema v5 — 2026-10-08

Status: **DISCOVERY / PLANEJAMENTO**, sem mudança de código e sem decisão de produto implícita.

## Estado aceito e imutáveis

- CP-SD-00→06 está encerrado: `ConfiguratorAdministration2D 5.0` publicado em produção (revisão 7 na aceitação), usuário não notou problemas visuais, e as operações remotas excepcionais v3→v5 foram aposentadas pelos PRs #165, #168 e #169.
- PR #170 comprovou, com fixtures do endpoint, que v3/downgrade, reparo `persist-handles-all` e migração antiga não podem substituir um documento v5. **Preservar leitura/escrita condicionais sob fonte v3 somente para recuperação deliberada de backup**, não como caminho normal.
- `main` é a autoridade atual; buscar SHA e deploy no GitHub/Netlify antes de executar novas mudanças. O backup v3 permanece em local privado; não inseri-lo no repositório.
- O CP-SD e o CP-UX são marcos históricos concluídos. Trechos antigos que dizem `NEXT`, `PENDING` ou “publication blocked” referem-se ao momento em que foram escritos, não reabrem automaticamente a migração.
- O viewer e a landing page possuem trabalho exploratório paralelo. Esta frente não deve alterá-los nem mudar suas interfaces sem um contrato/coordenação específica.

## Fronteiras candidatas (sem priorização definitiva de produto)

| Frente | Valor/questão a resolver | Primeiro checkpoint seguro | Gate de parada |
|---|---|---|---|
| Configurador/admin v5: extensibilidade | Identificar quais mudanças de conteúdo, grupos, opções ou novos módulos já são publicáveis via schema e quais ainda exigem alterações de código/asset/scene | **CP-POSTV5-01 discovery de cobertura de autoria**: testar fixtures v5 locais, inventário de ações do admin e projetores do comprador; classificar limites reais | Não alterar a autoridade semântica ou implantar novos módulos com geometria/catálogo inventados |
| Qualidade do runtime publicado | Confirmar que as invariantes de schema-driven UI continuam verificáveis após edições v5 nativas e novos dados | Contrato de regressão de Save/GET e ausência de fallback por elemento, em fixture local | Evitar teste destrutivo de preços/configuração no site real |
| Produtos visuais diferidos | PR #34 (laterais expostas e vidro) foi mantido intencionalmente como decisão de valor, não como dívida técnica | Revisão de escopo e evidências de cenas/máscaras antes de reabrir | Não fazer merge sem aceite visual e modelo explícito de geometria/oclusão |
| Landing / Viewer públicos | Trabalho em paralelo com contratos próprios; dependências de cena e dados podem ser compartilhadas só por interface estável | Revisar fronteiras entre artefatos atuais, navegação e experiência pública quando a frente pedir integração | Nunca substituir a UI de configurador/admin aceitos pela landing em desenvolvimento |
| Adaptações futuras de estilo e apresentação | Avaliar variações de tema, nominal sizing e componentes quando houver definições/arte aceitas | Discovery isolada por comportamento ou token, sem alterar schemas por conveniência | Não remodelar schema atual por hipóteses visuais ainda não verificadas |

**CP-POSTV5-02a1 underway:** isolated fixture in PR #173 for new authored Fronts color's v5 validation, buyer projection and native Save/readback; browser proof is explicitly deferred to CP-POSTV5-02a2. `docs/architecture/post-v5-cp-02a1-new-material-roundtrip-fixture-2026-10-08.md`.

**CP-POSTV5-01 discovery executado:** matriz auditada em `docs/architecture/post-v5-cp-01-authoring-coverage-discovery-2026-10-08.md`. Próximo recorte recomendado **CP-POSTV5-02a**: falsificação v5 in-memory/browser da criação de novo material de Frentes; sem migration, novo módulo físico ou alteração de produção.

## Próximo recorte recomendado: CP-POSTV5-01 (somente descoberta)

1. Construir matriz **caso de autoria → documento v5 → UI do comprador → scene/asset/price/dependency** distinguindo suporte pleno, suporte parcial e ausência.
2. Selecionar uma capacidade de alto valor comprovadamente não editável que possa ser introduzida como incremento isolado, sem migrar schema publicado e sem exigir dados fictícios.
3. Reutilizar os gates `Admin hierarchy browser`, `Summary pricing browser`, `Mobile browser`, `Stone browser`, `Current variant fidelity`, `Current asset gates`, `App build purity` e preview Netlify.
4. Persistir um plano detalhado **somente** para o primeiro incremento de código e marcos mais leves para os seguintes. Buscar decisão do usuário quando a escolha impactar produto (por exemplo novos módulos, linhas de preço, dimensões ou asset real).
5. Se a descoberta mostrar suporte atual suficiente, encerrar como **NOOP deliberado**, sem fabricar complexidade.

## Handoff

Leia primeiro `CURRENT_STATE.md`, depois este documento e `docs/architecture/schema-driven-ui-cp-sd-06l1c-v3-recovery-compatibility-decision-2026-10-07.md`. A história de arquitetura permanece em `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`. Verificar `main` vivo antes de qualquer branch. Não usar o fallback v3 como fonte principal do viewer; v5 é a autoridade de produção.

Este documento não inclui compromissos de prazo nem habilita alterações de dados em produção.
