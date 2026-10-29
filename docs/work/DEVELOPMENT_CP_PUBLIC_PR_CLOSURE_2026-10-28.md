# Bloco 38 — protocolo de preservação e eventual encerramento de PRs públicas CP-PUBLIC (28/10/2026)

**Autoridade congelada:** `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, `development@a860887c87eaa3bdb0d7feff86c49299d978c7b7`, **26 branches remotas e 12 PRs abertas** no início do bloco. A main é a autoridade funcional; a development tem versões adicionais ainda não homologadas. Nenhuma operação desta fase altera runtime, banco, Netlify, auth, preços ou publicação. Ver [matriz analítica dos quatro PRs](./DEVELOPMENT_CP_PUBLIC_PRS_175_180_2026-10-28.md) (gate #40757355428 / #40757703942 / #40758077535 PASS).

## PRs e proveniência integral exigida

| PR | Head original fixo | Tag que deve ser apontada ao SHA original | Encaminhamento |
|---|---|---|---|
| [#175](https://github.com/EAKerber/MobiliPresenter2D/pull/175) | `work/cp-public-01-donor-staging-20261008@c81d357df3aa78c3e8f804b6334b2da35b3a75c8` | `archive/m2d/cppublic-pr175-c81d357d` | Landing/viewer antigos substituídos por rotas, assets e adapter mais recentes; 16 blobs idênticos na main, outros 26 diferentes/relocados |
| [#178](https://github.com/EAKerber/MobiliPresenter2D/pull/178) | `work/cp-public-02a-public-module-projection-20261008@f0c792397036836105dcb53a45f89780e10b6348` | `archive/m2d/cppublic-pr178-f0c79239` | Projetor v0.1 substituído pelo contratual 0.1/0.2; 7 nomes de testes mantidos e adaptados |
| [#179](https://github.com/EAKerber/MobiliPresenter2D/pull/179) | `work/cp-public-02b-public-read-endpoint-20261008@44b1d6a94c06a17b73405755e03c787780e7a455` | `archive/m2d/cppublic-pr179-44b1d6a9` | Endpoint GET-only substituído por versão atual com 0.1/0.2 e controles de dados; HEAD é ancestral de #180 |
| [#180](https://github.com/EAKerber/MobiliPresenter2D/pull/180) | `work/cp-public-02c-integrated-preview-20261008@82d85674595280a7c878848d0d5f09df29492e92` | `archive/m2d/cppublic-pr180-82d85674` | Integração antiga substituída; **não reutilizar plugin post-build/seed exclusivo do preview #180** |

As quatro PRs permanecem **OPEN/DRAFT** até uma fase futura e todas as tags devem preservar a DAG **inteira**, não apenas arquivos selecionados. A PR #179 é ancestral da #180; as PRs #178 e #175 divergem das demais. Tag direta em cada SHA garante recuperar o histórico independente da manutenção da branch.

## Contrato fail-closed de tags em ondas de até três alvos

Manifesto `ops/development-pr-archive-manifest.json`: todos os 12 números/nomes/HEADs abertos pinados; 4 tags candidatas; lote ativo `dev-20261028-public-pr-archive-ag` tem apenas **#175 e #178 (2 tags)**. O primeiro gate é AUDIT read-only na auxiliar; após FF SHA-exato, o gate na `development` pode criar somente essas **duas tags**, com readback remoto e recibos. A segunda onda AH, autorizável somente após readback e atualização do manifesto, pode taggear **#179 e #180**, também no máximo dois alvos. Reexecutar uma onda consumida não faz writes se as tags já forem idênticas; nunca substituir tags existentes.

Validações obrigatórias antes da primeira tag: 12 PRs realmente OPEN e nenhum HEAD alterado; `main` no SHA fixo; branch da fonte remota com SHA exato, sem proteção; nenhuma regra de proteção/ruleset nova; full roster remoto do inventário original de 60 menos aposentadas e auxiliares registradas; nenhuma tag incompatível; `HEAD` deve ser um push exato no controle. O job APPLY usa `contents:write` apenas para `refs/tags/archive/m2d/cppublic-pr*`. O AUDIT não escreve; APPLY não fecha PR, não apaga branch, não edita main.

**Após as quatro tags estarem presentes**, não basta alterar a constante `PR_NUMBERS` de 12 para 8. Será necessário um **gate de transição do roster** que permita exclusivamente as quatro PRs pinadas em estado `OPEN` ou `CLOSED/UNMERGED`, verifique cada HEAD imutável e tag exata, mantenha as outras oito OPEN e nunca permita remoção de uma head de PR ainda aberta. A suíte histórica de 12 heads e a matriz dos quatro PRs também deverão aceitar HEAD original alcançável pela tag quando a branch for aposentada. Qualquer fechamento por automação deve conferir o estado de todas as PRs entre cada operação, escrever comentário com link de substituição, fechar em ondas de até dois, *readback* CLOSED/unmerged e preservar branches até a higiene baseada no inventário atualizado. **NÃO fechar nesta fase de criação das tags.**

**Razão de não importar código das branches:** a `main` e `development` têm projeções, rotas e viewers mais novos, incluindo `PublicModulePresentation2D 0.2`; resta trabalho separado de autorização (#182/#184/#185/#186/#238), que continua HOLD e **não** integra as quatro tags públicas. A incorporação não é literal: fechar como `closed/unmerged` por substituição funcional, jamais `merged`.

## Risco residual e gates

Gate offline de public-domain já passou em #40757355428 e #40757703942. Não foi executado browser real no deploy contemporâneo, por isso não declarar paridade visual/segurança de produção. Só fechar PRs quando houver tags remotas, contratos preservados, novo gate explícito de roster e handover atualizado. A criação das tags é operação de **preservação**, não uma exclusão irreversível. Não acionar build/deploy Netlify nem migrar banco.

## Gate da auxiliar e autorização limitada ao FF

[Primeiro AUDIT do mecanismo de tags #40763356696](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40763356696) **PASS** na auxiliar, sem qualquer mutação: validou 12 PRs abertas e seus SHAs, main, 60 refs originais menos 36 aposentadas, 24 heads históricas restantes, tag names e regras. APPLY não foi executado porque o job exige push na `development`. O trigger da auxiliar foi removido antes do fast-forward para que o futuro executor de higiene não considere a branch temporária uma dependência permanente. Em `development`, a fase AG é exclusivamente preservação de `#175` e `#178`, com `--mode audit` antes de `--mode apply`; nenhum fechamento de PR autorizado nesta fase.

