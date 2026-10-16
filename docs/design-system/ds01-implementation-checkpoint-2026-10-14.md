# DS-01 — checkpoint de integração na branch (2026-10-14)

Branch: `work/ds01-homologated-identity-theme-20261014`. Baseline fixado em `main@d3ab7736eafb667427d28e08c0ccb31ae0265030`. Plano de dependências: [ds01-integration-plan-2026-10-14.md](./ds01-integration-plan-2026-10-14.md).

## Código/arquivos integrados

- Identidade: 4 imagens homologadas da logo (380px 2x e 1548px para splash, variantes clara/escura) com SHA Git dos binários idênticos ao original do pacote da Library. As páginas passam a apontar para `/branding/`, sem alterar geometria de cena, dados comerciais, layouts ou endpoints.
- Favicon CM: ICO multirresolução + 32px + Apple Touch 180px + Android 192px, referenciados por todas as sete shells `/`, `/about/`, `/how-it-works/`, `/viewer/`, `/config/`, `/admin.html`, `/access/manage.html`. Favicon antigo não apagado.
- Logo do viewer `C`, do configurador `▱`, e do admin `▱` substituídos pelas variantes homologadas. O heading semântico continua presente em config/admin, visualmente oculto para evitar duplicar o texto do logotipo.
- Splash: apenas troca de `img`, sem alteração em `#introSplash`, `.intro-words`, animações ou política `prefers-reduced-motion`.
- Header de `/about/`: `#primaryNav`/`#menuToggle` com `aria-controls`/`aria-expanded`, escape, clique fora e fechamento ao escolher link; sem mexer nos demais scripts de menu.
- Tema: `app/core/ui-theme.js` isolado de auth/produto. Estado Auto→Claro→Escuro, `localStorage` segura contra indisponibilidade, listener de sistema somente no modo Auto, evento storage entre abas, ajuste inicial de atributo `data-theme` antes do CSS, seleção determinística da variante da logo, observer apenas durante parsing para evitar cor inicial indevida.
- CSS `app/ui-theme.css`: controle com círculo e legenda responsiva, cores existentes, adaptações explícitas por contexto. Desenhos técnicos do viewer e cores de materiais mantidos estáveis. Sem inversão global das imagens.

## Evidências e gates

1. **PASS estático/estrutural**: todas as 7 shells têm bootstrap de tema antes de estilos, favicons, imagem declarada de ambas as variantes, sem placeholder de marca, IDs sensíveis intactos. Todas as 8 referências de `/branding/` resolvidas na árvore da branch.
2. **PASS assets**: SHA Git de cada binário novo confere com bytes homologados (testável via `node tests/ui-theme-contract.cjs`).
3. **PASS sintaxe**: `node --check` no JS de tema, `tinycss2` validou 62 regras CSS sem erros sintáticos.
4. **PASS simulação local isolada**: Chromium com HTML representativo (NÃO app real), 1366 light/dark, 390 dark e 320 light; modo inicial Auto correto, logo trocada, um controle por header, ciclo dos 3 estados e ausência de overflow no fixture.
5. **PENDENTE gate real no site**: browser full page com landing/about/how/viewer/config/admin/access, especialmente 320/390/768/1366, Zoom 200%, Safari/iPad Chrome, teclado, foco, login admin, splash reduced motion e desenho técnico/scene. Não foi efetuado deploy/preview. Nenhuma suíte de Actions disparada na branch neste ciclo.
6. **PENDENTE HOM-07/08/09/10**: pisos tipográficos, revisão fina de contrastes/marcadores e possíveis colisões após zoom devem ser tratados com inspeção renderizada e ajustes focados, não atualização indiscriminada de fontes.
7. **PENDENTE integração**: comparar visual de tema claro em todos os editores; preservar perfis do configurador e dark/light em todos os controles. Não marcar como pronto para merge até gate positivo.

## Limites de autorização

Somente branch. Não alterar produção, Netlify, dados de preço, autenticação/DTO, segredos, publicação v5, URLs comerciais ou `main`. Sem PR, merge ou deploy até aceite. Prioridade: fidelidade e regressões antes de novas funcionalidades. 