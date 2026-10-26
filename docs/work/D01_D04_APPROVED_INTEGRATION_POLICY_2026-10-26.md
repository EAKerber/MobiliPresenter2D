# D01–D04 — política aprovada de integração e consolidação (2026-10-26)

Decisões explícitas do usuário; documento normativo deste ciclo. Confirmadas também no repositório Design System (docs/APPROVALS_D01_D04_2026-10-26.md). Não reabrir escolhas visuais anteriormente encerradas.

| ID | Opção do usuário | Aplicação no produto |
| --- | --- | --- |
| **D01 A** | Integração incremental após gates técnicos | Uma PR de cada vez, rechecando a head, origem de tokens/artefatos e gates relevantes; evitar deploy previews redundantes. Não promover em lote as PRs Draft antigas. |
| **D02 B** | Aceitar testes isolados inicialmente | Um gate local/isolado representativo pode suportar a **primeira integração**, sem exigir smoke test autenticado real universal. Isso **não dispensa** testes de segurança, permissões mínimas, não vazamento, falha fechada e revogação, nem permite descrever runtime autenticado real como verificado quando não foi. Publicação/release pode demandar evidência adicional conforme risco. |
| **D03 A** | Extrair conteúdo útil e encerrar PRs CP-PUBLIC substituídas | Rastrear SHA e destino de arquivos, verificar cobertura de contratos, preservar o material histórico; encerrar PRs antigas **após** identificar e extrair conteúdo necessário, sem incorporar automaticamente código antigo de acesso. Não excluir branches divergentes só porque PRs foram fechadas. |
| **D04 A** | Consolidação seletiva do handover DS | Usar a extração por proveniência da PR DS #51 (primeiros sete documentos importados na PR DS #56); manter o restante preservado enquanto não foi classificado. Não mesclar 814 commits/centenas de evidências como um bloco. |

## Estado de execução

- Design System #52 (VIS-002C v0.3) integrada primeiro, commit DS main 9324bbcff78839a5c2b8e715c40654ea7c3f4c54. Ver gate scoped-artifact anterior à integração.
- Produto #241 depende da distribuição DS e tem gate de artefato, raster e 152 verificações de fallback. Um job de teclado em uma run anterior foi cancelado; não inferir aprovação de todos os checks a partir dos verdes remanescentes. Rechecar antes de integrar.
- #242 (Viewer), #243 (carrossel), #244 (header privado) exigem rechecagem de dependência/gates e mesclagem individual quando aptas.
- #238 autenticação isolada: D02=B admite validação isolada inicial; qualquer falha de contrato, autorização, ambiente ou gate de CI continua sendo bloqueio técnico. Não conceder acesso privilegiado ou usar banco de produção por conveniência.
- CP-PUBLIC #181 e #183: quatro documentos históricos extraídos sem edição; ver docs/work/CP_PUBLIC_D03_EXTRACTION_LEDGER_2026-10-26.md. A situação das PRs deve depender do recibo e da reconciliação dos outros arquivos.
- Alterações ao runtime e produção só quando a PR correspondente passar gates; esta documentação não altera código nem constitui autorização de exclusão de branches.

## Estados distintos

DECISION_APPROVED ≠ CHECKS_PASS ≠ MERGED ≠ DEPLOYED; SUPERSEDED ≠ CONTENT_RECONCILED; TEST_ISOLATED_PASS ≠ AUTHENTICATED_RUNTIME_VERIFIED; VISUAL_CLOSED ≠ RELEASE_APPROVED.
