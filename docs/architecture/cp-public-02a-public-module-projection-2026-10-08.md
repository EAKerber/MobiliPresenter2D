# CP-PUBLIC-02a — projeção pública mínima de módulos (fixture, 2026-10-08)

Estado: **IMPLEMENTAÇÃO ISOLADA / validação de CI pendente**. Branch `work/cp-public-02a-public-module-projection-20261008`. Não há publicação de endpoint nem alteração de produção.

## Fronteira implementada
`app/core/public-module-projection.js` recebe uma publicação `ConfiguratorAdministration2D 5.0`, catálogo físico e cena. Usa somente a associação dos módulos a uma stage `kind=modules`, habilitada, e a ordem explícita de `section.itemIds`. Retorna `PublicModulePresentation2D 0.1` com `modules[]`, cada um contendo apenas `id`, `referenceLabel`, `title`, `category`, `dimensionLabel`, `benefits`, `components`, `requirements` quando existirem. Título/dimensões/listas vêm do catálogo físico; presença/ordem vêm do v5. Não expõe geometria bruta nem URLs de assets.

**Limite descoberto:** `ConfiguratorAdministration2D 5.0` atual não autoriza diretamente um campo editorial `objects[id].description` como suposto no handoff. Por isso este recorte não inventa descrição, não promove `benefits[0]` a resumo e não consome `publicPresentation` da doadora. A forma de editar e publicar textos comerciais precisa de decisão de contrato separada.

O projetor é uma allowlist de campos, **não é autenticação, nem validação integral do documento v5, nem endpoint seguro**. O chamador confiável deve validar a publicação via `administration-v5.validate()` e controlar o transporte; entradas forjadas não substituem essa validação. Não instalar no browser com payload administrativo integral.

## Gates
- Testes em `tests/public-module-projection.test.cjs`: sete módulos, ordem e subconjunto, conteúdo negativo para preços/metadados/draft, módulo desconhecido ou duplicado, stage desabilitada e campos editoriais ausentes.
- Executar `node --test tests/public-module-projection.test.cjs` e CI global; inspecionar as PR checks.
- Antes da integração: estabelecer validação de documento no servidor, formato do transporte, política de publicação de descrições e rejeição de itens inválidos sem vazamento.
- **Não** liberar PR #175 para merge por este checkpoint; paridade de cena/pedra/rodapé e interface editorial continuam abertas.
