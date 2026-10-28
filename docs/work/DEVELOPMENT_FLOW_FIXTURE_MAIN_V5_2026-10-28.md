# Fluxo CP-PUBLIC-04a: V3 fixture histórica e autoridade V5 (28/10/2026)

## Proveniência exata, sem importar runtime

Fonte: `work/cp-public-04a-main-flow-test-fixture-20261008@9503ad1caff406d3e3422c9d4aec25bac081132e`, blob `tests/flow-layout-browser.cjs@7fe6f086f7f747861c520f51c3cafc6ef79446c2`. O arquivo original está copiado **byte a byte** em `docs/reconciliation/cpux-main-v5/legacy/fixture/tests/flow-layout-browser.cjs`, conforme o gate anterior. A ref inteira, se aposentada, será preservada pela tag `archive/m2d/legacy-cp-public-flow-v3-fixture-9503ad1c`, criada **antes da remoção**, apontando a `9503ad1caff406d3e3422c9d4aec25bac081132e`. Não afetar outras branches.

Autoridade estável: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` com `tests/flow-layout-browser.cjs@840f600bbb79534bf2ddeefc882d3ea060841042` (mesmo blob em development).

A implementação histórica 04a usava V3 `legacyFixture` e interceptava `GET /api/configuration`, inclusive o primeiro carregamento. A versão mais recente da main realmente espera a configuração publicada V5 validada no bootstrap, migra cenários de fixture para payload V5 por `administrationV5.upgrade` + `validate` + `buyerProjection.project`, e intercepta só nove rotas `/api/buyer-configuration` para cenários negativos isolados. A hipótese de que todos os testes antigos seriam descartados **é falsa**.

## Equivalência testável e seus limites

- **218 chamadas de asserção** no original, sendo 2 verificações de `schemaVersion` e `stages.items` específicas de V3. As outras **216 chamadas são idênticas, em ordem**, na suíte vigente. Esta é uma prova estática exata das chamadas, não da equivalência de toda execução.
- Os nove cenários alternativos de renomeação/reordenação/remoção de blocos passam de leitura de administrador V3 para leitura pública de payload V5; o cenário inicial agora utiliza V5 publicado real no servidor local. Teste de gate verifica presença das nove conversões, rejeição de intercepções obsoletas e armazenamento do blob histórico.
- Gate do navegador roda os **216 testes na implementação atual**, com Chromium de pacote Playwright 1.62.1, build V5 e servidor `127.0.0.1`, além da suíte `buyer-v5-browser`. Testes offline não provam sessão Netlify/DB, nem equivalência pixel a pixel de dispositivos físicos.
- **Outro ramo não coberto**: `feat/cp-ux-04-hierarchy-layout@5d8347edb6ea247307b6fc27b424117553542f78` trouxe 29 verificações de browser; 23 constam da suite atual, **seis de geometria CSS** (posição de módulos/serviços e overflow desktop/mobile) não aparecem literalmente. **HOLD** para revisão de intenção visual atual, sem aposentadoria nesta onda.

## Decisão condicional

Apenas `work/cp-public-04a-main-flow-test-fixture-20261008`, se gate de equivalência + Chromium + comprador V5 passarem, torna-se candidato a arquivo/retirada. Nenhuma PR ligada à branch; nenhum deploy, mudança de admin, banco ou `main`. Manter a política `ops/development-main-authority-policy.json` e o executor com tags+SHA lease/readback. A branch auxiliar é descartável após FF; não retirar 04 sem prova de seu contrato geométrico.

## Execução em branch de integração e gate no destino

- [Auxiliar CI #40697870659](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40697870659) **PASS**: quatro provas estáticas, contratos atuais V5/flow, `flow layout browser: PASS` com as 216 asserções e cenários V5, `buyer published v3/v5 browser: PASS`. Browser localhost Playwright 1.62.1, artifact `12820237091`. Esse é um teste funcional real em Chromium, não sessão real de Netlify.
- Commit documental/prova `2d9b7e3fb0a5820acb1eec019c5a904f568f48b5` integrado por FF SHA lease em development, [gate do destino #40698236525](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40698236525) **PASS** também estático + browser + V5, antes de qualquer retire.
- **Manifesto T one-shot proposto:** aposentar somente `work/cp-public-04a-main-flow-test-fixture-20261008@9503ad1caff406d3e3422c9d4aec25bac081132e`, com tag integral `archive/m2d/legacy-cp-public-flow-v3-fixture-9503ad1c`, e a auxiliar ancestral `integration/26-flow-v5-fixture-equivalence-20261028@2d9b7e3fb0a5820acb1eec019c5a904f568f48b5`. Arquivo original `7fe6f086f7f747861c520f51c3cafc6ef79446c2` já é copiado fiel em `docs/reconciliation/cpux-main-v5/legacy/fixture/tests/flow-layout-browser.cjs`. Não copiar mais 72 KB. **Não declarar exclusão até executor audit/apply PASS e readback.**
- `feat/cp-ux-04-hierarchy-layout` continua HOLD por seis assertions geométricas não identificadas na suite atual; compatibilidade não estabelecida apenas por esta prova.

## Onda T — encerramento auditado

- [Gate auxiliar #40697870659](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40697870659) **PASS** (static parity, 216 assertions no browser V5, V3/V5 buyer PASS); [gate de development #40698236525](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40698236525) **PASS**; [gate de manifesto #40698623876](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40698623876) **PASS**. Artifact Chromium local `12820237091`; não é sessão autenticada real.
- [Higiene T #40698623909](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40698623909) **AUDIT+APPLY PASS**, 28 testes; recibos `12820846581` (audit) e `12821410203` (apply). Tag `archive/m2d/legacy-cp-public-flow-v3-fixture-9503ad1c@9503ad1caff406d3e3422c9d4aec25bac081132e` comprovada no remoto. Removidas apenas branch original `work/cp-public-04a-main-flow-test-fixture-20261008@9503ad1caff406d3e3422c9d4aec25bac081132e` e auxiliar ancestral `integration/26-flow-v5-fixture-equivalence-20261028@2d9b7e3fb0a5820acb1eec019c5a904f568f48b5`, por SHA lease, readback: **37→35 refs**. Manifesto T **CONSUMED**.
- **Estado:** 35 branches = 33 históricas + main + development, 27/60 fontes históricas aposentadas, 17 auxiliares aposentadas, 20 ondas. 12 PRs mantidas, DS02 e main intactas, `feat/cp-ux-04-hierarchy-layout` mantida HOLD por 6 asserções geométricas ausentes literalmente. Nenhum deploy, runtime ou DB alterado.
