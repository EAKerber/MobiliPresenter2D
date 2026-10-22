# ARC-03C — HTML autoral único no build Netlify

Data: 2026-10-22. Estado: CANDIDATO ISOLADO, sem PR, merge, preview ou publicação.

Autoridade: arquitetura ARC-03/04/05/07/15/16 e NAV-004 no Design System.
Fonte única: três arquivos architecture/pages e fragmento/rotas de architecture/fragments.
Saídas derivadas versionadas: app/index.html, app/about/index.html, app/how-it-works/index.html.
Proveniência: architecture/generated/primary-pages.manifest.json com hashes Git de entradas e saídas.

Fluxo: editar apenas architecture/pages/fragments; executar npm run pages:sync para atualizar os derivados intencionalmente e revisar o diff; executar npm run pages:check.
npm run build (Netlify publish=app) checa igualdade estrita antes de materializar os três HTML e preserva o build esbuild de Admin/Access/navegação privada.
Alterações diretas nos HTML derivados ou no manifesto abortam o build; não há overwrite silencioso.

Gate: Node com tampering/manifesto, build real e comparação com HTML imutável da main@303468b.
Matriz: três páginas × cinco larguras (320, 390, 486, 768, 1366) × dois temas × Chromium/WebKit = 60, com DOM, CSS computado, screenshots e menu aberto/fechado por Enter.
Viewer NAV-005 não compartilha o header NAV-004. Viewer/Config/Admin/Access, auth, preço, V5, CSS e JS de menu não são alterados.

Critério: sem PR/merge/produção antes de gates verdes e revisão de integração. CI privado de /config permanece BLOCKED_AUTH_FIXTURE (#232), sem abertura indevida da rota.
Rollback: reverter o commit ARC-03C e retomar o build esbuild e HTML anterior; não há migração de dados.
ARC-16: a duplicação de autoria do header é resolvida nas três páginas; app contém artefatos gerados rastreados e não uma segunda fonte editável.
ARC-03B permanece um checkpoint verificável na branch original e no Design System.

## Incidente de CI e correção (22/10)

- Run [#39871724976](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39871724976): build, testes estáticos, drift e escopo PASS; browser não iniciou a matriz porque git show dentro do container Playwright retornou unsafe/dubious ownership (exit 128). Classificar como erro de runner, NÃO como validação visual.
- Commit [4318e81](https://github.com/EAKerber/MobiliPresenter2D/commit/4318e81571af0835d05ff133bf539c5f4f0aeba1) adicionou safe.directory explícito no container, sem alterar produto. Reexecução: [#39871907031](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39871907031); depender de conclusão final antes de declarar ARC-03C PASS.

## Gate técnico final (22/10) — PASS em branch

- [Actions #39871907031 — SUCCESS](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/39871907031) no código exato `4318e81571af0835d05ff133bf539c5f4f0aeba1`.
- Job `build-and-source` PASS: três fontes/proveniência, teste de tampering HTML e manifesto, comando real `npm run build`, verificações de escopo sem alterações em Viewer/Config/Admin/Access.
- Job `browser-baseline` PASS: **60/60 cenários Chromium/WebKit** com 320/390/486/768/1366 px, dois temas, três páginas, header/ARIA/computed CSS/menu via Enter e screenshots; `ARC03C_BROWSER_PASS {"scenarios":60,"rasterCases":0}`.
- Baseline original foi obtida do commit imutável `303468b4` e comparada contra o output gerado no diretório Netlify `app/`. Não é comparação tautológica entre dois compilados.
- **Limite:** prova técnica isolada, sem PR/Deploy Preview/merge/produção nem dispositivo físico. A issue #232 de fixture autenticada continua HOLD independente. Próxima integração requer PR única controlada e avaliação do gate global antes de merge.
