# CP-SD-06L0 — pós-publicação v5: aceitação visual e auditoria de legado — 2026-10-07

Status: **ACEITE VISUAL MANUAL REGISTRADO; AUDITORIA ESTÁTICA CONCLUÍDA; REMOÇÃO DE LEGADO NÃO INICIADA**.

## Evidência recebida

Após a publicação autenticada de `ConfiguratorAdministration2D 5.0` revisão 7, confirmação de gravação/leitura do servidor e retirada da operação temporária via PR #165, o operador avaliou o configurador de produção e informou: **“nenhum problema que eu tenha notado”**.

Interpretação: **aceite funcional/visual manual sem defeitos percebidos no uso observado**, suficiente para encerrar o *gate de aceite humano* da publicação. Isso **não equivale** a afirmar que cada viewport, navegador, regra, preço ou ação foi testado individualmente. Os gates automáticos anteriores cobrem testes de browser, contrato, preços, layout e assets; a inspeção manual complementa, não substitui, essa evidência.

Artefato do cutover: `docs/backlog/schema-driven-ui-cp-sd-06a2-live-cutover-evidence-2026-10-07.md`. Backup privado da revisão v3 6 permanece sob guarda do operador. Nenhum teste ou gravação de produção foi feito neste L0.

## Auditoria do código vivo após a publicação

| Caminho observado na main | Papel atual | Classificação | Próxima decisão |
|---|---|---|---|
| `netlify/functions/configuration.mjs`: leitura `GET` via `readPublished()` para v3/v5 | Compatibilidade com documento legado ou falta de blob | Compatibilidade de armazenamento | Manter até definir claramente o contrato para instalação vazia, restaurar backup e reimportar v3 |
| `netlify/functions/configuration.mjs`: `PUT` nativo v5 com ETag/readback | Caminho normal atual do admin | **Autoridade atual** | Preservar; não alterar |
| `netlify/functions/configuration.mjs`: `PUT` normal v3 e `persist-handles-all` | Escrita somente quando o blob armazenado é v3; contém lógica de correção isolada dos Puxadores | Candidato a aposentadoria do *escritor v3* | Revisar segurança de instalação/rollback antes de remover; não confundir com importação de documentos históricos |
| `netlify/functions/configuration.mjs`: `GET ?inspection=v5-preflight` | Ferramenta protegida de preflight que só aceita fonte v3 | Instrumentação histórica | Avaliar retirada do endpoint após preservar prova offline e não depender mais dele em operação corrente |
| `app/admin/admin.js`: ramo Save `publishedSource.schemaVersion === hierarchyCore.SCHEMA` | Persistência nativa de v5 | **Autoridade atual** | Preservar |
| `app/admin/admin.js`: `projectToLegacy()` e botão `persistHandlesButton` | Edição/persistência v3, só quando a fonte ainda é v3 | Compatibilidade + migração histórica | Definir se a UI deve manter edição de instâncias v3 importadas; remover só após cobertura negativa |
| `app/core/published-buyer-projection.js` | Normaliza v3/v5 para o comprador e produz projeção visual onde necessária | Compatibilidade de entrada + adaptadores de UI | Preservar compatibilidade de leitura enquanto suportada; não confundir projeção plana com autoridade semântica duplicada |
| `app/core/configuration.js` e `app/core/administration-v5.js` | Normalização, conversão e projeção typed↔legacy | Contrato de migração/importação | **Não excluir** enquanto testes históricos, importação e reconstrução dependem dessas funções |
| `app/core/v5-publication-migration.js` e ferramentas de preflight | Migração determinística testada e auditável, embora a rota única já tenha sido removida | Ferramenta histórica/offline | Preservar ou arquivar deliberadamente; não religar rotas de gravação |

Fonte: inspeção estática dos arquivos da `main` após PR #166; **não** se realizou nova leitura de dados de produção nesta auditoria.

## Critérios para eventual CP-SD-06L1

1. Encontrar todas as referências reais às rotas e símbolos selecionados. Demonstrar que nenhum consumidor ativo ou teste de recuperação necessita dos caminhos propostos para remoção.
2. Distinguir explicitamente *leitura/importação v3*, *migração histórica*, *fallback de instalação sem blob*, *escrita/edição de v3* e *autoridade normal v5*. Retirar apenas o que não tem consumidor legítimo.
3. Provar `v5 GET → buyer`, `v5 admin Save com ETag e strong readback`, recusa de downgrade v3→v5, ausência de fallback semântico e equivalência de preços/estado. Preservar recuperação por backup e a documentação de migração.
4. Incluir teste negativo para a rota obsoleta, controles de autorização e ausência de qualquer nova rota que permita `PUT` v3 em cima de v5.
5. Executar os gates integrais de GitHub e Netlify preview; publicar documentação dos contratos substituídos e recuos. Nenhum teste destrutivo em produção.
6. **Gate de proporcionalidade:** não remover um caminho legado apenas por ele existir. Se o risco de indisponibilizar backup/importação supera a redução de complexidade, classificar como compatibilidade deliberada e **encerrar sem mudança de runtime**.

## Resultado e próximo recorte

A migração produtiva **já foi concluída e aceita visualmente pelo operador**. O L0 fecha somente o aceite humano e registra o inventário de riscos. Para L1, priorizar o menor recorte com benefício verificável: avaliar o preflight administrativo exclusivamente v3 e a correção `persist-handles-all`, sem alterar o leitor v3/v5, o escritor nativo v5 ou a compatibilidade de importação.

Não há razão para repetir a migração, escrever dados de produção ou apagar o backup. L1 exige decisão após uma descoberta de referências e gate de custo/risco.
