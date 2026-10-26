# Diagnóstico do gate público de produção — 26/10/2026

**Evento:** merge produto #244 (NAV-005), main aa6c3140ec691a2d024052e09ca7c7b9990ac9b3. Netlify deploy de produção 6adf90fb73d5e2b21325f8c0 foi verificado como ready, commit_ref idêntico à main e publicado em 2026-10-26T17:42:40Z.

**Falha GitHub Actions:** public-production-readonly, run https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40371108015. O teste retornou: `GET /: 200` e `/config/ missing expected HTML signature`. Os demais gates de build, assets, Admin, mobile, stone, preços e roteamento concluíram verde na head.

## Causa contratual identificada

- `tests/public-production-readonly.cjs` enviava GET anônimo à rota `/config/`, seguia redirects automaticamente e esperava `class="workspace"` em HTML recebido.
- `netlify/edge-functions/access-gate.mjs` protege explicitamente `/config` e `/config/*`, chama identidade/sessão e, na ausência de usuário/cookie, devolve **HTTP 302 para `/access/`**. Assim, o teste esperava o workspace num contexto em que ele deveria estar privado.
- A análise indica **falso negativo na asserção do smoke**, não prova de regressão na interface. O conteúdo da resposta real, cadeia de redirecionamentos e observabilidade de produção não foram amostrados integralmente nesta etapa; a nova execução é o gate conclusivo.

## Correção proposta (somente teste)

- GET `/config/` com `redirect: manual`: exigir 302 anônimo para a origem e pathname `/access/`. Não aceitar exposição direta do workspace.
- GET `/access/` separado: exigir 200 e marcação pública `Confirmar acesso`.
- Preservar as verificações existentes de Landing, Viewer, Admin e DTO público; não adicionar credenciais, fixtures privadas, writes no Blob nem abrir Deploy Preview.
- Manter as regras de autorização reais inalteradas; se o middleware retornar 503, continuar **falhando** por indisponibilidade real, sem mascaramento.

**Status de segurança:** esta mudança fortalece a asserção negativa de acesso: o redirecionamento seguro passa a ser exigido, e acesso aberto à UI protegida falha. A execução de CI da PR e o smoke pós-merge precisam ser verificados antes de encerrar o diagnóstico.
