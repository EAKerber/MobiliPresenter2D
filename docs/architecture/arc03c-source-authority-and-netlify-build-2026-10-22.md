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
