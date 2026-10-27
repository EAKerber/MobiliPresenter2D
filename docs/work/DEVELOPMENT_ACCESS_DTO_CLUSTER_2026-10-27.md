# Bloco 02 — Reconciliação seletiva de acesso privado e DTO do comprador (27/10/2026)

## Premissas e limites

Base `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` permanece estável e não deve receber este recorte automaticamente. O ponto de partida da auxiliar foi `development@ac7366486de3dade506c54f8d8e77842c79ac77d`. Objetivo D01–D04: extrair contratos úteis do histórico 03a sem reabrir migrations, credenciais, seeds, grants ou endpoints antigos. Testes offline e CI unitária **não** comprovam sessão autenticada real ou publicação de produção.

## Oito origens históricas do inventário

| Origem e SHA do inventário | Disposição atual | Contrato que importa |
| --- | --- | --- |
| `docs/cp-public-auth-boundary-20261011@43d5fb9c5c2749c0541b99d49ee1c048d6a9a96a` — PR #196 | HOLD documental; migration de Netlify Database antiga não transplantada | Evitar criar um segundo fornecedor de sessão ou aplicar SQL obsoleto |
| `work/cp-public-03a-security-and-hygiene-inventory-20261008@67089791497b72874b7f837853133a9ccf2311aa` | Histórico documental, comparar sem importar runtime | Segregação público/privado e proveniência |
| `work/cp-public-03a1-configuration-read-guard-20261008@0b398618f7f2eff23da7f782d53d86ba3ee6411b` — PR #182 | Guard já existe em `configuration.mjs`, extraídos invariantes negativos | Raw `GET` somente Admin e **antes** do Blob |
| `work/cp-public-03a2-0-failclosed-bootstrap-20261008@d1305ffdd8302fa06b37d3676f08d802a92e7d97` — PR #184 | Bootstrap atual usa arquitetura posterior; não copiar JS/CSS antigo | 401/403/503 não autorizam fallback para dados privados/defaults |
| `work/cp-public-03a2-1-buyer-projection-20261008@7a0d919d4e27853c50cff8afde0cdcc066e0aa0c` — PR #185 | Projeção atual `BuyerConfiguratorPayload 1.0` difere da antiga `BuyerConfiguration2D 0.1`; HOLD | Projetar V5 validado; não transferir `revision`, `etag` nem snapshot raw |
| `work/cp-public-03a2-2-email-access-core-20261008@40d4b65f9e7e16e0810c2308e9b947840371cbe7` — PR #186 | Sessão vigente usa `netlify/access/`, Postgres e funções específicas; não importar core antigo | Sessão consultada no servidor; grants/revogação fora do escopo |
| `work/cp-public-03a2-3-contract-integration-20261008@68362325972a4a2db8acbdb475a1d686dd6663b4` | HOLD de integração histórica; 80 caminhos com UI/ativos/CI | Preservar a pilha V5 atual sem misturar DTO e fluxos |
| `work/cp-public-03a2-buyer-session-and-bootstrap-plan-20261008@8e2124bfd299d942dc2a24e80966b5cb034840e3` | Plano/documento histórico; não é autorização técnica | Gates independentes de autorização e browser autenticado |

**Nenhuma** das oito branches foi fundida por HEAD, apagada ou marcada como substituída em GitHub. As PRs abertas do grupo permanecem HOLD. O arquivo de inventário original conserva o mapa bruto completo.

## Lacuna concreta: autorização divergente no mesmo endpoint

Na `development` original, `GET /api/configuration` usava `canManageAdministration(user)`, exigindo ID e role admin. O `PUT` usava apenas `roles.includes("admin")`, aceitando um objeto de identidade sem `id`. Ambas as operações deixavam exceções de `getUser()` escapar como erro não padronizado, em vez do contrato explícito HTTP 503 usado pelos endpoints mais novos.