## Resultado de AG/AH e contrato de transição AI

- **Onda AG** [#40763518326](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40763518326) AUDIT+APPLY PASS: tags `archive/m2d/cppublic-pr175-c81d357d@c81d357df3aa78c3e8f804b6334b2da35b3a75c8` e `archive/m2d/cppublic-pr178-f0c79239@f0c792397036836105dcb53a45f89780e10b6348`. Recibos audit `12848449501`, apply `12849167066`; **nenhuma PR fechada ou branch removida**.
- **Onda AH** [#40763684082](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40763684082) AUDIT+APPLY PASS: tags `archive/m2d/cppublic-pr179-44b1d6a9@44b1d6a94c06a17b73405755e03c787780e7a455` e `archive/m2d/cppublic-pr180-82d85674@82d85674595280a7c878848d0d5f09df29492e92`. Recibos audit `12850230165`, apply `12849131700`; **12 PRs ainda OPEN**, nenhuma branch removida. O workflow de tags agora dispara somente por mudança explícita de seu manifesto, não por edição documental. Os dois lotes de tags são **CONSUMED**, não alterar sua semântica nem apagar tags.
- **Governo AI de encerramento**: `ops/development-pr-closure-transition.json` autoriza *somente* PRs #175/#178 a permanecerem `OPEN` ou transitar para `CLOSED/UNMERGED` mantendo HEAD literal e tag exata. PRs #179/#180 ficam OPEN até uma segunda onda AJ com novo manifesto; as outras oito PRs incluindo auth #182/#184/#185/#186/#238 ficam OPEN. A função `tools/development_retirement_batch.py:verify_open_pr_roster` não troca ingenuamente 12 por 10: **verifica as 4 tags, as 12 identidades, as oito heads protegidas e cada fechamento autorizado consultando PR fechada por API e exigindo SHA, base main, estado CLOSED e ausência de merge**. Aceita os estados intermediários 12→11→10 somente para #175/#178. Continua rejeitando qualquer drift de ref, ruleset, batch ou target ainda com PR aberta.
- [Gate auxiliar de roster inicial #40764182486](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40764182486) negou um fixture negativo cuja expectativa de nome de erro estava errada; corrigido fixture mantendo a reprovação de autorização prematura. [Gate corrigido #40764261034](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40764261034) **PASS**: 39 testes offline de higiene/roster, incluindo transições aprovadas e rejeição de #179/#182, merge indevido, branch/tag/HEAD alterados, base errada e listas adulteradas; probe read-only confirmou 12 PRs reais com 4 tags SHA-exatas. O workflow de probe fica somente na development após FF.
- **Operação da onda AI**: após o novo gate PASS na development, comentar individualmente motivo, SHA/tag/link do relatório em #175 e #178; validar novamente PR SHA/estado; fechar como `closed/unmerged`, sem merge, rebase ou deleção de branch. Fazer readback após cada closure e repetir probe; se algum contrato falhar, NÃO fechar a outra PR. Deixar #179/#180 e auth intactas. **Não apagar branches ainda**: a poda depende de novo manifesto do executor limitado a 1–3 refs e sem PR aberta, e da atualização das suítes de proveniência para aceitarem tag em vez de branch. 

## Onda AI — encerradas #175 e #178, readback confirmado

Após os gates [#40764261034](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40764261034) (auxiliar, **PASS**) e [#40764452805](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40764452805) (development, **PASS**), também passou o gate geral [#40764452836](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40764452836) (**PASS**). O [protocolo AI](../../ops/development-pr-closure-transition.json) autoriza exclusivamente as PRs #175 e #178 a transitar para CLOSED/UNMERGED; #179/#180 seguem FROZEN OPEN.

- [PR #175](https://github.com/EAKerber/MobiliPresenter2D/pull/175) — comentário explicando substituição e tag arquivada, ID `6480067499`; **CLOSED 2026-10-28 20:35:11Z**, `merged=false`, `merged_at=null`, `head.sha=c81d357df3aa78c3e8f804b6334b2da35b3a75c8`. Tag `archive/m2d/cppublic-pr175-c81d357d` apontando SHA literal, e branch original presente no readback.
- [PR #178](https://github.com/EAKerber/MobiliPresenter2D/pull/178) — comentário de substituição, ID `6480077778`; **CLOSED 2026-10-28 20:35:39Z**, `merged=false`, `merged_at=null`, `head.sha=f0c792397036836105dcb53a45f89780e10b6348`. Tag `archive/m2d/cppublic-pr178-f0c79239` apontando SHA literal, e branch original presente no readback.
- **Readback conjunto:** **10 PRs OPEN** exatamente `[34,179,180,182,184,185,186,196,231,238]`; 12 originais historicamente pinadas, 2 CLOSED/UNMERGED, nenhuma merged, 4 TAGs públicas intactas. A `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` não mudou.
- Nenhuma branch histórica foi removida no ato de fechar a PR. Não editar branch head nem rebase, nem apagar tags. Antes de qualquer deleção de branch #175/#178, adaptar `tests/test_development_cp_public_lineage.py` e `tests/test_development_cp_public_prs_175_180.py` para aceitarem o SHA pela **tag imutável**, nunca ausência de prova. Depois usar o executor de higiene com registro `archive-diverged`, snapshot e gate sem ultrapassar três targets.
- **Onda AI CONSUMED para os fechamentos**. #179 e #180 ainda **OPEN** até onda AJ com atualização declarada de `allowedClosedOrOpen` para quatro e `remainingCandidatesFrozenOpen=[]`, read-only gate e comentários de substituição individuais. Nenhuma mudança de runtime, preços, DB, sessão, auth ou Netlify ocorreu no fechamento.

**Estado provisório de refs após os fechamentos:** 28 heads remotas = 24 originais históricas + main + development + auxiliares de governança 38 e 39. As duas auxiliares devem ser aposentadas só após FF e prova do novo roster pelo executor (máximo 2 por lote) — sem eliminar ainda as heads originais de PR.

## Onda AK — auxiliares 38/39 retiradas sob contrato de 10 PRs

O lote `dev-20261028-cppublic-pr-closure-aux-ak` do executor limitado a 1–3 refs ([AUDIT+APPLY #40764913868](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40764913868)) **PASS** após a [prova do roster CLOSED/UNMERGED #40764823295](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40764823295) PASS. O lote removeu exclusivamente dois auxiliares já ancestrais de development:

- `integration/38-cppublic-pr-archive-20261028@ec76bccd2a3a809d0e154dfd439b733bff6003b2`, scripts/manifestos das tags AG/AH;
- `integration/39-cppublic-pr-roster-20261028@7090d265ca8e41532dd64a7d9785243b5fa98acc`, suíte negativa e autorização por PR.

Recibos: audit `12849692682`, apply `12850146825`. Readback de refs **28→26**; 24 branches originais remanescentes, main e development; 36/60 originais aposentadas, **30 auxiliares**, **33 ondas**. **Onda AK CONSUMED — NÃO REAPLICAR.** As duas heads originais de PR #175/#178 (agora CLOSED/UNMERGED) **continuam presentes** e preservadas por tags. As PRs #179/#180 continuam OPEN, e as 8 demais PRs protegidas permanecem OPEN. Handover e `ops/development-retirement-history.json` atualizados.

**Próxima mudança antes de retirar heads de PR fechadas:** as suítes `tests/test_development_cp_public_lineage.py` e `tests/test_development_cp_public_prs_175_180.py` ainda verificam a existência literal das 12 branches originais. Torná-las provas de **branch OU tag exata** apenas para as quatro PRs públicas, mantendo as outras oito heads no roster. Executar gate no destino primeiro; só então preparar próximo manifesto com #175/#178 `archive-diverged`, duas targets e tag SHA-exata existente. Nenhum DELETE ou merge dessas heads foi autorizado nesta onda.


## Bloco 40 — retenção das heads encerradas #175/#178 (28/10/2026)

Base de desenvolvimento: `c864fe97761f2da72dcf455d5e6e0e7f1f2a261b`.
REST confirmado antes da edição: #175 CLOSED/UNMERGED em 2026-10-28T20:35:11Z,
#178 CLOSED/UNMERGED em 2026-10-28T20:35:39Z, ambas com base `main` e HEAD original.
O roster vivo tem 10 PRs abertas. A transição AI continua limitada a [175,178];
#179/#180 e as outras oito PRs continuam obrigatoriamente abertas.

Proveniência exata, preservada antes da remoção de qualquer branch:

- `work/cp-public-01-donor-staging-20261008@c81d357df3aa78c3e8f804b6334b2da35b3a75c8` → `archive/m2d/cppublic-pr175-c81d357d`.
- `work/cp-public-02a-public-module-projection-20261008@f0c792397036836105dcb53a45f89780e10b6348` → `archive/m2d/cppublic-pr178-f0c79239`.

As duas suítes históricas passam a validar a mesma identidade completa por branch
ou, exclusivamente para as duas PRs comprovadamente encerradas, tag exata. Uma
branch presente com SHA diferente continua sendo erro mesmo que a tag esteja
correta. Uma PR aberta não pode usar a tag para mascarar a ausência de sua head.
O probe remoto calcula o conjunto encerrado pelo roster REST já validado; o
recibo histórico offline não concede autoridade para uma mutação remota.

A regressão executa as 15 verificações de DAG, blobs, rotas e contratos históricos
em um espelho Git descartável sem as duas refs remotas encerradas. O checkout
original e origin não são alterados pela simulação. Testes negativos cobrem tag
faltante/trocada, branch divergente, perda de head aberta, mudança de pin e PR de
segurança fora do conjunto público. O gate inclui os contratos atuais do projetor,
endpoint em memória e viewer. Nenhum código de aplicação, seed de preview, auth,
banco, Netlify ou main faz parte do diff. Resultados e recibo da futura onda serão
registrados somente após confirmação. A aposentadoria requer gate auxiliar e
destino PASS, manifesto fresco, lease por SHA e readback completo.


### Gates anteriores ao lote AL

- Auxiliar `7f328398d18971cd42656ef68b29ad9c93d4c9a2`: [#40783691653](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40783691653) **PASS**.
- Destino `development@e9bbe7674dcc6f4f56e04c62f81849face1fe38c`: roster/retenção [#40783778743](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40783778743), segurança [#40783778809](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40783778809), linhagem [#40783778718](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40783778718) e contratos públicos [#40783778788](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40783778788), **todos PASS**.
- Gate combinado: **61 testes Python**, incluindo espelho sem as duas refs (15 verificações internas adicionais), **7 testes de projetor + 17 de viewer**, contrato de endpoint em memória e probe remoto do roster de dez PRs.
- Manifesto `dev-20261028-cppublic-closed-heads-al`: duas targets históricas `archive-diverged` acima + auxiliar ancestral `integration/40-cppublic-closed-heads-20261028@e9bbe7674dcc6f4f56e04c62f81849face1fe38c`. Limite total três refs, 36 aposentadorias históricas anteriores, gate de origem por SHA/run. O lote só pode operar no push exato da development e recusa qualquer mudança de refs, tags, PRs, proteção ou regras. O status de aplicação será registrado pelo recibo após readback, não presumido por este manifesto.


### Onda AL concluída — readback final

[Actions #40783892131](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40783892131),
push `a387f723327a96d22399dd6245e74339a967fb21`: **AUDIT PASS, APPLY PASS, READBACK PASS**.
Recibos audit `12858466552` e apply `12858163120`. Foram removidas exatamente as
heads das PRs #175/#178 e a auxiliar 40; as tags acima já existiam e foram
novamente conferidas nos SHAs originais. Ambas as PRs permanecem CLOSED/UNMERGED.
O lote AL está **CONSUMED — NÃO REAPLICAR**.

Readback REST/Git: **27→24 refs** contando a auxiliar temporária (**26→24** em
relação ao início da rodada); **38/60 originais históricas aposentadas**, **31
auxiliares**, **34 ondas**. Dez PRs seguem abertas, com mesmas bases e heads:
`[34,179,180,182,184,185,186,196,231,238]`. `main` continua
`221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; DS02 e auth protegidos. Nenhuma mudança
em aplicação, produção, banco, sessão ou deploy foi feita nesta rodada.

Próximo recorte AJ: manifestar a passagem de `allowedClosedOrOpen=[175,178]` para
`[175,178,179,180]`, `remainingCandidatesFrozenOpen=[]`, adaptar os testes para
ambas as fases e validar antes de encerrar individualmente #179/#180 sem merge.
O recibo offline `PR_CONFIRMED_CLOSED_UNMERGED` só deve mudar após os readbacks
reais de fechamento; ele não substitui o roster ao vivo. Não retirar as heads
#179/#180 antes de novos gates e manifesto próprio. As PRs #182/#184/#185/#186/#238
seguem HOLD. O seed de preview da #180 continua intencionalmente ausente.


## Preparação AJ — protocolo do roster atualizado, sem fechamento executado

- O manifesto de transição agora identifica `dev-20261028-cppublic-pr-close-aj`,
  permite somente as quatro PRs públicas `[175,178,179,180]` em OPEN ou
  CLOSED/UNMERGED, e congela zero candidatas públicas restantes. Isso é uma
  permissão de estado para o gate, não prova de que qualquer PR foi fechada.
- Os checks de escopo funcional usam como baseline `development@7ec2448`,
  imediatamente anterior à onda AJ; os pinos `DEV` antigos nas provas de
  linhagem continuam como evidência histórica imutável.
- As PRs #179 e #180 permanecem abertas até cada comentário de substituição,
  readback individual do HEAD/base/estado e gate vivo aprovado. A fase continua
  recusando qualquer fechamento de #182/#184/#185/#186/#238, merge, mudança de
  base ou drift dos quatro SHAs/tag de arquivo.
- A suíte de transição cobre os estados herdados #175/#178, #179 fechado
  individualmente, #180 fechado individualmente e os quatro CLOSED/UNMERGED;
  cada fixture exige o HEAD original e usa a lista de tags pinadas. A normalização
  do caminho do manifesto usa separadores POSIX para manter a comparação igual
  no Windows e no runner Linux.
- Antes dos fechamentos, executar os gates locais e o workflow de roster na
  development. Depois, fechar #179 e #180 separadamente, com revalidação entre
  elas; só após ambos os readbacks o recibo `PR_CONFIRMED_CLOSED_UNMERGED` pode
  avançar para `{175,178,179,180}`. A aposentadoria das branches fica para um
  manifesto separado com lease e readback.

### Readback posterior da onda AJ

- Preparação promovida pelo commit `886ba49cfc19cf095cbf1fe4576cde560fdc0ed6` como fast-forward com lease de `development@7ec2448418781405e0eb20ee85708166f5472ef1`. A auxiliar `integration/42-cppublic-pr-roster-aj-20261029` aponta ao mesmo SHA; a auxiliar UX04 41 segue em `7ec2448`.
- Gates no HEAD promovido: [roster AJ #40804568063](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40804568063), [segurança #40804568078](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40804568078) e [linhagem #40804568116](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40804568116), todos PASS. A prova de roster consultou as dez PRs abertas e as quatro tags exatas; as suítes Python/Node passaram.
- Readback GitHub após a promoção: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`; 26 branches = 22 originais remanescentes + main + development + auxiliares 41/42; dez PRs abertas. #179 e #180 continuam OPEN nos SHAs originais, e as tags continuam apontando aos commits originais. Nenhuma PR foi comentada ou fechada neste checkpoint.
- Próximo passo permanece fechamento individual CLOSED/UNMERGED após os comentários de substituição autorizados. Não remover heads #179/#180 nem auxiliares 41/42 antes de um manifesto de higiene separado, gate de ancestralidade/tag, lease e readback.


### Regressão após remoção efetiva

O scanner final [#40784278666](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40784278666) passou com as 22 históricas remanescentes. O gate combinado [#40784278661](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40784278661) detectou um erro apenas no setup da simulação: `git update-ref -d <ref> <SHA>` foi chamado no espelho para uma ref já ausente no checkout fresco. As 15 verificações históricas diretas passaram; o probe remoto foi corretamente pulado após a falha do setup. O executor AL e seu readback não foram reexecutados.

O teste agora remove a ref no espelho somente quando ela existe, mantendo lease por SHA; em ambos os estados exige ausência efetiva antes de rodar as 15 verificações históricas completas. A cópia local com refs obsoletas removidas passou novamente nos 61 testes Python. Não relaxa tags, PRs, proveniência, asserts históricos ou o executor remoto. A confirmação de CI após este reparo fica no checkpoint final do handover.
