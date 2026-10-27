# Bloco CI/Autenticação — extração offline do gate de identidade da PR #238

## Proveniência e decisão

- Origem principal: `tests/ci/config-authenticated-v5-suites.mjs` do HEAD `ci/ci-baseline-01-isolated-auth-extraction-20261024@3ccce161235df925c5b708bf6feefbe6f4b10103`, blob `15208a016ade532463cf4f3fb3ca87857fb3cc96`, especialmente asserções de linhas 62–72.
- Extraído seletivamente como teste puro em `tests/ci/preview-identity-attestation.mjs` e `tests/ci/preview-identity-attestation.test.mjs` para validação de identidade do marker. Não é cherry-pick integral. O código foi generalizado para identificadores **sintéticos**, sem valores de projeto, segredos, host ativo, concessão de acesso, banco ou APIs externas.
- O repositório dispõe separadamente da gate real da PR #238. O módulo daqui **não é conectado ao processo de concessão de acesso** e não pode, sozinho, aprovar deploy nem autenticação. Um futuro uso na PR #238 exige revisão do contrato real e comprovada compatibilidade antes de substituir qualquer gate.
- Valida commit SHA exato, PR, branch, `verified`, schema marker, V5, digest e erros fail-closed sem ecoar valores enviados. Workflow da auxiliar e de `development` executa **só `node --test` local**, sem npm install, network, Netlify ou permissões elevadas.
- Causa observada na PR #238: Actions #40257905366 rejeitou preview cujo marker pertence ao commit `41dcc1424bdeea5782d977d2b0509c88f76fe156`, enquanto a PR atual tem `3ccce161235df925c5b708bf6feefbe6f4b10103`. Netlify confirmou `deploy-preview-238` READY no commit antigo; o preflight **agiu corretamente**. Sem autorização para aceitar marcadores de outro SHA, nem para alterar configurações públicas de deploy.

## Critério de integração

D01=A incremental; D02=B gate isolado pode validar primeiro. Suíte local precisa passar, SHA do commit auxiliar fixo, `main` intacta, `development` avançada por fast-forward e readback. PR #238 e sua branch permanecem abertas/intactas; nenhum preview/deploy ou limpeza de ref nesta fase.

**Limite:** não substitui testes reais de negação de Admin, grants, sessão, bootstrap, revogação ou as cinco suítes browser em um deploy correspondente ao HEAD correto.
