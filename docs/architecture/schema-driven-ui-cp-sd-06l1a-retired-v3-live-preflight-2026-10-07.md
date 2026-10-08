# CP-SD-06L1a — aposentadoria da inspeção v3 exclusiva na API pública — 2026-10-07

Status: **IMPLEMENTED IN PR / CI PENDING**. Sem consulta ou gravação do Blob de produção.

## Descoberta e decisão

Após a migração validada de v3 rev6 para v5 rev7 e o aceite visual pelo operador, a rota autenticada `GET /api/configuration?inspection=v5-preflight` deixou de produzir um candidato publicável no armazenamento corrente: a operação só aceita **fonte v3**, enquanto a produção agora persiste **v5**.

Os consumidores originais desse GET foram o procedimento manual de migração e o botão temporário de PR #164; o último foi removido na PR #165. Na inspeção do código vivo, o admin normal e o comprador acessam `GET /api/configuration` sem query de preflight. O serviço puro `app/core/v5-publication-inspection.js` e o compilador `app/tools/v5-publication-preflight.js` ainda são necessários ao replay e à recuperação offline. **Não remover** esse código nem a compatibilidade v3 de leitura/importação.

Há um motivo concreto para retirar o handler remoto: ele permitia expor ao admin um candidato integral de conversão e ETag da fonte histórica, embora a transação já tenha sido concluída. A interface de API não deve continuar oferecendo uma operação de migração sem caso de uso vivo.

## Mudança estritamente delimitada

- A URL histórica `?inspection=v5-preflight` responde **410** com `{ "error": "v5_preflight_retired" }` para qualquer usuário, inclusive admin. Não abre nem lê um Blob e não devolve ETag, candidato ou dados privados.
- Outros valores `?inspection=...` continuam rejeitados com **422**; nunca são reinterpretados como um GET normal.
- `GET /api/configuration` sem inspection permanece idêntico para v3/v5 e fallback legado documentado.
- O `PUT` nativo v5 e seu ETag/readback, e o bloqueio da operação `publish-v5-migration`, permanecem intactos.
- O serviço de preflight e seu teste unitário continuam disponíveis **offline**, inclusive para um backup v3. A rotina `persist-handles-all` e o escritor v3 não são alterados neste recorte.

## Gates

1. Testar um GET comum por usuário anônimo: resposta de configuração sem ETag/candidato.
2. Testar URL aposentada para anônimo, usuário comum e admin: 410, sem qualquer store aberto, leitura ou gravação.
3. Testar inspection desconhecido: 422 sem fallback público.
4. Testar caminho normal v5: PUT autorizado + revisão +1 + readback e recusa de downgrade v3.
5. Testar que a operação especial de migração ainda retorna 403, mesmo autenticada, e não escreve.
6. Executar os gates de CI do repositório e o preview Netlify. Não chamar a rota contra produção para simular gravações.

## Parada e continuidade

Se remover este GET quebrar o admin, buyer, CI ou recuperação offline, **reverter** o recorte. Se o gate passar, manter como compatibilidade deliberada os caminhos de leitura/importação v3, os validadores/compiladores e o writer nativo v5. O eventual próximo L1b deve avaliar separadamente a própria branch `publish-v5-migration` hard-OFF no servidor e o escritor legado v3, começando pelo menor caso seguro e testes negativos. **Não habilitar migração v3→v5 em produção novamente.**
