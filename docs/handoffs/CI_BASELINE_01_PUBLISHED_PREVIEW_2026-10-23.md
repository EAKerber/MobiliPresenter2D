# CI-BASELINE-01 — Publicação V5 controlada no armazenamento do Preview

**Data:** 23/10/2026. **Estado:** branch experimental; gate de build ainda
precisa executar e o endpoint real deve ser verificado. **Não fazer merge
na main** nem encerrar a issue #232 com a mera criação desta fixture.

## Problema confirmado

O Deploy Preview #234 (deploy `6adab05d4044efc65ed6660b`) autenticou
corretamente o convite temporário, mas `/api/buyer-configuration` respondeu
**503** ao ler a configuração publicada no `getDeployStore`. Por contrato,
o front-end preservou o fail-closed e ocultou a workspace. Isso explica os
timeouts iniciais dos testes, mas não prova que suas asserções restantes
tenham sido atualizadas. [Issue #232](https://github.com/EAKerber/MobiliPresenter2D/issues/232).

## Solução estritamente experimental

A branch `ci/ci-baseline-01-published-preview-fixture-20261023`, derivada
da branch de diagnóstico sem reescrever as PRs #231/#234, instala **somente
no contexto deploy-preview** o plugin local
`plugins/ci-config-preview-fixture`.

O plugin executa após o build e tem **sete pré-condições fail-closed**:
Netlify=true, CONTEXT=deploy-preview, BRANCH exatamente igual à branch
experimental, REVIEW_ID válido, DEPLOY_ID presente, SITE_ID do projeto
Netlify esperado e `constants.IS_LOCAL=false`. Outras PRs e a produção
não usam o plugin e, caso ele seja instalado acidentalmente, seu gate
não executa nenhuma gravação fora da branch autorizada.

A origem é **um dado exclusivamente de teste, não publicado pelo usuário**:
`app/data/configurator-settings.js` mais catálogo/preços/scene defaults
existentes, processados por `createDefaultAdministration`,
`normalizeConfiguratorSettings`, `administrationV5.upgrade` e
`administrationV5.validate`. A projeção ao comprador usa a **mesma**
`buyerProjection.project` e `buyerProjection.consume` da Function,
antes da escrita. Não inventa parâmetros de produto. O SHA-256 do JSON
é registrado sem registrar o conteúdo.

**Escrita determinística, sem site-wide:**
`getDeployStore({name:"configurator-settings",consistency:"strong"})`;
chave `published`. Antes da escrita `getWithMetadata` deve retornar
`null`: se houver qualquer dado, **aborta**. A única escrita é
`store.setJSON("published",v5,{onlyIfNew:true})`; retorna PASS somente
quando `modified===true`, seguida por leitura do mesmo store com o
leitor canônico `readRawPublished`, inspeção V5 e SHA idêntico. Não
usa `getStore`, `DATABASE_URL`, `ACCESS_GATE_SECRET`, sessão, role
administrativa nem fallback em runtime.

A configuração da Netlify usa
`[[context.deploy-preview.plugins]] package="./plugins/ci-config-preview-fixture"`.
O `package.json` e o build comand original continuam intactos.
[Documentação Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
confirma que Build Plugins podem gravar no store de deploy, sem atingir o
store site-wide. A verificação de integração exige um **único preview
novo** correspondente a uma PR de integração de teste, não um preview
por cada ajuste.

## Validação e reversão

- Testes puros de contrato incluem: produção/local/branch errada sem
  escrita, site Netlify diferente recusado, revisão inválida recusada,
  V5 determinístico, primeiro write com readback exato e segundo write
  barrado, exigência do store nomeado correto.
- Gate GitHub: `.github/workflows/ci-baseline-01-published-preview-fixture.yml`
  valida esses testes, o build do produto sem Netlify, a geração ARC03C,
  pins de tokens e ausência de alterações em auth/config/admin/viewer/functions.
- Gate Netlify pós-PR: observar o log
  `CI_PREVIEW_PUBLISHED_FIXTURE ... CI_DEPLOY_STORE_V5_VERIFIED`
  e o preview READY. Esta evidência de build não substitui GET real.
  `/api/buyer-configuration` exige autenticação; a leitura real será
  verificada quando uma nova sessão temporária for emitida.
- Rollback: fechar PR experimental e descartar seu deploy. Dados são
  armazenados **só no deploy** e não há mutação da main, do store
  de produção ou do banco Supabase. Código e plugin não são candidatos
  a produção como arquitetura genérica de publicação.

**Limitação:** a fixture utiliza defaults V5 de teste, não a publicação
administrativa real. Mesmo se renderizar corretamente, ainda será
necessário conferir as cinco suítes sob essa configuração e não mascarar
divergências. O primeiro convite já foi consumido/revogado: jamais
reexecutar aquele token.


## Atualização dos gates — 23/10/2026

- [CI de proveniência da fixture #39971920429 — PASS](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39971920429), no HEAD inicial `6de8229188d017fe58299181e7bd6284ea12a044`.
- [Diagnóstico de cinco suítes com V5 local #39972527537 — SUCCESS como diagnóstico](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39972527537), mas **0/5 testes funcionais PASS**: Mobile falha no assert de console em `mobile-pip-main-browser.cjs:141`; Keyboard timeout no Ctrl+ArrowRight `keyboard-browser.cjs:165`; Flow timeout ao acionar aba de módulos `flow-layout-browser.cjs:391`; Summary e Stone falham em assertions de console limpo nas linhas 146 e 251. A publicação V5 permitiu chegar a essas etapas, não corrigiu os defeitos remanescentes. Servidor local sem auth/Netlify; não pode ser confundido com deploy homologado.
- [PR #235](https://github.com/EAKerber/MobiliPresenter2D/pull/235) foi aberta DRAFT. A base foi direcionada à `main` apenas porque o Netlify exige base de produção ou branch com deploy habilitado para criar preview. **Não mergear**; a PR contém outros incrementos históricos no diff contra main que não integram este gate. O objetivo é verificar uma única publicação experimental no deploy, sem tocar no site-wide store.
- Este commit de documentação provoca a sincronização da PR após correção de base para disparar o Deploy Preview. O URL e o estado do preview devem ser verificados antes de solicitar um segundo convite.
