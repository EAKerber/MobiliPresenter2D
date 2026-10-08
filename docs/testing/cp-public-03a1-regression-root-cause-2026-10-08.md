# CP-PUBLIC-03a1 — análise causal das três falhas de navegador e auditoria dos testes

Data: 2026-10-08. Código: PR #182 (DRAFT/HOLD). Auditoria baseada no código atual e nos logs dos workflows no commit `b62c575eb283c69b9a4b55b6e92b59dc29f41f1d`. **Não classificar essas falhas como bugs de pedra, pricing ou PiP.**

## Linha causal comprovada

1. `netlify/functions/configuration.mjs` (PR #182): `accessGuard.authorize(request,{getIdentityUser:getUser})` ocorre **antes de `getConfigurationStore(context)`**. GET anônimo a `/api/configuration` ou `/.netlify/functions/configuration` responde `401 {error:"unauthorized"}`. Prova HTTP real: [workflow 37813263240](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37813263240), PASS.
2. `app/app.js`, seção de inicialização no fim do arquivo (linhas aproximadamente 2839–2853): o runtime chama `fetch("/api/configuration",{credentials:"same-origin",cache:"no-store"})`. Só `422` provoca exception/fail-closed. **Qualquer outro status não-200, inclusive 401, 403, 404 e 503, retorna `null`** com comentário de fallback legado; nenhum `applyConfiguratorSettings()` ocorre e a página não atribui `data-published-configuration-status="validated"` ou `"invalid"`.
3. Antes do `fetch`, `app/app.js` já construiu `initialAdministration = createDefaultAdministration(configuratorSettings,catalog,priceBook,scene)`, `pricingRules` a partir de `priceBook.pricing`, `state` e UI. O HTML carrega `data/mock-price-book.js` em script público. Após o GET 401, não existe bloqueio de workspace nem aviso de sessão. A UI continua **interativa usando dados locais**, mesmo sem confirmar a publicação v5. Esse é o **defeito funcional/de autorização significativo**, independente da mensagem no console.
4. Chrome/Playwright também produz `console.error: Failed to load resource: the server responded with a status of 401 ()`. Os três testes capturam mensagens `console.error` e exigem `errors === []` ao fim. Por isso falham embora suas interações e contas tenham passado até essa assertion.

## Onde cada teste falhou exatamente

| Workflow / evidência | Assertion que falhou | O que foi executado antes | O que a falha **não** demonstra |
| --- | --- | --- | --- |
| [Mobile 37813263239](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37813263239) | `tests/mobile-pip-main-browser.cjs:141`, `assert.deepEqual(stackedErrors,[])` | Perfil stacked, abertura manual de PiP, resize, drag, transparência, seleção do módulo 03, transições de breakpoint, screenshot | Não prova que PiP/breakpoints quebraram; a falha é no console do GET 401. O caminho compact é posterior à assertion e **não foi reexecutado até o fim nessa run**. |
| [Stone 37813263159](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37813263159) | `tests/stone-browser.cjs:251`, `assert.deepEqual(errors,[])` | Seleção de acabamento/pedra, toggle do rodapé, pixels e hash de canvas, matriz módulo 02/03 | Não demonstra regressão de máscaras/stone/plinth; todas as assertions anteriores chegaram ao fim com fallback local. |
| [Summary 37813263042](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37813263042) | `tests/summary-pricing-browser.cjs:146`, `assert.deepEqual(errors,[])` | Total inicial, breakdown módulos, cobrança única de rodapé, alternância de preço e seleção de pedra | Não demonstra divergência do algoritmo de preços; demonstra que a UI produz resultados **autoconsistentes com defaults locais**, sem prova de equivalência com preços v5 publicados. |

**Nuance:** o gate de console vazio está correto para um carregamento autenticado bem-sucedido; não deve ser simplesmente apagado nem ter o erro 401 ignorado. O problema é que hoje o teste **não verifica a origem da configuração** e o navegador ainda não tem sessão.

## O que os testes medem, e o que não medem

- Mobile: testa comportamento real de PiP, hit-testing, foco, swipe, dock e breakpoints. Usa IDs `module-03` e defaults da cena; **não** comprova que uma publicação v5 autorizada rege a navegação.
- Stone: testa decisões visuais da **UI do configurador**, incluindo `CONFIGURATOR_DEFAULTS.stages`, cores e IDs físicos fixos, além de pixels de canvas. **Não** é teste do viewer público, e não deve ser eliminado por decisão de que o viewer não replica pedra/rodapé. Esse teste continua correto para o comprador.
- Summary: valida aritmética de diferenças, subtotais e cobrança global **internamente consistentes**. O comentário `published estimate is visible` e o nome do teste exageram: checar presença de R$ não prova publicação. Deve validar proveniência de dados e comparar regras/preços injetados de fixture v5; mudanças de preços reais no ADM podem não ser detectadas.
- `tests/buyer-v5-browser.cjs` faz algo melhor em outra camada: intercepta o GET com fixture explícita v3/v5, exige `document.documentElement.dataset.publishedConfigurationStatus === "validated"`, compara fluxos e trata v5 inválido como `invalid` com workspace indisponível. **Mas não testa 401/403/503 nem autenticação real** e seu 200 é resposta `route.fulfill`, não Blob/Identity de produção.
- `tests/admin-v5-save-browser.cjs` e `tests/admin-hierarchy-browser.cjs` usam stubs de Identity e/ou endpoint; sucesso desses testes não confirma uma sessão admin real no Netlify.
- Gatilhos dos workflows Mobile/Stone/Summary (`.github/workflows/{mobile-browser,stone-browser,summary-pricing-browser}.yml`) monitoram `app/**`, seus testes e o YAML correspondente, **não `netlify/functions/configuration.mjs` nem `netlify/lib/**`**. Uma futura alteração **somente no backend** pode não executar essas regressões por `paths`; corrigir a cobertura de triggers ou criar suíte específica de integração.

## Conclusão de criticidade

- **P0:** fail-open **visual** da UI do comprador depois de 401/403/503 (o servidor não vazou raw v5, mas a página mantém controles e estimativa com dados locais); alta probabilidade de exibir proposta inconsistente e aparente autorização inexistente.
- **P0 de lançamento:** sem sessão e read model autorizado, não se deve ativar o GET protegido isoladamente na main.
- **P1 de testes:** três suítes de domínio são bons smoke/regression do baseline, porém carecem de contrato de dados de entrada. Os 5/8 workflows verdes/vermelhos da PR #182 não podem ser interpretados como paridade com publicação v5 real.

## Proposta de correção/gates

1. **Separar os contratos de teste.**
   - Unit/DOM sobre v5 fixture explicitamente declarada: ações de mobile, pedra e summary. Antes da primeira interação, exigir GET 200 de fixture legítima (ou harness autorizado), `publishedConfigurationStatus="validated"` **e sentinela v5 conhecido** (versão/revisão/edits) que prove que o runtime aplicou a fonte, não apenas defaults.
   - Auth/negativo contra endpoint Netlify real: usuário anônimo -> 401, role limitada -> 403, admin -> documento admin (sob Identity real), cookie cliente -> DTO mínimo. Validar duas URLs de acesso, ausência de vazamento, zero Blob read em negações e que erro HTTP nunca vira fallback interativo.
   - E2E comprador: ambiente preview isolado, publicação v5 explicitamente implantada, sessão legítima e browser verificado; testar R$ e opções sob mudanças autoradas, logout/expiração e bloqueio a 401/503.
2. **Eliminar fallback silencioso apenas nos caminhos HTTP protegidos**, com UX própria de login/expiração/erro, `role=alert` e workspace inoperante. `file://`/offline pode manter defaults *se claramente tratado como modo offline não publicável*.
3. Testes de asserções negativas em ambiente browser para `401/403/503`: preço e controles não acessíveis, estado de publicação `denied/unavailable`, sem dados de ADM nem UI enganosa. Manter `422` fail-closed.
4. Corrigir gatilhos CI para backend/rotas e incluir logs de `response.status`, `publishedConfigurationStatus`, revisão/sentinela e `sourceKind`; distinguir `auth` de `business UI` no nome dos jobs.
5. Só após fechar esses gates reabilitar workflows de compra sem ignorar `console.error` de rede. Não aplicar bypass de autorização só para tornar CI verde.

### Evidência de execução do diagnóstico

O [workflow real 37815057147](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37815057147) concluiu `success` **para a reprodução, não para o produto**. O log registrou:

```json
{"endpointHttpStatus":401,"publicationStatus":null,"workspaceInteractive":true,"estimateVisible":true,"visibleAlert":false,"modulesPresent":7,"stoneControlPresent":true,"debugStatePresent":true,"httpErrorReportedInConsole":true,"pageErrorCount":0}
```

Isso **prova no preview** que a falta de resposta autorizada não impediu a vitrine de compra e a estimativa locais. O navegador não lançou erro JavaScript; a única mensagem de console foi o recurso HTTP 401. Nem a exibição de R$ nem o sucesso da matriz de pedra mostram que valores do v5 real chegaram ao runtime.

### Observação sobre cobertura CI

A melhor prova de `publishedConfigurationStatus === "validated"` já existe em `tests/buyer-v5-browser.cjs`, mas ela é executada pelo workflow `.github/workflows/flow-layout-browser.yml`, cujo filtro `paths` cobre somente determinados arquivos do fluxo e apresentação e **não** `netlify/functions/configuration.mjs`, `netlify/lib/configuration-access.cjs` ou `app/package.json`. Por isso **não apareceu no conjunto de checks da PR #182**. Ainda que fosse executada, sua resposta `200` é interceptada pelo Playwright e não testaria a política real de acesso. Esse workflow deve ser acionado também por mudanças na fronteira de autenticação e deve coexistir com um teste sem mock para autorização/deploy.

## Experimento reproduzível

`tests/diagnostics/configuration-401-fallback.cjs` e `.github/workflows/configuration-fallback-diagnostic.yml` foram adicionados **temporariamente na PR #182**. Executam Chrome isolado contra somente `deploy-preview-182--mobilipresenter2d.netlify.app/`, sem login, POST, escrita ou produção. Capturam o GET real 401, o valor de `publishedConfigurationStatus`, estado interativo da workspace, preço, alertas e erro de console. O teste é **diagnóstico de um comportamento incorreto conhecido**: PASSE dele significa *reprodução do defeito*, não autorização para publicar. **Retirar ou substituir por negativo fail-closed antes de merge**.

## Contraprova A/B: mesmas suítes, dados v5 válidos

Realizado na PR #182 em 2026-10-08. Sem alterar `app/app.js`, o guard de API, o backend de produção ou qualquer asserção de pedra/preço/PiP, adicionamos o helper **opt-in e temporário** `tests/diagnostics/published-v5-browser-fixture.cjs`. Sob `CP_PUBLIC_DIAGNOSTIC_V5=1`, ele gera uma fixture `ConfiguratorAdministration2D 5.0` validada, intercepta apenas o GET dentro do Playwright e exige `publishedConfigurationStatus="validated"` e `CASA_NORMALIZED_FLOW.source.schemaVersion="ConfiguratorAdministration2D 5.0"` antes dos testes de interação.

A [execução 37815673306](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37815673306) terminou **SUCCESS** e percorreu sequencialmente **os três scripts completos existentes**, `tests/stone-browser.cjs`, `tests/summary-pricing-browser.cjs` e `tests/mobile-pip-main-browser.cjs`, produzindo [screenshots/artefatos](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37815673306/artifacts/11567655194). Como os scripts são executados sob `set -e` e o passo alcançou o marcador final `3 business UI suites exercised ...`, todas as assertions comerciais e de UI executadas nessa repetição passaram.

| Cenário | Fonte de dados | Resultado |
| --- | --- | --- |
| Browser padrão da PR #182 | GET real anônimo = `401`; fallback interno não validado | 3 falhas, todas na `console.errors===[]`; diagnóstico separado registra workspace/preço indevidamente ativos |
| Browser de domínio controlado | GET **interceptado** com fixture v5 válida; estado `validated` requerido | **Stone PASS / Summary PASS / Mobile PASS** |

A comparação suporta fortemente que **o diferencial causal é a falha de bootstrap/autorização**, não um defeito independente nos três componentes. **Não** converte a fixture em teste de login: o GET 200 vem de `route.fulfill` e a autenticação do provedor não foi testada. Também não valida preços de uma publicação v5 verdadeira. O teste HTTP real de negação `401` continua separado.

O fixture opt-in e o workflow `.github/workflows/configuration-fixture-comparison.yml` são **diagnósticos específicos da PR #182**, não devem ser mesclados como bypass permanente. Para preservar o valor dos testes de interface, converter futuramente o mock em fixture de CI declarada para **testes de domínio**, e criar outro gate de **sessão real → v5 publicada → interface**. Ao solucionar o bug, substituir também o diagnóstico que espera fallback inseguro por teste que exige UI bloqueada a 401/403/503.

