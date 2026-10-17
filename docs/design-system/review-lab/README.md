# MobiliPresenter2D — Design System / laboratório de revisão (DS-04 + DS-05A)

**Snapshot documental. NÃO alterar `app/`, executar scripts de publicação, disparar CI/deploy, ou homologar propostas a partir deste pacote.**

## Entrada de retomada

- [`review-v0.3.html`](review-v0.3.html) — laboratório offline de revisão, derivado da revisão v0.2; inventário de 43 famílias; seis comparações de contraste; anotações A/B; exportação `M2DReview3` preservando o checkpoint EST-10.
- [`history/review-v0.2-original.html`](history/review-v0.2-original.html) — versão anterior intacta, comparação/histórico.
- [`decisions/EST-10-2026-10-11.json`](decisions/EST-10-2026-10-11.json) — autoridade **histórica** das decisões EST-01–10 do checkpoint 11/10.
- [`decisions/CMP-001R-2026-10-13.json`](decisions/CMP-001R-2026-10-13.json) — registro mais recente e mais amplo de decisões (65 detalhes); manter independente; **não substituir automaticamente** pelo JSON exportado da v0.3, que embute o snapshot EST-10 anterior.
- [`audits/DS04-static-v1.md`](audits/DS04-static-v1.md) — triagem estática inicial, **com falsos negativos comprovados**.
- [`audits/DS04-cssom-v2.md`](audits/DS04-cssom-v2.md) — detecção por pares de cor/fundo no Chromium, **apenas fixtures**, não aplicação completa.
- [`audits/DS05A-plan.md`](audits/DS05A-plan.md) — protocolo/gates para componentes reais, **ainda não executados integralmente**.
- [`tools/theme_cssom_v2.cjs`](tools/theme_cssom_v2.cjs) — runner Node/Chromium sem bibliotecas npm e sem rede, que injeta CSS local no Chromium; inclui `tools/test_cssom_v2.cjs` e fixtures **sintéticas**.
- [`evidence/`](evidence/) — screenshots do **laboratório de revisão**, não do site publicado.
- [`PROVENANCE.json`](PROVENANCE.json) — integridade e origem por arquivo.

## Status e separação de autoridade

| Item | Estado | Observação |
|---|---|---|
| Viewer dark: folhas técnicas variante A | Homologado no produto | Já integrado anteriormente, não rever aqui |
| DS-04 v1 | Histórico | Falha de detecção por herança/contraste composto |
| DS-04 v2 | Validação de método em fixtures **PASS** | Não é homologação integral do DOM real |
| Design System v0.3 | Ferramenta de revisão documental | Propostas A/B não homologadas automaticamente |
| DS-05A | **Próximo gate, não concluído** | Exige executar cenário derivado de DOM/JS real, estados e CSSOM completo |
| Contador `8 de 8` | Bug funcional pendente | `lighting-08` pertence aos serviços, mas participa do total mostrado, issue #209 |

## Execução local (sem preview)

Instalar Node 22+ e Chromium. Em **checkout íntegro** do repositório:

```sh
node docs/design-system/review-lab/tools/theme_cssom_v2.cjs . /tmp/m2d-theme-audit
```

Observação: o script encontra a raiz pelo **primeiro argumento**, não pelo próprio caminho. A saída vai exclusivamente para `/tmp/m2d-theme-audit`; o código não deve ser copiado para `app/` nem publicado.

Teste de fixture sintética: o diretório de fixture foi arquivado sob `tools/_fixture/`, portanto o teste antigo `test_cssom_v2.cjs` funciona após executar a partir de seu diretório e/ou indicar a raiz da fixture (veja `audits/DS05A-plan.md`). **Não** utilizar resultados da fixture para afirmar cobertura de produção.

## Referências

- [Issue #208](https://github.com/EAKerber/MobiliPresenter2D/issues/208): auditoria de cobertura e metodologia.
- [Issue #209](https://github.com/EAKerber/MobiliPresenter2D/issues/209): contagem semântica e contraste.
- Baseline do código lido: `main@67d31976c605c76c7ef10876d03fdeb17369ab78` (16/10/2026).
- Revisão v0.2: snapshot `38a314fb3d9830e43310e59c0166197fd19341e0` (11/10/2026).

**Não há autorização implícita para alterar a aplicação ou publicar deploy.**