- Teste adversarial inserido em `app/tools/test-v5-endpoint-safety.js` (somente mocks): mesmo objeto `{roles:["admin"]}`, mesmo endpoint, GET = 403, mas PUT = **200**, demonstrado pelo [gate de falsificação #40565718705](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40565718705) **FAIL esperado**. O fixture permaneceu na própria Deploy Preview simulada; nenhuma mutação remota.
- Correção seletiva de `netlify/functions/configuration.mjs`: GET e PUT passam pela mesma `canManageAdministration`; exceções de Identity retornam `{error:"identity_unavailable"}`, HTTP 503, antes da seleção do Blob. Nenhum mecanismo de permissão novo e nenhum grant/migration foi modificado.
- [Gate da auxiliar #40565832552](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40565832552) **PASS** após a correção; valida GET/PUT sem ID, anônimo, staff, falha de Identity e invariantes de acesso pré-Blob.
- [Gate ampliado da auxiliar #40566089916](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40566089916) **PASS**: além da matriz administrativa, `tests/ci/access-dto-boundary.test.mjs` testa 401/403/503, falha de sessão, sessão validada pelo verificador injetado, ausência de leitura antes da autorização, storage isolado, publicação ausente/inválida e read model. `test-published-buyer-projection.js`, roles/cookies e retry de bootstrap também PASS.

A falsificação é de política estrutural: não comprova que um usuário real consiga obter do provedor uma identidade `admin` sem identificador, nem afirma incidente/vazamento em produção.

## Fronteiras preservadas e verificações futuras

1. `GET /api/configuration` continua privado para Admin. `PUT` continua uma ação exclusiva Admin; a unificação da checagem não amplia poderes. V5/Blob publicado e ETag permanecem sob seus contratos existentes.
2. `/api/buyer-configuration` continua separado: role interno legítimo ou sessão temporária validada pelo Postgres. Nenhum cookie ou campo da requisição por si só vira autorização. Falta teste de revogação real em ambiente isolado para considerar isso prova end-to-end.
3. `/api/public-modules` não foi tocado neste bloco. O contrato de fallback DTO estrito do bloco 03 permanece separado.
4. Não houve escrita de banco, seed, ativação de Netlify, preview, atualização de Design System, alteração de assets, auth roles ou publicação de produção.
5. Gates aqui são **unitários/offline**. Antes de levar este recorte a `main`, revisar contexto do deploy, executar 401/403/503 reais e provar negação de grant revogado e sessão; não promover a partir do PASS sintético apenas.
6. Após consolidação, retirar a branch auxiliar somente com gate terminal novo, lease SHA/ancestralidade, contagem integral de branches, 60 origens preservadas e ausência de PR no head auxiliar; não reutilizar A1/A2/03/04/05 consumidos.

**Próxima prioridade sugerida:** analisar `06-config-viewer` e preço publicado com schema V5, ou continuar a fronteira auth do bloco 01 em preview **somente** quando houver commit de preview verificado. Não automatizar fechamento das PRs #182/#184/#185/#186.


## Consolidação e higiene verificadas (27/10/2026)

- Auxiliar `integration/02-access-dto-authorization-20261027@14c598a159c004c9cf79ecb8ff1bd38d454cbf22` avançou por **fast-forward com lease** desde `development@ac7366486de3dade506c54f8d8e77842c79ac77d`. Diffs exatos: endpoint `configuration.mjs`, teste adversarial V5, teste negativo Buyer, workflow CI offline e este ledger.
- Gate pós-integração na `development`: [#40566373322](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40566373322) **PASS**; após retirar o trigger da auxiliar, [#40566595755](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40566595755) **PASS**.
- Higiene de uso único: [Actions #40566796709](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40566796709) **AUDIT PASS + APPLY PASS**, com 10 testes negativos, lease exato, ausência de PR na auxiliar, ancestralidade e inventário completo. Artifacts `access-dto-aux-audit-40566796709` (12763117809) e `access-dto-aux-apply-40566796709` (12763930465).
- Readback pelo conector: **63→62 refs**, `integration/02-access-dto-authorization-20261027` ausente, **60** origens históricas preservadas, `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` intacta, **12 PRs** inalteradas. O workflow `development-access-dto-aux-retire.yml` foi desativado depois de consumido; o executor Python é registro histórico **não reutilizável**.
- O único runtime alterado permanece **não publicado**, na `development`. Não existe evidência de chamadas a banco real, Netlify ou grants nesta rodada. Mais testes necessários para 401/403/503 em ambiente real antes de promoção a main.
