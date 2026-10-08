# CP-SD-06L1c — contrato de recuperação v3 e bloqueio de regressão v5 — 2026-10-07

Status: IMPLEMENTED IN PR / CI PENDING. **Decisão: RETER compatibilidade de leitura/escrita v3 sob fonte v3, não reativar migração.**

## Questão analisada

Após a conclusão da migração em produção (`ConfiguratorAdministration2D 5.0`, revisão 7) e a aposentadoria das duas superfícies específicas de migração nos PRs #168 (preflight remoto) e #169 (despachante remoto v3→v5), o servidor ainda possui uma lógica de `PUT` v3 e o reparo histórico `persist-handles-all`.

Esses ramos só são alcançados quando a fonte armazenada é realmente v3. Quando já existe um documento v5 validado, o roteador entra antecipadamente em `v5NormalSave.savePublishedV5`; o campo `X-Configuration-Operation` legado não pode rebaixar o documento. A retirada integral do writer v3 removeria também uma capacidade de recuperação de uma instância/restauração histórica v3, sem benefício demonstrável para a produção atual v5.

## Decisão de proporcionalidade

**Não remover os ramos de escrita v3 nem o leitor v3 nesta etapa.** Classificá-los como *compatibilidade deliberada e condicional*, não autoridade principal de publicação. Excluí-los exigiria uma API alternativa de recuperação com testes de backup/importação, que não faz parte do aceite pós-cutover.

O contrato vigente é:
- `GET /api/configuration` continua a aceitar v3 ou v5 válidos conforme fonte (ou fallback histórico exclusivamente documentado para ausente/inválido v3).
- `PUT` com fonte v5 é **nativo v5**, com validação, ETag CAS e readback; v3 não pode rebaixá-lo.
- `PUT` com `persist-handles-all` e fonte v5 deve falhar **422**, sem escrita, pois reparo v3 não existe em v5.
- `PUT` com `publish-v5-migration` deve falhar **410**, sem escrita, em qualquer fonte; a migração original não é reativável.
- O backup original v3, as ferramentas puras de conversão/preflight e a compatibilidade de importação permanecem preservados.
- O comportamento do writer v3 não deve ser considerado seguro para múltiplos autores concorrentes; Netlify Blobs não é uma base transacional. Qualquer restauração v3 é um procedimento revisado, não um processo automático.

## Prova negativa adicionada

No teste de endpoint real com stores/Identity simulados:
1. Carregar fonte v5 e executar um Save nativo (incremento +1, strong readback).
2. Tentar gravar documento v3 sem operação: rejeitar downgrade, zero writes adicionais.
3. Tentar `persist-handles-all` em v5: rejeitar com 422, zero writes adicionais.
4. Tentar `publish-v5-migration` em v5: rejeitar com 410, zero writes adicionais.
5. Repetir o GET público e exigir **igualdade exata** com o v5 salvo antes das três tentativas.

As validações executam somente em memória. Não usar o site de produção como fixture e não modificar preço/catálogo como teste.

## Próxima fronteira

A limpeza de legado específico da migração está concluída após gates de L1a/b/c. Encerrar CP-SD-06 como **schema v5 publicado + aceito**, mantendo os contratos históricos necessários à recuperação. Novos trabalhos como landing/viewer, novos módulos e regras de produto seguem outros recortes. Se houver uma necessidade futura de remover `PUT` v3, exigir antes uma solução de restauração comprovada e separada, sem permitir downgrade de v5 já armazenado.
