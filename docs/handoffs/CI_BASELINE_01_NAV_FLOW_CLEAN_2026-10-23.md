# CI-BASELINE-01 — Nav/Flow corrigidos e validados localmente (23/10/2026)

## Autoridade e escopo

- Branch de integração **não-main**: `fix/ci-baseline-v5-nav-flow-clean-20261023`, derivada de `main@15e1cfb4866886649adbcd00fef9bef5e5843fda`.
- Correção de produção mínima em `app/styles.css`: query de rótulos `flow-steps` passa da própria `.flow-nav` para seu contêiner `.controls`. O breakpoint passa de 500px da caixa interna do nav para **514px** no novo contêiner, compensando 2 × (6px padding + 1px borda). Não altera cores nem tokens.
- Compatibilidade de teste em `tests/flow-layout-browser.cjs`: **nove fixtures** anteriormente interceptavam `/api/configuration` com V3 plano; agora cada fixture é migrada, validada em V5 e projetada ao schema `BuyerConfiguratorPayload/1`, interceptando somente `/api/buyer-configuration`. Nenhuma assert funcional foi removida ou flexibilizada.
- Testes CI adicionados: servidor V5 local derivado de defaults, cinco suites completas, matriz Chromium/WebKit, comparador de imagens/geométrico contra CSS congelado da main e teste dirigido ao limiar. Sem Netlify Preview, segredos, sessão real ou escrita em banco.

## Evidência funcional

- [Local #40010783633](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40010783633): **5/5 PASS** (Mobile/PiP, Keyboard, Flow, Summary, Stone), incluindo nove cenários Flow V5 migrados.
- [Diferencial visual #40010439685](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40010439685): **56/56 equivalentes** em Chromium/WebKit, com sincronização da geometria após screenshot. O 55/56 anterior era estado transitório do próprio baseline antes da captura.
- [Gate clean de main #40011470495](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40011470495): **5/5 funcionais PASS, 28/28 cenários cross-browser PASS e 56/56 visuais PASS**, reproduzidos sem os arquivos temporários da branch diagnóstica.
- [Boundary negativo #40012194119](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40012194119): detectou **7 divergências** próximo do limiar 500px após mover o container; não foi tratado como waiver.
- [Boundary corrigido #40012591081](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40012591081): **20/20 equivalências** entre referência e CSS candidato (Chromium/WebKit, 496–522px de largura forçada no painel), com limiar compensado em 514px.
- [Verificação integral do commit final #40012591135](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40012591135): **PASS**: 5/5 suites funcionais, 28/28 cenários Chromium/WebKit e 56/56 comparações visuais/geométricas após o ajuste do limiar. Commit de implementação CSS `70e36a8e8d9f1c65534ca480cf12d2a70df74659`.

## HOLD restante — autenticação real

A prova local usa exclusivamente o V5 sintético validado por código. Não demonstra persistência/reads reais de Netlify Blobs, Edge/Functions, segurança de sessão nem `GET /api/buyer-configuration == 200` em sessão autenticada do Preview #235.

O preview #235 e a PR #235 permanecem experimento DRAFT/HOLD: o build e o readback do V5 foram evidenciados por marcadores públicos, porém o GET autenticado **pós-fix** ainda está **UNVERIFIED**.

O runner de convite de uso único está na branch `ci/ci-baseline-01-auth235-only-20261023`. As duas credenciais anteriores estão consumidas/revogadas, nunca devem ser reutilizadas. A execução autenticada exige uma **nova credencial única** no Environment `ci-auth-preview`, secret `CI_CONFIG_TEST_TOKEN`; não colocá-la em chat/commit/log. Sincronizar cuidadosamente patch e fixtures de testes no runner/preview antes do terceiro convite, para não desperdiçar uma credencial testando código antigo. A execução requer um commit marcado explicitamente `[auth-fixture-run]`; evitar executar acidentalmente.

## Política

`main` permanece estável. Não fazer merge, PR com Deploy Preview ou criar novo site por este checkpoint. ARC-03C/PR #234, P-TOKEN/PR #231 e CI fixture/PR #235 são frentes com critérios próprios; o sucesso desta correção local não libera esses merges nem publicação global.
