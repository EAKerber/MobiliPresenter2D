# DS-04 v2 — Auditoria cromática por CSSOM e herança

**Repositório:** EAKerber/MobiliPresenter2D  
**Baseline lido:** `main` `67d31976c605c76c7ef10876d03fdeb17369ab78` (2026-10-16)  
**Status:** ferramenta executável construída; **teste real de fixtures PASS**; **site integral ainda NÃO executado**, pois a integração do repositório neste ambiente é somente leitura e o clone não pôde ser obtido localmente.  
**Ações:** nenhuma edição da aplicação, nenhuma branch, PR, deploy ou preview.

## 1. Por que a v1 falhou

A v1 verificava se havia declarações literais de cor e se a classe aparecia nos seletores de tema. Não calculava a composição de **fundo do ancestral + transparência + cor herdada do filho**. Isso explicava falsos negativos: um filho com `color: var(--text)` é aparentemente correto, mas é ilegível quando seu ancestral possui `background` escuro fixo e `--text` passa a escuro no light.

A v2 emprega Chromium **local**, com `Page.setDocumentContent` para injetar HTML e folhas CSS locais diretamente na engine do navegador, sem rede/servidor/deploy. Mede `getComputedStyle`, compõe RGBA de ancestrais, avalia proporções texto/fundo e registra estados light/dark em 390/1366px. Para um checkout disponível, analisa a **estrutura de oito rotas HTML** e dois cenários adicionais de DOM representativo (config, admin). **JS da aplicação não é executado**: classes e estados gerados pelos scripts exigem fixtures representativos ou runner separado; a ferramenta não deve ser anunciada como auditoria integral de DOM runtime.

## 2. Resultados medidos pela engine local em fixtures

Os exemplos de teste usam declarações cromáticas e hierarquias de elementos extraídas dos caminhos do repositório, mas montadas em documentos de teste **sintéticos**. Os números abaixo são demonstrações de **computed style real** da engine, não medições de produção.

| Origem real / seletor | Tema | Contraste medido no fixture | Diagnóstico |
|---|---|---:|---|
| `config/index.html:90-94` + `styles.css:260-264`: `.layer-status` e `#visibleCount` | Light | **1,00:1** | Texto branco translúcido sobre `.viewer-card` branco |
| `styles.css:248-259`: `#viewerHint` herdando `.viewer-card__footer` | Light | **1,00:1** | Texto secundário invisível |
| `styles.css:321-330`: `.module-number` | Light | **1,37:1** | Badge gerado: branco translúcido sobre cinza claro |
| `styles.css:586-592`: `.config-section > h3` | Light | **1,00:1** | Heading gerado em superfície clara |
| `styles.css:609-616`: `.price-state__breakdown dt` | Light | **1,05:1** | Rótulo de preço não tematizado |
| `styles.css:620-629` + `654-656`: `.flow-actions` / `.configuration-value strong` | Light, dock ativo | **1,11:1** | Preço quase preto em dock escuro fixo |
| Mesma barra de preço, `.configuration-value span` | Light, dock ativo | **3,42:1** | Texto secundário abaixo de AA para texto normal |
| `admin/admin.css:41`: `.item-option` | Light | **1,42:1** | Texto do dark sobre superfície clara |
| `admin/admin.css:29-30`: mensagem success | Light | **1,53:1** | Cor semântica fixa do dark |
| `admin/admin.css:29-30`: mensagem error | Light | **1,82:1** | Cor semântica fixa do dark |

Na amostra sintética houve **8 cenários** (2 fixtures × 2 resoluções × 2 modos). O teste automatizado da ferramenta verificou explicitamente os falsos negativos `visibleCount`, preço, opções e mensagens administrativas e passou. As porcentagens/conclusões não são extrapoláveis para o restante do DOM de produção.

## 3. Contador — defeito funcional além do CSS (issue #209)

