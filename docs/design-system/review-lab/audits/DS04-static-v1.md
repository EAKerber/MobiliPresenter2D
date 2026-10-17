# DS-04 — Vistoria estática light/dark do MobiliPresenter2D

**Referência imutável:** `EAKerber/MobiliPresenter2D` `main` em `67d31976c605c76c7ef10876d03fdeb17369ab78`.
**Método:** leitura das sete folhas CSS principais, oito HTML de rotas e do JavaScript que gera classes/elementos (landing, how-it-works, viewer, config, admin, access e geradores compartilhados). Sem browser, sem alteração de aplicativo, sem PR ou deploy.
**Limites:** inferências sobre contraste/fundo são baseadas na cascata e tokens visíveis; a auditoria não executa DOM, não prova todos os estados CSSOM nem substitui o gate renderizado. Classes geradas condicionalmente exigem os dados/estados corretos para observação.

**Triagem:** 8 falhas P1 confirmadas pelo código; 3 P2; 1 P3; 4 grupos de exceções intencionais. P1 significa prioridade de correção, não incidente em produção confirmado por screenshot.

## Matriz consolidada

| ID | Pri. | Contexto | Diagnóstico | Evidência |
|---|---|---|---|---|
| DS04-01 | P1 | access | Página de confirmação de acesso fixada em light | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/access/index.html#L2) |
| DS04-02 | P1 | access | CTA principal branco sobre dourado claro no dark | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/access/manage.html#L31) |
| DS04-03 | P1 | admin | Item dinâmico permanece com texto dark-mode no light | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/admin/admin.css#L41) |
| DS04-04 | P1 | admin | Árvore e escolhas administrativas preservam letras claras no light | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/admin/admin.css#L64) |
| DS04-05 | P1 | admin | Feedback de formulário fica pouco legível no light | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/admin/admin.css#L29) |
| DS04-06 | P1 | config | Títulos de seções geradas usam branco translúcido no light | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/styles.css#L586) |
| DS04-07 | P1 | config | Rótulos de preço da seção de resumo ficam claros sobre light | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/styles.css#L615) |
| DS04-08 | P1 | config | Dock inferior mantém background escuro quando usuário escolhe light | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/styles.css#L620) |
| DS04-09 | P2 | admin | Numeração das etapas não acompanha a superfície clara | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/admin/admin.css#L32) |
| DS04-10 | P2 | config | Selecionado em catálogo depende de borda branca fixa | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/styles.css#L367) |
| DS04-11 | P2 | config | Grande família module-detail fixada na folha pálida para ambos os temas | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/styles.css#L448) |
| DS04-12 | P3 | viewer | Indicadores de paginação mobile usam cinza fixo | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/viewer/viewer.css#L107) |
| DS04-13 | ISENTO | public | Faixa de benefícios é deliberadamente escura nos dois temas | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/landing/landing.css#L62) |
| DS04-14 | ISENTO | public | Faixa Economia e encerramento usam superfícies escuras editoriais | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/how-it-works/how-it-works.css#L69) |
| DS04-15 | ISENTO | viewer | Cenas, acabamentos e recorte fotográfico não devem ser tematizados como UI | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/viewer/viewer.css#L31) |
| DS04-16 | ISENTO | admin | Swatches de material têm RGB definido pelos dados | [fonte](https://github.com/EAKerber/MobiliPresenter2D/blob/67d31976c605c76c7ef10876d03fdeb17369ab78/app/admin/admin.js#L850) |

## Detalhamento e gates

### DS04-01 — Página de confirmação de acesso fixada em light
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** <html data-theme="light">; imports apenas public-theme.css e access.js, sem bootstrap/tokens dark
**Direção:** Adicionar bootstrap/CSS compartilhado e logo/controle conforme contrato, mantendo auth intacto
**Gate:** Captura de ambos os temas e acesso válido/expirado

### DS04-02 — CTA principal branco sobre dourado claro no dark
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** button { color:white; background:var(--public-accent-dark) }; em dark --public-accent-dark:#e2c991; contraste branco 1.62:1
**Direção:** Usar cor de texto semântica contrastante por tema na ação primária
**Gate:** Contraste >=4.5:1 e foco/disabled

### DS04-03 — Item dinâmico permanece com texto dark-mode no light
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** .item-option gerado por admin/admin.js: color:#ddd8d0, background rgba(255,255,255,.025); tema light não substitui
**Direção:** Usar var(--text), var(--surface-raised) e var(--border)
**Gate:** Lista de etapas: texto >=4.5:1 em ambos os temas

### DS04-04 — Árvore e escolhas administrativas preservam letras claras no light
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** .hierarchy-choice-options summary e .hierarchy-choice-option (#ddd8d0), .hierarchy-name/.hierarchy-field/.hierarchy-move (#ded8cf), classes geradas em admin.js; tema light cobre fundos mas não as cores explícitas
**Direção:** Substituir por tokens de texto/linha por papel, sem tocar no estado do editor
**Gate:** Expandir hierarquias no tema claro, campos/títulos/opções com contraste

### DS04-05 — Feedback de formulário fica pouco legível no light
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** .message:#dfc9a8; [data-kind=error]:#ffaaa0; [data-kind=success]:#a9ddb6, nenhum override light; contraste no branco 1.53–1.82:1
**Direção:** Tokens semânticos de status light/dark para success/error/default
**Gate:** Alertas de login, edição e publicação nos dois temas

### DS04-06 — Títulos de seções geradas usam branco translúcido no light
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** .config-section > h3 { color:rgba(255,255,255,.58) }; DOM de etapas criado por app.js a partir de data-flow-section-*; fundo light claro
**Direção:** Usar var(--muted) com limiar verificado para cabeçalhos
**Gate:** Etapas de acabamentos e serviços em modo claro, inclusive via schema

### DS04-07 — Rótulos de preço da seção de resumo ficam claros sobre light
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** .price-state__breakdown dt { color:rgba(255,255,255,.68) } sem equivalente light
**Direção:** Usar token de texto secundário por tema, preservar estados de preço
**Gate:** Resumo e detalhamento de preço, contrastes claro/escuro

### DS04-08 — Dock inferior mantém background escuro quando usuário escolhe light
**Prioridade:** P1; **certeza:** confirmado.
**Evidência:** .flow-actions[data-bottom-dock-enabled=true] background:rgba(23,24,22,.96), mas .configuration-value strong usa var(--text) que se torna #22211f em light; DOM footer presente em config/index.html
**Direção:** Harmonizar background e texto do dock por tema, incluindo estado fixado no mobile
**Gate:** Estado com dock ativo em side-rail/stacked/compact, custo/preço legível

### DS04-09 — Numeração das etapas não acompanha a superfície clara
**Prioridade:** P2; **certeza:** evidencia_parcial.
**Evidência:** .stage-card__number color:#d6c9b9; alto risco visual no fundo light (aprox. 1.63:1 contra branco)
**Direção:** Adotar texto forte/mutado por tema mantendo hierarquia
**Gate:** Numeração de etapas em 320px e desktop

### DS04-10 — Selecionado em catálogo depende de borda branca fixa
**Prioridade:** P2; **certeza:** evidencia_parcial.
**Evidência:** .swatch.is-selected usa border-color:#fff e sombra clara em ambos temas; pode desaparecer com acabamentos claros
**Direção:** Tornar outline visual de seleção baseado em tema e contraste com material
**Gate:** Selecionar swatches escuros e claros em ambos os temas

### DS04-11 — Grande família module-detail fixada na folha pálida para ambos os temas
**Prioridade:** P2; **certeza:** excecao_pendente.
**Evidência:** .module-detail e filhos __technical, __views, __navigation e __requirements possuem dezenas de cores escuras/fundos claros fixos; ui-theme.css comenta exceção técnica intencional
**Direção:** Homologar explicitamente se toda a ficha deve ser light-neutral ou somente as vistas técnicas; não alterar dados/medidas
**Gate:** Alternância tema diante da ficha completa, contraste e semântica de estados

### DS04-12 — Indicadores de paginação mobile usam cinza fixo
**Prioridade:** P3; **certeza:** evidencia_parcial.
**Evidência:** .mobile-view-nav button background:#c9c3bb, ratio aprox. 1.75:1 contra branco; ativo usa token
**Direção:** Verificar se indicador inativo é informação relevante, adaptar token de contraste se for
**Gate:** Navegação entre vistas no light, mobile

### DS04-13 — Faixa de benefícios é deliberadamente escura nos dois temas
**Prioridade:** ISENTO; **certeza:** intencional.
**Evidência:** .benefit-strip e .benefit-item com contraste invertido fixo em ambos temas
**Direção:** Não converter automaticamente; manter como região editorial verificada
**Gate:** Registrar exceção em contrato visual

### DS04-14 — Faixa Economia e encerramento usam superfícies escuras editoriais
**Prioridade:** ISENTO; **certeza:** intencional.
**Evidência:** .economy-section, .economy-card, .closing-hero e camadas de foto definem cores deliberadas; contraste interno previsto
**Direção:** Preservar cores se contraste permanecer válido; não automatizar conversão
**Gate:** Inspeção contextual da composição

### DS04-15 — Cenas, acabamentos e recorte fotográfico não devem ser tematizados como UI
**Prioridade:** ISENTO; **certeza:** intencional.
**Evidência:** .scene-stage, .finish-layer, .structure-layer e .technical-view--focus mantêm valores da representação
**Direção:** Excluir de autofix; auditar somente overlays, controles e rótulos independentes
**Gate:** Sem alteração de imagem/material/cena

### DS04-16 — Swatches de material têm RGB definido pelos dados
**Prioridade:** ISENTO; **certeza:** intencional.
**Evidência:** style.backgroundColor/source.color e textureAsset representam materiais escolhidos, não surfaces de UI
**Direção:** Excluir recoloração por tema; auditar borda/legenda separadamente
**Gate:** Cores dos produtos invariáveis entre temas

## Verificações cruzadas

1. `app/core/ui-theme.js` implementa `auto/light/dark`, altera `html[data-theme]`, troca logos via `data-brand-variant` e atualiza a preferência persistida. Essa lógica é global nas rotas que importam o controlador, não no `access/index.html`.
2. `app/public-theme.css` estabelece variáveis claras; `app/ui-theme.css` modifica `--public-*` no dark. `app/styles.css` e `app/admin/admin.css` começam no dark; `app/ui-theme.css` injeta equivalentes light apenas em subconjuntos de seletores. O buraco principal está nos **valores literais locais**, que têm precedência sobre herança de tokens.
3. O DOM produzido por `app/app.js` usa `.config-section`, `.price-state__breakdown`, `.module-detail`, `.swatch` e `.flow-actions`; `app/admin/admin.js` gera `.item-option`, `.hierarchy-choice-option`, `.material-availability-option`, `.stage-card`, `.message` e similares. Portanto, não basta auditar os HTML estáticos.
4. Algumas declarações hardcoded são intencionais: materiais, swatches, camadas, SVG/cotas, fotografia, banners editoriais. O roteiro de auditoria **não deve** corrigir tudo que tenha hexadecimal.

## Ferramenta para recorrência

- Executar `node theme_audit.cjs CAMINHO_DO_CLONE PASTA_DE_RESULTADOS` (Node 18+, sem dependências).
- Gera `theme_candidates.json` e `.csv`, indicando classes utilizadas pelo DOM (estático ou presente em textos JS), valores literais de cor e existência lexical de regras de tema.
- É deliberadamente um filtro heurístico; falso positivo possível em CSS @media/nesting, seletores de descendentes e elementos condicionais. **Não aplica alterações.**
- Para transformar a triagem em gate de CI, acrescentar mais tarde parser CSS completo e, opcionalmente, DOM computado em ambiente de teste, após homologar as exceções.

## Ordem de intervenção proposta (sem autorização de código nesta rodada)

1. Corrigir contraste funcional P1 em Admin, Config e Access sem tocar autenticação/dados.
2. Resolver explicitamente a exceção da ficha `.module-detail` e os indicadores de estado.
3. Ajustar elementos auxiliares P2/P3 e revisar dark/light/auto em diferentes breakpoints.
4. Adicionar um gate estático baseado no inventário e um gate renderizado representativo; apenas após validação executar PR.