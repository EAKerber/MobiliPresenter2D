# Bloco 13 — reconciliação NAV-004/NAV-005 com precedência de intenção e implementação (27/10/2026)

**Regra normativa do usuário:** entre implementações da mesma funcionalidade, preferir a mais recente e considerar a intenção declarada mais recente. Homologações de layout têm prioridade sobre uma branch mais antiga, sem dispensar prova de regressão.

## Separação de autoridades

- **NAV-004 — header público de primeiro nível:** fragmento `architecture/fragments/primary-header.fragment.html`, com `architecture/fragments/primary-header.routes.json` em estado `BUILD_AUTHORITATIVE_ARC03C`. Abrange exatamente `/`, `/about/`, `/how-it-works/`. O Viewer e páginas privadas estão expressamente excluídos.
- **NAV-005 — Viewer funcional de profundidade 2:** header próprio `app/viewer/index.html`. A intenção explícita posterior é **logo à esquerda; à direita “← Ambientes”, seletor de tema e menu, nesta ordem**. O Viewer não pode exibir “Ambientes” como página ativa. A largura de 320px ainda deve manter uma única linha, foco e controles acessíveis.
- **Controlador de menu compartilhado:** `app/landing/header-menu.js` usado em páginas públicas, incluindo Viewer, com `aria-expanded`, Escape, retorno de foco, fechamento por link e clique externo. Sem duplicar controladores nem restaurar variantes experimentais como autoridade.

## Fonte histórica NAV-005

`fix/viewer-secondary-header-nav005-20261021@10445ad8c20ac1a415f4ba463345eda83bd7e9a6`, referente a cinco caminhos de contribuição:
`.github/workflows/viewer-secondary-header-isolated.yml`,
`app/core/ui-theme.js`,
`app/viewer/index.html`,
`app/viewer/viewer.css`,
`tests/viewer-secondary-header-browser-gate.mjs`.

| Dimensão | Fonte antiga | Estado mais recente em development | Decisão |
| --- | --- | --- | --- |
| Tema compartilhado | `app/core/ui-theme.js`, blob `bb12be03221e3fefa45dd2918df049bc5ccd5c64` | **Mesmo blob** e um seletor inserido antes do menu | **KEEP_CURRENT** |
| Localização de Ambientes | `.viewer-header__context`, junto ao logo | `.viewer-header__actions`, antes de tema/menu | **KEEP_NEWER**, obedece intenção explícita posterior |
| Estilos responsivos | Seletores `.viewer-header__context .back-link` | `.viewer-header__actions .back-link`, outros ajustes mais recentes de layout e cena | **KEEP_NEWER** |
| Cabeçalho e scripts do Viewer | HTML e asset versions antigos, antes de correções de cena/preços | HTML atualizado, preço e fallback mantidos | **KEEP_NEWER**, não sobrescrever DTO nem runtime |
| Teste de Viewer | 20 cenários, checagens de foco, tema e largura | Mesma cobertura e **asserções adicionais** que exigem link na ação direita, diretamente antes do tema; foco e semântica preservados | **KEEP_NEWER** |
| Workflow histórico | Preso à ref antiga, browsers instalados por job | Novo workflow isolado em branch de consolidação, com prova de SHA e gate local de 68 cenários; não depende da ref antiga | **REPLACE_AND_ARCHIVE** após gate |

## Demais ramos do cluster — não confundir alcance

- `architecture/arc03-primary-header-fragment-prototype-20261022@e459b9bd85c4e9c8bb96813ae6758789de75dc13`: o **fragmento HTML é exatamente o mesmo** (`25712fa6f2423372f076d041f9a7253ced088040`), mas as rotas históricas são `EXPERIMENTAL_BUILD_TIME_ONLY_NOT_PUBLISHED` e geram artefatos preview, enquanto as atuais usam fonte `architecture/pages/*` e são publicadas por ARC-03C. Há testes/scripts históricos diferentes: **HOLD para revisão individual**, não copiar o compilador antigo.
- `architecture/p-comp-01-public-menu-20261021@4ba9384733a8cb46ad8a6c7c8ef3b9aebe25cd93`: controlador do menu com mesmas intenções, mas fontes/testes e versões das páginas divergem; **HOLD** até comparar o contrato completo da geração e navegação, não restaurar páginas antigas.
- `experiment/shared-public-header-controller-20261020@fdeb931af285f6cf76795ccdd50a8b75d0f25aef`: experimento precursor; interface compartilhada depois generalizada. **HOLD** até prova independente que não sobram responsabilidades exclusivas.
- `fix/viewer-secondary-header-nav005-20261021` é o único alvo desta rodada; não transferir conclusão para arquitetura, tema, auth ou outros ramos.

## Gate e provas de segurança

`tools/development_nav005_semantic_audit.py` é **read-only** e pinado por SHA, compara o escopo integral da fonte, valida JS de tema idêntico, verifica que o header antigo punha “Ambientes” à esquerda e o atual à direita, que o fragmento público exclui o Viewer, e que o teste atual tem as asserções adicionais de ordem e layout. Não manipula backend nem autenticação.

`.github/workflows/development-viewer-nav005-semantic.yml` exercita offline:
- **48 cenários** de navegação pública: 4 rotas × 3 larguras × 2 temas × 2 engines (Chromium/WebKit), incluindo marcação ativa, foco, teclado, menu e modal de benefícios.
- **20 cenários** específicos do Viewer: 5 larguras (320, 390, 486, 768, 1366) × 2 temas × 2 engines, incluindo proximidade do botão de tema, layout uma linha, ausência de overflow, controles, interações e capturas.

**Nenhum deploy Netlify** e nenhuma mudança no runtime. Para aposentar a fonte: PASS do gate na auxiliar e depois na development, arquivar `archive/m2d/viewer-nav005-10445ad8` apontando ao commit histórico acima antes de excluir. Exigir também SHA lease, 12 PRs preservadas, Git rulesets e proteção. A auxiliar absorvida pode ser retirada apenas se ancestral da development.

**Status inicial:** fonte comparada, gate preparado, classificação candidata `SEMANTIC_SUPERSEDED`; retirar somente após provas de browser e auditoria de higiene.


## Primeiro gate efetivamente aprovado

- [GitHub Actions #40614274549](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40614274549) **PASS** no SHA de prova `f3194755adf19a8ad703ddc7e7e852918d6d2b7f`. A ferramenta `tools/development_nav005_semantic_audit.py` provou que os cinco caminhos históricos estão pinados, a implementação de tema tem blob idêntico e a intenção posterior é satisfeita sem reintroduzir a posição antiga do link.
- Browser local: **48 cenários de header público e 20 específicos do Viewer**, Chromium e WebKit. Testou foco, Escape, clique externo, links, 320/390/486/768/1366px (Viewer), tema claro/escuro, header de profundidade dois, marcação ativa ausente e ausência de overflow; nenhuma alteração de runtime. Artifact `development-nav005-semantic-40614274549`, ID `12784741632`.
- Os ramos `architecture/arc03-primary-header-fragment-prototype-20261022`, `architecture/p-comp-01-public-menu-20261021` e `experiment/shared-public-header-controller-20261020` continuam em HOLD para reconciliação individual; **o PASS de NAV-005 não deve justificar a exclusão deles**.
- Integração recomendada: fast-forward com lease na `development`, repetir o gate, e somente então submeter à higiene `fix/viewer-secondary-header-nav005-20261021@10445ad8c20ac1a415f4ba463345eda83bd7e9a6` com tag `archive/m2d/viewer-nav005-10445ad8`. A auxiliar só poderá ser retirada se ancestral de development e se passar o roster completo.