`app/config/index.html:92` inicializa **8 de 8** literalmente. `app/data/configurator-settings.js:6-10` define sete módulos como itens da etapa `modules`, enquanto `lighting-08` pertence a `services`. `app/app.js:2147-2151` acrescenta `lighting-08` a `configured` se ele está disponível, influenciando numerador/denominador, embora o indicador esteja na área de seleção de módulos. **Não basta trocar o 8 por 7**: definir a semântica (módulos apenas, ou itens inclusive serviços), inicialização neutra, disponibilidade, seleção, dados publicados e dependências.

## 4. Novos falsos negativos encontrados após a v1

- **DS04-17 (P1, confirmado por CSS, reproduzido em fixture):** `.viewer-card__footer` e `.layer-status`, inclusive `#viewerHint`, ficam com textos claros sobre branco no light. O primeiro relatório não encontrou esse par de heranças.
- **DS04-18 (P1, confirmado por CSS, reproduzido em fixture):** `.module-number` usa `rgba(255,255,255,.65)` e fundo `rgba(0,0,0,.2)` independente do tema, tornando-se cinza-claro sobre cinza-claro quando o card passa ao light.
- **DS04-19 (P1, já candidatado como DS04-08, promovido a comprovado):** dock de preço com fundo escuro fixo e texto escuro herdado no tema claro; a v2 detecta o par.
- **DS04-20 (P1, já candidatado como DS04-07, comprovado):** `.price-state__breakdown dt` permanece branco translúcido no light, com contraste demonstrativo ~1,05:1.
- **DS04-21 (P1, já candidatado como DS04-06, comprovado):** títulos de seção gerados com branco translúcido em card claro, ~1:1.
- **DS04-22 (P1, confirmação adicional):** mensagens admin error/success em paleta dark continuam ilegíveis no light.

**Não somar as reclassificações como bugs novos independentes**: os novos registros realmente adicionais são DS04-17/18 e o defeito funcional da contagem (#209).

## 5. O que ainda falta para cobertura auditável

1. Executar `node theme_cssom_v2.cjs /caminho/do/clone /caminho/saida` com um **checkout da main** e verificar por rota `loaded`, `candidates`, `uncertain` e DOM ausente (sem afirmar PASS para conteúdo não gerado).
2. Adicionar **fixtures DOM originadas dos renderizadores reais** de `app/app.js` e `app/admin/admin.js`, alimentadas por dados publicados de teste; não assumir que o elemento existe porque há classe JS. Isolar APIs privadas e não escrever dados.
3. Comparar os *estados*: `is-active`, `is-selected`, `is-unavailable`, `is-blocked`, disabled, focus, expanded, hover, menu aberto, dock ativo/inativo, zoom, acesso autorizado/não autorizado.
4. Comparar **contraste de ícones, contornos, pseudo-elementos e elementos não textuais** (WCAG 3:1 quando aplicável). O runner atual testa texto direto; backgrounds com imagens, filtros e blends recebem indicação `uncertain` e exigem teste específico.
5. Realizar `auto` resolvido sob `prefers-color-scheme=light/dark` com bootstrap real; v2 apenas força `data-theme` em documentos estáticos, validando as regras light/dark.
6. Testar os estados 320/768 além de 390/1366. O script tem a lista de larguras editável e não cria previews.
7. Após corrigir as P1, rodar o mesmo comando como gate em CI sem publicar preview, com baseline explícito para exceções legítimas (materiais/scene/ilustrações).

## 6. Executar e validar

Requer Node.js 22+ e Chromium local. Não usa packages npm, acesso externo nem contas:

```
node theme_cssom_v2.cjs /caminho/para/MobiliPresenter2D /tmp/ds04-cssom
node test_cssom_v2.cjs
```

Saídas: `cssom_results.json`, `cssom_pairs.csv`, `structural_checks.json`. A execução é somente leitura sobre o checkout; escreve exclusivamente na pasta de saída. Para um ensaio rápido, pode passar `DS04_ROUTES=/config/,/admin.html`.

Os arquivos sob `_fixture/` são **casos sintéticos**, não cópias completas da aplicação. A v1 (`theme_audit_v1.cjs`) permanece inclusa apenas para triagem lexical.

**Referências:** [issue #208](https://github.com/EAKerber/MobiliPresenter2D/issues/208), [issue #209](https://github.com/EAKerber/MobiliPresenter2D/issues/209).