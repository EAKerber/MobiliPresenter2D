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
