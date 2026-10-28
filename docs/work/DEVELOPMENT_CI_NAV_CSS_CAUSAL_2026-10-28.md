# Diagnóstico causal da navegação CI — main versus branch de 23/10

**Estado:** diagnóstico apenas, `fix/ci-baseline-v5-nav-flow-clean-20261023@62c5521d7e883443696ce1c58c912ac4794ff75e` ainda HOLD, sem merge ou delete. `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` é a autoridade estável. A `development` herda o mesmo blob CSS `d43e6fb5e66133d2389b5c39b165b76b13cfa868`; a branch histórica usa `eb55a9b5cb92d2e76ae70e0e41ac9fdf8b366616`, agora salvo literalmente em `docs/reconciliation/ci-v5-nav-clean/source/app/styles.css`.

A comparação constatou **uma mudança de proprietário da container query**, não apenas um ajuste cosmético. A regra `@container flow-steps (max-width: 500px)` já existia em ambos os estilos, mas no protótipo antigo o container era `.controls`; na main atual é `.flow-nav`. Por isso comparar apenas widths globais ou perfis side-rail/stacked/compact não responde se os rótulos mudaram de limiar quando `.controls` e `.flow-nav` têm larguras diferentes.

Gate criado para:
- executar `main` e CSS histórico, isoladamente, sobre o mesmo V5 publicado no servidor localhost;
- comparar 496/500/502/505/509/512/514/515/518/522 px de largura de `.controls`, em Chromium e WebKit, capturando os **20 pares** de estados, dimensão do container, modo de rótulo e SHA de screenshot da nav;
- exigir que no CSS atual a regra de 500 px siga `.flow-nav` e que a navegação não transborde; coletar, sem reprovar automaticamente, diferenças de raster e compactação entre o protótipo e a main;
- preservar o valor diagnóstico histórico, sem alegar equivalência pixel como condição necessária de aceitação da implementação mais recente.

A branch original continua HOLD até interpretação do resultado empírico; não aplicar o antigo CSS à main ou development, não abrir Netlify Preview nem executar banco/Identity. Isto é medição do V5 local, não prova de sessão externa.
