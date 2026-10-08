# CP-SD-06L1b — remover o despachante remoto da migração v3→v5 — 2026-10-07

Status: COMPLETE/PASS in PR #169. Functional head `06349e0bc04211814d5547270df9ae4b6da9cecd` passed 7/7 GitHub CI workflows plus Netlify deploy preview #169; no production Blob read or write was executed during verification. A publicação de produção já ocorreu, foi validada em v5 rev7 e aceita visualmente pelo operador.

## Decisão

Com a publicação definitiva v5 concluída e o endpoint temporário do cutover removido, a ramificação `PUT /api/configuration` com header `x-configuration-operation: publish-v5-migration` continuava incorporada à função normal, embora protegida pela constante `V5_MIGRATION_ENABLED = false`.

Não há consumidor normal desta operação: o botão de migração de uso único de PR #164 foi removido no PR #165, o admin já salva v5 nativamente e o comprador só faz GET normal. Manter uma chave que poderia ser reativada por um commit futuro traz mais risco do que benefício. **Aposentar a ramificação remota** reduz a superfície de gravação sem afetar a capacidade de recuperar um backup v3 offline.

## Escopo estrito

- Remover da função viva o import de `v5-publication-migration.js` e os imports `flow`/`hierarchyDefaults` exclusivos daquela operação, além da flag `V5_MIGRATION_ENABLED`.
- Preservar o header reconhecido `publish-v5-migration` como uma negativa explícita **HTTP 410** / `v5_migration_retired`, após autenticação e autorização. Nenhum write deve acontecer.
- Preservar `GET` público, `PUT` normal v5, ETag CAS/readback, rejeição de PUT v3 contra v5 e acesso administrativo habitual.
- Preservar o service `app/core/v5-publication-migration.js` e as ferramentas de preflight **para ensaios e recuperação offline**.
- Não alterar a escrita v3 apenas quando um blob fonte v3 é real, não alterar import/compatibilidade e não criar fallback semântico.
- A rota de inspeção v3 do L1a segue em 410 antes de qualquer Blob.

## Falsificações obrigatórias

1. Os testes offline `test-v5-publication-migration.js` e `test-v5-offline-rehearsal.js` continuam exercitando o algoritmo histórico e o round-trip, sem exigir que esteja carregado no endpoint vivo.
2. Os testes de endpoint exercitam `publish-v5-migration` com admin e v3 fake store: 410, zero writes. Após isso, PUT normal v5 já persistido incrementa revisão e confere readback; PUT v3 sobre v5 falha.
3. Nenhuma flag habilitável ou import do migrador permanece no endpoint vivo; a autenticação precede a recusa 410.
4. CI integral e preview Netlify verdes. Jamais testar o PUT aposentado contra armazenamento real de produção.

## Critério de parada

Se qualquer fluxo de backup/recovery, admin v5 ou leitura v3 demonstrar necessidade do despachante remoto, não fazer merge sem um contrato de recuperação explícito. Se passar, o próximo L1c deve abordar *separadamente* os escritores v3 e `persist-handles-all`, com atenção a rollback e instanciação a partir de v3; preferir compatibilidade deliberada ao invés de excluir recuperação. A migração de produção não deve ser repetida.
