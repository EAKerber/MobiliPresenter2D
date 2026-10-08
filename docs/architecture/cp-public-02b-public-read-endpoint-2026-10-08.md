# CP-PUBLIC-02b — transporte público validado (isolado, 2026-10-08)

**Status: DRAFT / endpoint somente na branch.** Dependência lógica: CP-PUBLIC-02a (#178); a PR #179 usa `main` como base para habilitar o deploy preview do Netlify e os browser gates. Até #178 ser incorporada, o diff da #179 contém também seus commits preexistentes. Não publicar na main antes de validar o acesso e integração do viewer.

## Objetivo
`GET /api/public-modules` resolve apenas uma projeção `PublicModulePresentation2D 0.1` da **configuração v5 publicada e validada**, sem exigir que a página do viewer faça `GET /api/configuration`. O novo endpoint não altera o GET completo, PUT admin, Blob, a raiz ou a autenticação do configurador.

## Comportamento
- Netlify Function `netlify/functions/public-modules.mjs`, alias em `netlify.toml`. GET sem query; outros métodos retornam 405; query não suportada retorna 400, antes de acessar storage.
- Reutiliza a mesma política de armazenamento existente: `getStore({name:"configurator-settings",consistency:"strong"})` **somente** em `context.deploy.context === "production"`; todos os previews usam `getDeployStore`. Ausência de v5 em preview retorna 503, **não** fallback para produção, v3 default ou catálogo estático.
- `published-configuration.readRawPublished` + `inspectPublishedRaw` + validação `administration-v5.validate`; aceitar somente v5 válido; projetar com `public-module-projection.project`, que emite lista pública de módulos, benefícios, componentes, requisitos, disponibilidade inicial, finishId e allowlist de finishes.
- Não exibe pricing, revisão, ETag, rascunhos, objectAssets, materiais completos, hashes ou erros internos. Headers: no-store, nosniff, no-referrer, CSP restritiva; sem CORS liberado. Sem mutações.
- Erros/missing/incompatibilidade retornam código opaco `public_modules_unavailable` (503), evitando contaminação silenciosa da vitrine por dados presumidos.

## Gates
- Testes de integração simulada de função Netlify em `app/tools/test-public-modules-endpoint.js`, executados por `npm test`: request inválido sem abrir store, preview isolado de produção, falta de Blob, JSON inválido, v3, v5 inválido, erro de storage, ausência de writes e campos privados.
- CI completo e Netlify deploy preview. **Não** consumir produção para testes.
- Importante: deploy previews sem v5 próprio mostram 503 deliberadamente. Isso não é perda de dados; a preview não tem acesso à publicação produtiva.
- Próxima etapa: adaptar `app/viewer/` para GET assíncrono, preservar a cena pública segura, lidar com loading/error sem fallback editorial e testar publicação/seleção/acabamentos. A PR #175 ainda é independente e continua HOLD.
- Gate seguinte: a API `/api/configuration` completa ainda é pública em produção. **Não** publicar landing/viewer na raiz nem liberar configurador até o CP-PUBLIC-03 fechar esse acesso e proteger todos os aliases de `/config/`.

## Decisões congeladas
Caixaria não tem representação visual: técnica de laterais congelada por prazo indeterminado. Textos `benefits[]` são Destaques, não `description`. Estado inicial não escolhe arbitrariamente módulo 7.

## Diagnóstico CI inicial
A primeira execução GitHub Actions da PR #179, quando apontava para base `work/cp-public-02a-public-module-projection-20261008`, passou no `App build purity` (incluindo testes do endpoint), mas falhou em Stone/Mobile/Summary navegador por procurar `deploy-preview-179` inexistente. No Mobile: `CasaModulesRuntime.getLayoutProfile` undefined; no Stone: timeout aguardando runtime na página. Isso não é evidência de bug da API: os browser jobs exigem preview hospedado. Retarget de PR #179 para `main` e novo commit forçam a criação do preview; gates serão considerados completos somente se a nova execução tiver deploy associado e browser PASS.
