# DS-05A — Gate de componentes reais (protocolo, não concluído)

**Checkpoint:** 2026-10-17. **Objeto:** converter o laboratório v0.3/DS-04 v2 em verificação reproduzível da aplicação, sem screenshots manuais e sem adicionar seletores específicos para cada defeito. **Situação:** plano e ferramentas/fixtures existentes persistidos; **execução sobre DOM runtime real ainda pendente**.

## Hipótese e falha metodológica conhecida

A varredura lexical DS-04 v1 ignora composição entre fundo fixo em ancestral e `color: var(--text)` em descendente, herança de cores fixas, `rgba()` e estados CSS. Os três componentes de controle são: contador da cena `#visibleCount`/`#totalCount`, dock de preço/avanço `.flow-actions` e opções administrativas `.item-option`/`.message`. O auditor deve sinalizar contraste insuficiente genericamente a partir de pares computed foreground/effective background, **sem hardcode de cores ou resultados de contraste de cada seletor**. IDs desses componentes servem apenas como *golden probes* de avaliação de recall, não como regras de detecção.

## Gates

1. **G0 — integridade/isolamento.** Congelar SHA de `main`, manter o app inalterado, dados de produção fora do teste e saída em `/tmp`; verificar Node/Chromium/fixtures; nenhum `gh`, PR, preview/deploy.
2. **G1 — DOM de origem.** Carregar os HTMLs reais em contexto local e construir classes e elementos com as funções de JS reais (config/admin), usando configuração publicada **sintética válida**. Se runtime exigir Identity, isolar fixture derivada do renderizador sob teste. Registrar função, estado e proveniência de cada nó. HTML injetado sem JS não é DOM real.
3. **G2 — temas e estados.** Forçar `light`, `dark`, `auto` com `prefers-color-scheme` light/dark; largura 320/390/768/1366; hover/focus-visible/selected/disabled/expanded/error/empty/loading/dock ativo e inativo. Ausência de estado gera `NOT_COVERED`.
4. **G3 — CSSOM real.** Executar `getComputedStyle` em cada par texto/fundo; resolver especificidade/herança; compor transparência RGBA/ancestrais; medir WCAG (texto normal 4,5:1; grande e indicadores essenciais 3:1); registrar o primeiro ancestral que define fundo e a regra/variável. Imagens, gradientes, máscaras e mistura especial geram `UNCERTAIN` ou exceção delimitada, nunca `PASS` automático.
5. **G4 — recall sem sobreajuste.** Sem mudar o detector, ele deve reportar as violações conhecidas dos três componentes de controle e capturar regressões novas em classes dinâmicas desconhecidas. Guardar exemplos de acertos, falsos positivos, falsos negativos e estados não cobertos.
6. **G5 — integração documental.** Gerar matriz de evidências: rota, componente/família, modo, breakpoint, estado, seletor, HTML gerado, foreground, background efetivo, ratio, limiar, status, origem, recomendação. Conectar às 43 famílias do Design System v0.3; proposta A/B permanece revisão, não aprovação.
7. **G6 — decisão de adoção.** Só promover a ferramenta a gate canônico após sucesso com DOM realmente gerado, exceções declaradas e execução idempotente em CI sem publicar; falhas históricas conhecidas não devem ser confundidas com nova regressão.

## Problemas comprovados no baseline por leitura de fonte

- `app/config/index.html:92` inicia com **8 de 8** fixos; `app/data/configurator-settings.js` organiza 7 módulos e `lighting-08` em serviços; `app/app.js:2147–2151` mistura iluminação ao total do indicador. Questão **funcional**, vinculada à [#209](https://github.com/EAKerber/MobiliPresenter2D/issues/209); não trocar `8` por `7` arbitrariamente.
- `app/styles.css:248–264`: `.viewer-card__footer` e `.layer-status` usam branco transparente fixo; `ui-theme.css` torna `--surface` branco no tema claro. Reproduzido **em fixture**, contraste 1:1.
- `app/styles.css:620–656`: dock com fundo escuro fixo e `.configuration-value strong { color:var(--text) }`; em light, `--text` fica escuro. Reproduzido **em fixture** ~1,11:1.
- `app/admin/admin.css:29–41`: `.item-option` e `.message` com cores do dark fixas; em light ficam com contrastes demonstrativos 1,42:1 e 1,53:1.

## Critérios de não afirmação

- Não afirmar que **qualquer** seção passou se seu JS não rodou.
- Não afirmar cobertura total das oito rotas com teste apenas em HTML estático.
- Não afirmar que uma proposta de cor homologou tokens finais da identidade.
- Manter distintas evidências de fonte, fixtures Chromium, CSSOM do app real, screenshots do laboratório e QA manual em produção.

## Próxima execução concreta

Em ambiente capaz de materializar checkout completo, invocar o runner v2, inspecionar o relatório `cssom_pairs.csv` e construir fixtures derivadas de `app/app.js` e `app/admin/admin.js` antes de alterar a aplicação. Uma saída `fail` conhecida demonstra recall; um estado não montado não é sucesso. Persistir resultados e lacunas na [#208](https://github.com/EAKerber/MobiliPresenter2D/issues/208).