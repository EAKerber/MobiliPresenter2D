# Recibo de extração por proximidade — Migration Inspector V0 (27/10/2026)

**Origem:** `tooling/migration-inspector-v0-20261023`, branch de ferramenta histórica; registro de origem na matriz de 60 branches.

| Destino novo em `development` | Blob SHA exato de origem |
|---|---|
| `tools/migration-inspector.mjs` | `0d862e435898daa8443ada12f7d093c5ab6232bc` |
| `tests/migration-inspector.test.mjs` | `abe491f840c82b12e93c578442a9c548f47f8a5a` |

**Tipo:** ferramenta só de leitura, transição inicial para consolidar páginas, headers e CSS. O scanner identifica HTML/stylesheet/script carregados diretamente, candidatos lexicais e referências a bundles previstos pelo build. Não infere impacto negativo; não inspeciona imports, estado dinâmico, segredos, tokens, homologação de DS ou autenticação. Não se conecta a Netlify nem reescreve a aplicação.

**Gate:** workflow `.github/workflows/development-migration-inspector.yml` somente para push da auxiliar selecionada e `development`, com Node 22, testes nativos e duas execuções determinísticas. Se o teste falhar, o merge para development está bloqueado. Evitar PR e Netlify Deploy Preview até confirmar a política de publicação.

**Não é autorização de poda** da branch de origem: o HEAD pode conter docs/workflow extras; classificá-los e preservar proveniência antes de qualquer remoção.

**D01:** incorporar por evidência, não mesclar todo HEAD histórico; **D02:** teste isolado suficiente para piloto só de leitura, não constitui prova de publicação nem segurança.
