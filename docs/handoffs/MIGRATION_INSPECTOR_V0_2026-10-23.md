# Migration Inspector V0 — evidência estática conservadora

**Branch de preparação:** tooling/migration-inspector-v0-20261023 (produto, isolada da main). **Sem PR, deploy, alteração de runtime ou permissões.**

## Motivação

V0-A/V0-B do Design System mapearam consumidores e candidatos. V2/V3/V4 exigem repetir o mesmo trabalho por componente. Esta ferramenta produz uma fotografia reexecutável do subconjunto confirmado diretamente por HTML estático, sem transformar heurísticas em homologação nem duplicar autoridades do Design System.

### Uso (Node ≥20, zero dependências)

    node tools/migration-inspector.mjs --focus site-header --out /tmp/migration-inspector.json

    node tools/migration-inspector.mjs --changed app/ui-theme.css --focus menu-toggle > /tmp/impacto.json

    node --test tests/migration-inspector.test.mjs

O padrão é **somente leitura** e imprime JSON determinístico em stdout. --out grava apenas no caminho explicitamente escolhido. Um manifesto contém as páginas primárias, script/style referenciados diretamente (normalizando caminho relativo, raiz e query strings), hashes de arquivos texto lidos, dependências compartilhadas, candidatos de classes CSS lexicais que co-carregam, e consumidores diretos de caminhos fornecidos em --changed. Classes compartilhadas são apenas **candidatos de investigação**, não erros nem duplicações de autoridade.

### Não promete / regras de segurança

- **Não é um parser HTML/CSS completo.** Não descobre imports JS/CSS, carregamento dinâmico, DOM criado após JS, CSSOM efetivo, bundling, rewrites Netlify, nem consumidores sob autenticação. O resultado registra NOT_TRACED e NOT_INFERRED.
- **Impacto positivo apenas:** ausência de um consumidor direto **jamais** autoriza dispensar gate. Modificações de estilo compartilhado, navegação, autenticação e domínio têm gates funcionais/visuais obrigatórios segundo ARC-15 e CI-BASELINE-01.
- Não altera decisions.json, não homologa valores de cor nem deduz ownership a partir de nome de arquivo. Owner, decisões, nível semântico e status real devem ser reconciliados com o DS.
- Não examina segredos, não executa JS do produto, não lê registros de usuário, não envia nada pela rede e não cria previews.
- Rotas faltantes/referências quebradas são diagnósticos **para confirmação**; páginas podem ser reescritas pelo build e um 404 estático não é por si só bug de produção.

### Próxima etapa — condicionada à utilidade demonstrada

Confrontar o relatório com a matriz V0-A/V0-B, selecionar um único piloto (menu primário NAV-004 versus Viewer NAV-005), acrescentar owners/contratos **explicitamente revisados** e correlacionar os testes já existentes. Não fazer seleção automática negativa de gates até haver grafo de imports, testes de cobertura e controles de mudanças dinâmicas. Só ampliar o Inspector se reduzir o tempo de triagem sem aumentar falsos negativos.

### Separação de autenticação

O Inspector não necessita login. Para teste protegido, conservar a identidade temporária de acesso apenas ao Configurador no preview #235, via segredo do GitHub Environment, com revogação/validação de sessão. **Não pedir nem armazenar senha de usuário**. Administração requer um plano separado, privilegiado e revogável; não reutilizar o convite do Configurador como autorização admin.
