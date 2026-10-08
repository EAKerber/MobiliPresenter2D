# CP-POSTV5-02a1 — falsificação de novo material no contrato v5 — 2026-10-08

Status: **IMPLEMENTED IN PR #173 / FULL CI AND PREVIEW PENDING**.

## Hipótese e fronteira

O botão `Adicionar material` no admin cria um material novo, associa-o a `fronts-all`, cria disponibilidade inicialmente `disabled` e uma regra percentual tipada com base `eligible-module-base`. Queremos falsificar a afirmação de que **esse novo ID pode atravessar o pipeline de dados v5**, sem inventar um novo módulo/catálogo ou alterar a cena.

O novo teste `app/tools/test-postv5-new-material-roundtrip.js`, integrado a `app/package.json`, constrói um documento canônico **somente em memória**, aplica precisamente essa estrutura e verifica:

1. `administration-v5.validate` sem erros e `normalize` fiel;
2. preservação de material, disponibilidade e regra tipada na `published-buyer-projection.prepare`;
3. `v5-normal-save.savePublishedV5` com ETag CAS e strong readback em fake store; revisão incrementada e replay rejeitado;
4. bloqueio de `module-unregistered-999` quando inserido na hierarquia sem item de catálogo;
5. nenhuma conexão com produção, upload, alteração da cena ou criação de módulo real.

## Critérios de fechamento

- Teste novo incluído e PASS em `App build purity` (execução do pacote `npm test`).
- Demais CI/preview Netlify verdes antes de marcar COMPLETE/PASS e merge.
- **Não concluir** que a cor aparece visualmente ou pode ser selecionada apenas porque o projection preservou os dados. A UI browser será um recorte separado **CP-POSTV5-02a2**, com swatch, estado/seleção/preço/reativação e provas de ausência.
- Se algum componente de browser recriar opções a partir de `catalog.options.finishes` em vez de `v5.materials/finishes`, classificar isso como fronteira parcial, não adicionar fallback semântico que fabrique opções.
- Se já funcionar em browser sem mudança de runtime, encerrar como PASS/NOOP e evitar extensão desnecessária de schema.

## Efeito em produto

Nenhum. O projeto publicado continua no documento v5 atualmente persistido. O material `fixture-new-finish-20261008` existe apenas no teste; não é uma nova cor comercial nem um registro que possa ser importado automaticamente em produção.

Relação: `docs/architecture/post-v5-cp-01-authoring-coverage-discovery-2026-10-08.md` e `docs/backlog/post-v5-work-frontier-2026-10-08.md`.
