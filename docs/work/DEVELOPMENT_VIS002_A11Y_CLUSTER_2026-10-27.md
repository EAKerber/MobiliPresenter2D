# Bloco 04 — VIS-002 / contraste / acessibilidade: reconciliação seletiva

Checkpoint: 27/10/2026. Referências iniciais: produto `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95`, `development@c5fb9c947972de6e4c004b75d2d9b8126e84ca77`; Design System `main@79db735d6f05177b0c406e383d35832f3d72fdef` com `decisions.json` blob `63b60f8d87327c6fd1e80c8cdf4ff832c4089bfa`. A fonte de decisão canônica é o Design System; cópias/protótipos no produto não alteram homologação.

## Governança

VIS-002 autoriza a paleta-base A e **pares contextuais** de informação, erro, sucesso e aviso. Aprovação não é concessão de tokens globais, não decide superfícies transparentes, ícones, hover, disabled, outras rotas ou implementação ampla. Exemplos homologados: texto informativo claro `#245D87` sobre `#F0EDE8` (6,01:1), escuro `#A7D1F0` sobre `#211F1C` (10,19:1); erros 6,17/7,41; sucesso 5,76/7,63; alerta 5,79/8,56. Usos e estados futuros dependem de mapeamento específico e revisão de DOM.

O produto já possui um recorte publicado em código: `design-system/pins/vis-002/context-v0.3.0/PIN.json`, que se declara `SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED`; mapping e artifact blobs exatos `e8f42f76e2732cbcf3e9a68d1dc8f82ea79dd73d` / `9e7f243039a717d02f897d7320a4c383856f8fa0`. **Não promover esta candidatura a RELEASED só porque os arquivos existem**. Ela já aplica `#292723` a dez seletores **explicitamente light** em `/`, `/about/`, `/how-it-works/`, preservando dark e o token global legado. O arquivo foi autorizado em recorte anterior; este trabalho não altera suas cores.

## Disposição das dez branches históricas

| Branch @ SHA de inventário | Conclusão inicial | Próximo gate |
|---|---|---|
| `a11y/image-failure-scalable-placeholder-20261025@6840d8986e44` | Cobre fallback de imagem e HTML gerado, área paralela já tratada por R8 | HOLD; provar blobs/frames faltantes, não transplantar HTML |
| `architecture/p-token-01b-reference-pin-20261022@854cc0589652` | Proposta antiga de pin v0.1.0 | SUPERSEDED por pin v0.3.0; preservar evidência sem reativar |
| `architecture/p-token-02b-contextual-copy-20261022@afb809653360` | PR **#231 OPEN**, CSS/pin v0.1 | PR HOLD; não fundir sobre v0.3 por equivalência lexical |
| `audit/public-text-contrast-coverage-20261022@ace851004713` | Auditoria de texto legada e candidatos de contraste | EXTRAÇÃO CONCEITUAL: medir estilos computados, não copiar cores antigas |
| `docs/ds05a-theme-lab-20261017@6120a294e0de` | Laboratório antigo com fixtures e imagens | HISTORICAL_EVIDENCE; sem papel runtime |
| `fix/focus-ring-about-approved-vis002-20261024@e7b02c04308e` | Marcada ancestral no inventário; sem caminhos exclusivos | ANCESTOR; manter foco acessível sob novos testes |
| `fix/vis002c-public-text-contrast-20261022@007fc8e0ca8d` | Alteração de cor v0.1/v0.2 em folhas CSS | SUPERSEDED; comparar apenas contratos, não reintroduzir overrides |
| `integration/consolidated-arc03c-vis002c-token-20261023@c239012c126c` | Integração anterior de ARC-03C+CSS e tokens v0.2 | SOURCE_RECONCILIATION; ARC-03C e v0.3 já atuais, não fazer merge bruto |
| `integration/vis002c-contextual-support-v02-20261024@a285a2dc6f54` | v0.2 abrangente | HISTORICAL_V0_2; manter versões distintas |
| `integration/vis002c-p-token-02b-v2-20261023@34a305c1ddb9` | Versão experimental de v0.2 | HISTORICAL_V0_2; manter versões distintas |

Nenhuma destas origens divergentes está autorizada para exclusão. Os HEADs anteriores preservam DAG que não pode ser tratado como mesclado por semelhança de conteúdo.

## Prova proposta sem implementação

Auxiliar `integration/04-vis002-context-audit-20261027`, derivada da `development` verificada. Acrescentar somente:

- `tests/ci/vis002-context-pin.test.mjs`: (a) conferir os hashes Git *blob* do PIN mapeamento/artifact/manifest, a correspondência da autoridade DS, o escopo 10 seletores light-only e ausência de novas variáveis globais; (b) recalcular os contrastes VIS-002C e oito pares semânticos aprovados, sem arredondar critérios.
- `tests/ci/vis002-context-browser.mjs`: conferir os dez seletores em DOM real em Chromium e WebKit, temas claro/escuro e larguras 390/1366, em **24 combinações**, verificando presença de texto visível, cor de contexto light e *ausência de vazamento do token light no dark*. Não alega conformidade WCAG de todas as páginas nem aprovação visual humana.
- `.github/workflows/development-vis002-context-audit.yml`: `node --test` + `npm run pages:check` + browsers em localhost, sem deploy, sem acesso a banco/segredos.

Gates: aprovado somente com execução **PASS no HEAD exato da auxiliar** e repetição na `development`; sem alterar runtime ou folhas CSS. Posterior limpeza da auxiliar só com SHA lease/ancestralidade e readback, mantendo as sessenta refs históricas.

## Pontos cegos preservados

O fato de `#292723` contrastar adequadamente com fundos de referência sólidos **não valida fundo fotográfico/gradiente/translúcido**, texto de outros componentes, acessibilidade do fluxo privado nem aparência percebida. O foco VIS-002 aprovado indica contorno externo, mas aplicação por rota/estado ainda demanda inspeção. Candidato `v0.3` não significa que `v0.1`/`v0.2` deixam de ser provas históricas; versões supersedidas não devem ser reativadas. O PR #231 deve ser reconciliado por conteúdo antes de decisão de fechamento (D03=A).



## Gates completos e referências finais

- Primeira execução [#40555807771](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40555807771): 3/3 testes de pin PASS; browser FAIL devido a leitura anterior à visibilidade da Landing. Corrigido no teste, não no CSS.
- Validações do candidato: [#40556199504](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40556199504) **PASS**, 3/3 testes + 24/24 cenários. Testes 56 nós de texto light e 56 verificações de token ausente no dark.
- Validação do fast-forward: [#40556552629](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40556552629) **PASS** na `development`; revalidação [#40557142068](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40557142068) **PASS**.
- Ref auxiliar removida por gate de uso único [#40557142349](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40557142349) **PASS/readback**: exatamente 62 refs após exclusão. Artifact `vis002-aux-apply-40557142349`, ID `12757956981`. 60 branches históricas e 12 PRs preservadas.
- A ferramenta de exclusão é de uso único, consumida e desativada. O próximo bloco deve partir da `development` corrente e aplicar somente extrações com proveniência. Nenhuma alteração de runtime, globais VIS-002, DS main ou release Netlify nesta rodada.
